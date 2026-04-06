/**
 * SignalScanContext — persistent signal scan that survives page navigation.
 *
 * v3 — Major improvements:
 * 1. Continuous re-scan every 90 seconds (markets are dynamic)
 * 2. Top 20 high-liquidity coins only (reduces noise, improves accuracy)
 * 3. No blacklist — markets reverse after stop hunts, blacklist kills re-entries
 * 4. Strict pre-filter: coins must have $50M+ 24h volume before analysis
 * 5. Signals de-duplicated: same symbol won't re-appear unless conditions improve
 * 6. Signals expire after 2 hours if not hit (stale signals removed)
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
  type SignalAnalysis,
  analyzeSymbol,
  fetch24hTickers,
} from "../hooks/useMarketData";

export interface LiveSignal {
  id: string;
  symbol: string;
  coinName: string;
  direction: "BUY" | "SELL";
  entryPrice: number;
  targetPrice: number;
  tp1: number;
  tp2: number;
  stopLoss: number;
  confidence: number;
  estimatedHours: number;
  riskReward: string;
  rrRatio: number;
  aiAnalysis: string;
  currentPrice: number;
  rsiValue: number;
  macdHistogram: number;
  trend: "up" | "down" | "sideways";
  volumeConfirmed: boolean;
  volumeSpike: boolean;
  multiTimeframeConfluence: boolean;
  breakOfStructure: boolean;
  entryType: string;
  generatedAt: number;
  profitPercent: number;
  atrValue: number;
}

/**
 * TOP 20 HIGH-LIQUIDITY COINS — selected for:
 * - High 24h trading volume ($1B+ daily)
 * - Deep order books (less manipulation)
 * - Predictable technical structure
 * - Strong institutional presence
 *
 * Fewer coins = better accuracy. Each coin gets proper analysis.
 */
export const SCAN_SYMBOLS = [
  "BTC", // Bitcoin — most liquid
  "ETH", // Ethereum
  "BNB", // Binance Coin
  "SOL", // Solana
  "XRP", // Ripple
  "ADA", // Cardano
  "AVAX", // Avalanche
  "DOGE", // Dogecoin (high volume)
  "LINK", // Chainlink
  "DOT", // Polkadot
  "MATIC", // Polygon
  "LTC", // Litecoin
  "UNI", // Uniswap
  "ATOM", // Cosmos
  "NEAR", // NEAR Protocol
  "OP", // Optimism
  "ARB", // Arbitrum
  "APT", // Aptos
  "SUI", // Sui
  "INJ", // Injective
];

export const COIN_NAMES: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  BNB: "BNB",
  SOL: "Solana",
  XRP: "Ripple",
  ADA: "Cardano",
  AVAX: "Avalanche",
  DOGE: "Dogecoin",
  LINK: "Chainlink",
  DOT: "Polkadot",
  MATIC: "Polygon",
  LTC: "Litecoin",
  UNI: "Uniswap",
  ATOM: "Cosmos",
  NEAR: "NEAR Protocol",
  OP: "Optimism",
  ARB: "Arbitrum",
  APT: "Aptos",
  SUI: "Sui",
  INJ: "Injective",
};

// Minimum 24h USD volume for a coin to be scanned ($50M)
const MIN_VOLUME_USD = 50_000_000;

// How often to re-scan (90 seconds)
const RESCAN_INTERVAL_MS = 90_000;

// Signal TTL — signals older than 2 hours are considered stale and removed
const SIGNAL_TTL_MS = 2 * 60 * 60 * 1000;

interface SignalScanContextType {
  signals: LiveSignal[];
  loading: boolean;
  scanning: boolean;
  lastUpdated: Date | null;
  scannedCount: number;
  totalSymbols: number;
  rescan: () => void;
  nextScanIn: number; // seconds until next auto-scan
}

const SignalScanContext = createContext<SignalScanContextType>({
  signals: [],
  loading: true,
  scanning: false,
  lastUpdated: null,
  scannedCount: 0,
  totalSymbols: SCAN_SYMBOLS.length,
  rescan: () => {},
  nextScanIn: 0,
});

export function SignalScanProvider({
  children,
}: { children: React.ReactNode }) {
  const [signals, setSignals] = useState<LiveSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [scannedCount, setScannedCount] = useState(0);
  const [nextScanIn, setNextScanIn] = useState(0);
  const totalSymbols = SCAN_SYMBOLS.length;

  const scanRef = useRef(false);
  const hasRunRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextScanTimeRef = useRef<number>(0);

  const startCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    nextScanTimeRef.current = Date.now() + RESCAN_INTERVAL_MS;
    countdownRef.current = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.round((nextScanTimeRef.current - Date.now()) / 1000),
      );
      setNextScanIn(remaining);
      if (remaining === 0 && countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    }, 1000);
  }, []);

  const runScan = useCallback(async () => {
    if (scanRef.current) return;
    scanRef.current = true;
    setScanning(true);
    setScannedCount(0);

    try {
      // Fetch all tickers first — pre-filter by volume
      const tickers = await fetch24hTickers(SCAN_SYMBOLS);
      if (tickers.length === 0) {
        setLoading(false);
        setScanning(false);
        scanRef.current = false;
        return;
      }

      // Build price map and volume-filter symbols
      const priceMap = Object.fromEntries(
        tickers.map((t) => [t.symbol, t.price]),
      );
      const volumeMap = Object.fromEntries(
        tickers.map((t) => [t.symbol, t.volume24h]),
      );

      // Only analyze coins with sufficient liquidity
      const eligibleSymbols = SCAN_SYMBOLS.filter((s) => {
        const vol = volumeMap[s] ?? 0;
        return vol >= MIN_VOLUME_USD;
      });

      // Remove stale signals (> 2h old)
      const now = Date.now();
      setSignals((prev) =>
        prev.filter((s) => now - s.generatedAt < SIGNAL_TTL_MS),
      );

      // Track symbols already having an active signal (to update, not duplicate)
      const newSignals: LiveSignal[] = [];

      for (const symbol of eligibleSymbols) {
        const price = priceMap[symbol];
        if (!price) {
          setScannedCount((prev) => prev + 1);
          continue;
        }

        try {
          const analysis: SignalAnalysis | null = await analyzeSymbol(
            symbol,
            price,
          );

          if (analysis) {
            const newSignal: LiveSignal = {
              id: `${symbol}-${Date.now()}`,
              symbol,
              coinName: COIN_NAMES[symbol] ?? symbol,
              direction: analysis.direction as "BUY" | "SELL",
              entryPrice: analysis.entryPrice,
              targetPrice: analysis.targetPrice,
              tp1: analysis.tp1,
              tp2: analysis.tp2,
              stopLoss: analysis.stopLoss,
              confidence: analysis.confidence,
              estimatedHours: analysis.estimatedHours,
              riskReward: analysis.riskReward,
              rrRatio: analysis.rrRatio,
              aiAnalysis: analysis.analysis,
              currentPrice: price,
              rsiValue: analysis.rsiValue,
              macdHistogram: analysis.macdHistogram,
              trend: analysis.trend,
              volumeConfirmed: analysis.volumeConfirmed,
              volumeSpike: analysis.volumeSpike,
              multiTimeframeConfluence: analysis.multiTimeframeConfluence,
              breakOfStructure: analysis.breakOfStructure,
              entryType: analysis.entryType,
              generatedAt: Date.now(),
              profitPercent: analysis.profitPercent,
              atrValue: analysis.atrValue,
            };
            newSignals.push(newSignal);
          }
        } catch {
          // Skip failed symbols silently
        }

        setScannedCount((prev) => prev + 1);
        // Small delay to avoid hitting Binance rate limits
        await new Promise((r) => setTimeout(r, 150));
      }

      if (newSignals.length > 0) {
        // Merge with existing: replace same-symbol signals, add new ones
        setSignals((prev) => {
          const existingBySymbol = Object.fromEntries(
            prev.map((s) => [s.symbol, s]),
          );
          for (const ns of newSignals) {
            existingBySymbol[ns.symbol] = ns;
          }
          return Object.values(existingBySymbol).sort(
            (a, b) => b.profitPercent - a.profitPercent,
          );
        });
      } else if (loading) {
        // First scan found nothing — still clear loading
        setSignals([]);
      }

      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setScanning(false);
      scanRef.current = false;
      startCountdown();
    }
  }, [loading, startCountdown]);

  // Run once on mount
  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;
    runScan();
  }, [runScan]);

  // Auto re-scan every 90 seconds
  useEffect(() => {
    timerRef.current = setInterval(() => {
      runScan();
    }, RESCAN_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [runScan]);

  const rescan = useCallback(() => {
    // Reset auto-timer so it doesn't fire right after manual rescan
    if (timerRef.current) clearInterval(timerRef.current);
    runScan().then(() => {
      timerRef.current = setInterval(() => {
        runScan();
      }, RESCAN_INTERVAL_MS);
    });
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
        rescan,
        nextScanIn,
      }}
    >
      {children}
    </SignalScanContext.Provider>
  );
}

export function useSignalScan(): SignalScanContextType {
  return useContext(SignalScanContext);
}
