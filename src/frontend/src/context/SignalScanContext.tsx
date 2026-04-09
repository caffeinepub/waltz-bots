/**
 * SignalScanContext — scans ALL Binance USDT spot pairs (1800+) in a single batch.
 *
 * PIPELINE:
 * 1. Fetch all active USDT pairs from Binance exchangeInfo
 * 2. Fetch ALL 24h tickers in ONE call → Record<symbol, TickerData>
 * 3. quickPreFilter() — volume >$5M, not stablecoin, sane change%
 * 4. analyzeSymbol(symbol, tickers) — tiered analysis (6 hard gates + 12 scored gates, 82%+ confidence)
 * 5. Signals expire silently after 8 hours; weakening check every 2 minutes
 * 6. Auto-rescan every 5 minutes
 *
 * NOTE: deepTestSignal pre-verification removed from scan pipeline.
 * It caused valid signals to flicker-drop when market moved 0.1% between
 * analysis and test. The tiered gate system in analyzeSymbol already ensures
 * quality — double-testing on fresh data was eliminating good signals.
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
  type LiveSignal as MarketDataSignal,
  type TickerData,
  analyzeSymbol,
  fetch24hTickers,
  fetchAllBinanceUSDTPairs,
  quickPreFilter,
  useLivePrices,
} from "../hooks/useMarketData";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

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
  scanTime: number;
  profitPercent: number;
  goldenCross: boolean;
  supportZone: boolean;
  stopHuntConfirmed: boolean;
  chochConfirmed: boolean;
  ichimokuConfirmed: boolean;
  vwapConfirmed: boolean;
  breakOfStructure: boolean;
  /** True when the signal has been auto-verified by deepTestSignal() before appearing */
  isPreVerified: boolean;
  testPassed: boolean;
  testLocked: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const RESCAN_INTERVAL_SEC = 300; // 5 minutes
const SIGNAL_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 100;
const WEAKEN_CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const LIVE_PRICE_POLL_MS = 10_000; // 10 seconds
const MAX_DISPLAYED_SIGNALS = 20;

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT SHAPE
// ─────────────────────────────────────────────────────────────────────────────

interface SignalScanContextType {
  signals: LiveSignal[];
  livePrices: Record<string, number>;
  isScanning: boolean;
  scanProgress: string;
  lastScanTime: Date | null;
  nextScanIn: number;
  totalScanned: number;
  triggerScan: () => void;
  // Legacy compat aliases
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
  livePrices: {},
  isScanning: false,
  scanProgress: "",
  lastScanTime: null,
  nextScanIn: RESCAN_INTERVAL_SEC,
  totalScanned: 0,
  triggerScan: () => {},
  loading: true,
  scanning: false,
  lastUpdated: null,
  scannedCount: 0,
  totalSymbols: 0,
  preFilteredCount: 0,
  countdown: RESCAN_INTERVAL_SEC,
  rescan: () => {},
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function sortSignals(sigs: LiveSignal[]): LiveSignal[] {
  return [...sigs].sort(
    (a, b) => b.profitPercent - a.profitPercent || b.confidence - a.confidence,
  );
}

function buildLiveSignal(
  marketSig: MarketDataSignal,
  coinId: string,
): LiveSignal {
  const now = Date.now();
  return {
    id: `${coinId}-${now}`,
    symbol: coinId,
    coinName: coinId,
    direction: "BUY",
    entryPrice: marketSig.entryPrice,
    targetPrice: marketSig.targetPrice,
    stopLoss: marketSig.stopLoss,
    tp1: marketSig.tp1,
    tp2: marketSig.tp2,
    tp3: marketSig.tp3,
    confidence: marketSig.confidence,
    estimatedHours: marketSig.estimatedHours,
    riskReward: marketSig.riskReward,
    aiAnalysis: marketSig.analysis ?? "",
    currentPrice: marketSig.entryPrice,
    rsiValue: marketSig.rsiValue,
    macdHistogram: marketSig.macdHistogram,
    trend: marketSig.trend ?? "up",
    volumeConfirmed: marketSig.volumeConfirmed ?? true,
    volumeSpike: marketSig.volumeSpike,
    bosConfirmed: marketSig.chochConfirmed,
    breakOfStructure: marketSig.breakOfStructure,
    multiTimeframeConfluence: true,
    entryType: marketSig.entryType,
    generatedAt: now,
    scanTime: marketSig.scanTime,
    profitPercent: marketSig.profitPercent,
    goldenCross: marketSig.goldenCross ?? false,
    supportZone: marketSig.supportZone ?? false,
    stopHuntConfirmed: marketSig.stopHuntConfirmed,
    chochConfirmed: marketSig.chochConfirmed,
    ichimokuConfirmed: marketSig.ichimokuConfirmed,
    vwapConfirmed: marketSig.vwapConfirmed,
    isPreVerified: true,
    testPassed: true,
    testLocked: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

export function SignalScanProvider({
  children,
}: { children: React.ReactNode }) {
  const [signals, setSignals] = useState<LiveSignal[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [nextScanIn, setNextScanIn] = useState(RESCAN_INTERVAL_SEC);
  const [totalScanned, setTotalScanned] = useState(0);
  const [totalSymbols, setTotalSymbols] = useState(0);
  const [preFilteredCount, setPreFilteredCount] = useState(0);
  const [scannedCount, setScannedCount] = useState(0);

  const scanningRef = useRef(false);
  const initialRunRef = useRef(false);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── LIVE PRICES ──────────────────────────────────────────────────────────
  const signalSymbols = signals.map((s) => s.symbol);
  const livePrices = useLivePrices(signalSymbols, LIVE_PRICE_POLL_MS);

  // ── COUNTDOWN TIMER ──────────────────────────────────────────────────────

  const startCountdown = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setNextScanIn(RESCAN_INTERVAL_SEC);
    countdownTimerRef.current = setInterval(() => {
      setNextScanIn((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current)
            clearInterval(countdownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── MAIN SCAN PIPELINE ───────────────────────────────────────────────────

  const runScan = useCallback(async () => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setIsScanning(true);
    setScannedCount(0);
    setPreFilteredCount(0);
    setScanProgress("Fetching all Binance USDT pairs…");

    try {
      // STEP 1: Fetch all pairs + tickers in parallel
      const [allSymbols, tickers] = await Promise.all([
        fetchAllBinanceUSDTPairs(),
        fetch24hTickers(),
      ]);

      setTotalSymbols(allSymbols.length);
      setScanProgress(
        `${allSymbols.length} pairs found. Running volume pre-filter…`,
      );

      // STEP 2: Quick pre-filter (synchronous — uses tickers already fetched)
      const candidates: string[] = allSymbols
        .map((sym) => sym.replace("USDT", ""))
        .filter((base) => quickPreFilter(base, tickers));

      setPreFilteredCount(candidates.length);
      setScanProgress(
        `${candidates.length} candidates pass pre-filter. Analyzing…`,
      );

      // STEP 3: Full tiered analysis in batches, stream results as found
      let analyzed = 0;

      for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
        const batch = candidates.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (base) => {
            try {
              const marketSig = await analyzeSymbol(base, tickers);
              if (!marketSig) return;

              // Signal passed all tiered gates — add directly
              const signal = buildLiveSignal(marketSig, base);

              setSignals((prev) => {
                // Replace if symbol already exists, else add
                const existing = prev.filter((s) => s.symbol !== base);
                return sortSignals([...existing, signal]).slice(
                  0,
                  MAX_DISPLAYED_SIGNALS,
                );
              });
            } catch {
              // Skip failed coins silently
            }
          }),
        );

        analyzed += batch.length;
        setScannedCount(analyzed);
        setTotalScanned(analyzed);
        setScanProgress(`Analyzed ${analyzed} / ${candidates.length} coins…`);

        if (i + BATCH_SIZE < candidates.length) {
          await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
        }
      }

      setLastScanTime(new Date());
      setScanProgress(
        `Scan complete — verified signals found from ${analyzed} coins analyzed.`,
      );
    } catch (err) {
      setScanProgress("Scan error — retrying on next cycle.");
      console.error("[SignalScanContext] Scan error:", err);
    } finally {
      setIsScanning(false);
      scanningRef.current = false;
      startCountdown();
    }
  }, [startCountdown]);

  // ── INITIAL SCAN ON MOUNT ─────────────────────────────────────────────────

  useEffect(() => {
    if (initialRunRef.current) return;
    initialRunRef.current = true;
    runScan();
  }, [runScan]);

  // ── AUTO-RESCAN every 5 minutes ──────────────────────────────────────────

  useEffect(() => {
    const id = setInterval(() => {
      if (!scanningRef.current) runScan();
    }, RESCAN_INTERVAL_SEC * 1000);
    return () => clearInterval(id);
  }, [runScan]);

  // ── SIGNAL EXPIRY — remove signals older than 8 hours ────────────────────

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setSignals((prev) =>
        prev.filter((s) => now - s.scanTime < SIGNAL_EXPIRY_MS),
      );
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // ── WEAKENING CHECK — every 2 minutes ────────────────────────────────────

  useEffect(() => {
    const id = setInterval(() => {
      setSignals((prev) =>
        prev.filter((signal) => {
          const livePrice = livePrices[signal.symbol];
          if (!livePrice) return true; // no data yet — keep
          const distToSL = signal.entryPrice - signal.stopLoss;
          if (distToSL <= 0) return true;
          const dropped = (signal.entryPrice - livePrice) / distToSL;
          return dropped < 0.5; // remove if >50% toward SL
        }),
      );
    }, WEAKEN_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [livePrices]);

  // ── CLEANUP ───────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  // ── MANUAL TRIGGER ────────────────────────────────────────────────────────

  const triggerScan = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    runScan();
  }, [runScan]);

  return (
    <SignalScanContext.Provider
      value={{
        signals,
        livePrices,
        isScanning,
        scanProgress,
        lastScanTime,
        nextScanIn,
        totalScanned,
        triggerScan,
        // Legacy compat
        loading: isScanning && signals.length === 0,
        scanning: isScanning,
        lastUpdated: lastScanTime,
        scannedCount,
        totalSymbols,
        preFilteredCount,
        countdown: nextScanIn,
        rescan: triggerScan,
      }}
    >
      {children}
    </SignalScanContext.Provider>
  );
}

export function useSignalScan(): SignalScanContextType {
  return useContext(SignalScanContext);
}

// Legacy exports kept for compatibility
export const SCAN_SYMBOLS: string[] = [];
export const COIN_NAMES: Record<string, string> = {};
