/**
 * SignalScanContext — persistent signal scan that survives page navigation.
 * Scans top 20 high-liquidity coins only.
 * Auto-rescans every 90 seconds. Countdown timer exposed for UI.
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
}

// Top 20 high-liquidity coins ($50M+ 24h volume consistently)
export const SCAN_SYMBOLS = [
  "BTC",
  "ETH",
  "BNB",
  "SOL",
  "XRP",
  "ADA",
  "AVAX",
  "DOT",
  "MATIC",
  "LINK",
  "LTC",
  "UNI",
  "ATOM",
  "NEAR",
  "DOGE",
  "SHIB",
  "OP",
  "ARB",
  "INJ",
  "SUI",
];

export const COIN_NAMES: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  BNB: "BNB",
  SOL: "Solana",
  XRP: "Ripple",
  ADA: "Cardano",
  AVAX: "Avalanche",
  DOT: "Polkadot",
  MATIC: "Polygon",
  LINK: "Chainlink",
  LTC: "Litecoin",
  UNI: "Uniswap",
  ATOM: "Cosmos",
  NEAR: "NEAR Protocol",
  DOGE: "Dogecoin",
  SHIB: "Shiba Inu",
  OP: "Optimism",
  ARB: "Arbitrum",
  INJ: "Injective",
  SUI: "Sui",
};

const RESCAN_INTERVAL = 90; // seconds

interface SignalScanContextType {
  signals: LiveSignal[];
  loading: boolean;
  scanning: boolean;
  lastUpdated: Date | null;
  scannedCount: number;
  totalSymbols: number;
  countdown: number;
  rescan: () => void;
}

const SignalScanContext = createContext<SignalScanContextType>({
  signals: [],
  loading: true,
  scanning: false,
  lastUpdated: null,
  scannedCount: 0,
  totalSymbols: SCAN_SYMBOLS.length,
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
  const [countdown, setCountdown] = useState(RESCAN_INTERVAL);
  const totalSymbols = SCAN_SYMBOLS.length;

  // Prevent concurrent scans
  const scanRef = useRef(false);
  // Ensure first scan only runs once even in StrictMode double-invoke
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

    try {
      // Pre-filter: only include coins with sufficient 24h volume ($50M+)
      const tickers = await fetch24hTickers(SCAN_SYMBOLS);
      if (tickers.length === 0) {
        setLoading(false);
        setScanning(false);
        scanRef.current = false;
        return;
      }

      const priceMap = Object.fromEntries(
        tickers.map((t) => [t.symbol, t.price]),
      );
      const volumeMap = Object.fromEntries(
        tickers.map((t) => [t.symbol, t.volume24h]),
      );

      for (const symbol of SCAN_SYMBOLS) {
        const price = priceMap[symbol];
        const volume24h = volumeMap[symbol] ?? 0;

        // Skip coins with insufficient liquidity
        if (!price || volume24h < 50_000_000) {
          setScannedCount((prev) => prev + 1);
          await new Promise((r) => setTimeout(r, 50));
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
            };
            setSignals((prev) =>
              [...prev, newSignal].sort(
                (a, b) => b.profitPercent - a.profitPercent,
              ),
            );
          }
        } catch {
          // Skip failed symbols silently
        }
        setScannedCount((prev) => prev + 1);
        await new Promise((r) => setTimeout(r, 150));
      }

      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setScanning(false);
      scanRef.current = false;
      startCountdown();
    }
  }, [startCountdown]);

  // Run ONCE on mount
  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;
    runScan();
  }, [runScan]);

  // Auto-rescan every 90 seconds
  useEffect(() => {
    const id = setInterval(() => {
      if (!scanRef.current) {
        runScan();
      }
    }, RESCAN_INTERVAL * 1000);
    return () => clearInterval(id);
  }, [runScan]);

  // Cleanup countdown on unmount
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
