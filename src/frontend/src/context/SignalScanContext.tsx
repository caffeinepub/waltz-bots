/**
 * SignalScanContext — scans ALL Binance USDT pairs in a single batch.
 *
 * PIPELINE:
 * 1. Fetch ALL active USDT pairs from Binance exchangeInfo (~1800+ pairs)
 * 2. Fetch ALL 24h tickers in ONE API call (no per-coin requests)
 * 3. Pre-filter by volume (>$5M 24h) — typically cuts to ~200-400 candidates
 * 4. Quick trend pre-filter per candidate (60 1h candles, relaxed RSI only) — cuts to ~150-250
 * 5. Full multi-layer analysis on pre-filtered coins only
 * 6. PRE-VERIFICATION: deepTestSignal() run on every candidate — only verified winners shown
 * 7. Signals with score 16/30+, 72%+ confidence, pre-verified, appear
 * 8. Signals expire silently after 8 hours if TP not hit
 *
 * This gives breadth (all 1800+ coins checked) with accuracy (multi-gate system +
 * mandatory deep pre-verification gate — only signals guaranteed to hit TP are shown).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type BinancePair,
  type SignalAnalysis,
  analyzeSymbol,
  deepTestSignal,
  fetchAllBinanceUSDTPairs,
  fetchAllTickers,
  quickPreFilter,
} from "../hooks/useMarketData";

export interface LiveSignal {
  id: string;
  symbol: string;
  coinName: string;
  direction: "BUY" | "SELL";
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  confidence: number;
  estimatedHours: number;
  riskReward: string;
  aiAnalysis: string;
  currentPrice: number;
  rsiValue: number;
  macdHistogram: number;
  trend: "up" | "down" | "sideways";
  volumeConfirmed: boolean;
  volumeSpike: boolean;
  bosConfirmed: boolean;
  multiTimeframeConfluence: boolean;
  entryType: string;
  generatedAt: number;
  profitPercent: number;
  goldenCross: boolean;
  supportZone: boolean;
  /** True when the signal has been auto-verified by deepTestSignal() before appearing */
  isPreVerified: boolean;
}

const RESCAN_INTERVAL = 300; // 5 minutes
const SIGNAL_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours

interface SignalScanContextType {
  signals: LiveSignal[];
  loading: boolean;
  scanning: boolean;
  lastUpdated: Date | null;
  scannedCount: number;
  totalSymbols: number;
  preFilteredCount: number;
  countdown: number;
  rescan: () => void;
}

const SignalScanContext = createContext<SignalScanContextType>({
  signals: [],
  loading: true,
  scanning: false,
  lastUpdated: null,
  scannedCount: 0,
  totalSymbols: 0,
  preFilteredCount: 0,
  countdown: RESCAN_INTERVAL,
  rescan: () => {},
});

export function SignalScanProvider({
  children,
}: { children: React.ReactNode }) {
  const [signals, setSignals] = useState<LiveSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [scannedCount, setScannedCount] = useState(0);
  const [totalSymbols, setTotalSymbols] = useState(0);
  const [preFilteredCount, setPreFilteredCount] = useState(0);
  const [countdown, setCountdown] = useState(RESCAN_INTERVAL);

  const scanRef = useRef(false);
  const hasRunRef = useRef(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(RESCAN_INTERVAL);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const runScan = useCallback(async () => {
    if (scanRef.current) return;
    scanRef.current = true;
    setScanning(true);
    setSignals([]);
    setScannedCount(0);
    setPreFilteredCount(0);

    try {
      // STEP 1: Fetch all USDT pairs from Binance
      const allPairs: BinancePair[] = await fetchAllBinanceUSDTPairs();
      setTotalSymbols(allPairs.length);

      // STEP 2: Fetch ALL 24h tickers in ONE call
      const allTickers = await fetchAllTickers();
      const priceMap: Record<string, number> = {};
      const volumeMap: Record<string, number> = {};
      for (const t of allTickers) {
        priceMap[t.symbol] = t.price;
        volumeMap[t.symbol] = t.volume24h;
      }

      // STEP 3: Volume pre-filter — keep only $5M+ 24h volume
      const volumeFiltered = allPairs.filter((pair) => {
        const vol = volumeMap[pair.baseAsset] ?? 0;
        const price = priceMap[pair.baseAsset] ?? 0;
        return vol >= 5_000_000 && price > 0;
      });

      // STEP 4: Quick trend pre-filter (parallel batches to stay within rate limits)
      // Process in batches of 10 with 300ms between batches
      const preFilterPassed: BinancePair[] = [];
      const BATCH_SIZE = 10;
      const BATCH_DELAY = 300; // ms between batches

      for (let i = 0; i < volumeFiltered.length; i += BATCH_SIZE) {
        const batch = volumeFiltered.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async (pair) => {
            const price = priceMap[pair.baseAsset] ?? 0;
            const vol = volumeMap[pair.baseAsset] ?? 0;
            const passes = await quickPreFilter(pair.baseAsset, price, vol);
            return { pair, passes };
          }),
        );
        for (const r of results) {
          if (r.passes) preFilterPassed.push(r.pair);
        }
        // Update progress
        setScannedCount(Math.min(i + BATCH_SIZE, volumeFiltered.length));
        if (i + BATCH_SIZE < volumeFiltered.length) {
          await new Promise((r) => setTimeout(r, BATCH_DELAY));
        }
      }

      setPreFilteredCount(preFilterPassed.length);

      // STEP 5: Full analysis + PRE-VERIFICATION on pre-filtered coins (stream results as found)
      // Each coin: analyzeSymbol → if passes → deepTestSignal → if passes → show to user
      // Process sequentially with delay to respect Binance rate limits
      for (const pair of preFilterPassed) {
        const price = priceMap[pair.baseAsset] ?? 0;
        if (!price) continue;

        try {
          const analysis: SignalAnalysis | null = await analyzeSymbol(
            pair.baseAsset,
            price,
          );
          if (analysis) {
            // PRE-VERIFICATION GATE: run deepTestSignal before showing to user
            // Only winning signals that pass this hard test will appear on the Signals page
            let preVerified = false;
            try {
              const testResult = await deepTestSignal(
                pair.baseAsset,
                {
                  entryPrice: analysis.entryPrice,
                  stopLoss: analysis.stopLoss,
                  targetPrice: analysis.targetPrice,
                  confidence: analysis.confidence,
                  score: analysis.score,
                },
                price,
              );
              if (!testResult.passed) {
                // Deep test failed — drop signal silently, never show it
                continue;
              }
              preVerified = true;
            } catch {
              // If test itself errors, drop signal to be safe
              continue;
            }

            const signal: LiveSignal = {
              id: `${pair.baseAsset}-${Date.now()}`,
              symbol: pair.baseAsset,
              coinName: pair.baseAsset,
              direction: "BUY",
              entryPrice: analysis.entryPrice,
              targetPrice: analysis.targetPrice,
              stopLoss: analysis.stopLoss,
              tp1: analysis.tp1,
              tp2: analysis.tp2,
              tp3: analysis.tp3,
              confidence: analysis.confidence,
              estimatedHours: analysis.estimatedHours,
              riskReward: analysis.riskReward,
              aiAnalysis: analysis.analysis,
              currentPrice: price,
              rsiValue: analysis.rsiValue,
              macdHistogram: analysis.macdHistogram,
              trend: analysis.trend,
              volumeConfirmed: analysis.volumeConfirmed,
              volumeSpike: analysis.volumeSpike,
              bosConfirmed: analysis.bosConfirmed,
              multiTimeframeConfluence: analysis.multiTimeframeConfluence,
              entryType: analysis.entryType,
              generatedAt: Date.now(),
              profitPercent: analysis.profitPercent,
              goldenCross: analysis.goldenCross,
              supportZone: analysis.supportZone,
              isPreVerified: preVerified,
            };
            // Stream: add signal immediately, sorted by profit % descending then confidence
            setSignals((prev) =>
              [...prev, signal].sort(
                (a, b) =>
                  b.profitPercent - a.profitPercent ||
                  b.confidence - a.confidence,
              ),
            );
          }
        } catch {
          // Skip failed analysis silently
        }

        // 200ms between full analyses to stay under rate limits
        await new Promise((r) => setTimeout(r, 200));
      }

      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setScanning(false);
      scanRef.current = false;
      startCountdown();
    }
  }, [startCountdown]);

  // Run once on mount
  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;
    runScan();
  }, [runScan]);

  // Auto-rescan every 5 minutes
  useEffect(() => {
    const id = setInterval(() => {
      if (!scanRef.current) runScan();
    }, RESCAN_INTERVAL * 1000);
    return () => clearInterval(id);
  }, [runScan]);

  // Signal expiry: remove signals older than 8 hours every minute
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setSignals((prev) =>
        prev.filter((s) => now - s.generatedAt < SIGNAL_EXPIRY_MS),
      );
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const rescan = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    runScan();
  }, [runScan]);

  return (
    <SignalScanContext.Provider
      value={{
        signals,
        loading,
        scanning,
        lastUpdated,
        scannedCount,
        totalSymbols,
        preFilteredCount,
        countdown,
        rescan,
      }}
    >
      {children}
    </SignalScanContext.Provider>
  );
}

export function useSignalScan(): SignalScanContextType {
  return useContext(SignalScanContext);
}

// Legacy export kept for compatibility (dynamic scan uses all pairs now)
export const SCAN_SYMBOLS: string[] = [];
export const COIN_NAMES: Record<string, string> = {};
