/**
 * SignalScanContext — persistent signal scan that survives page navigation.
 * The scan runs ONCE when the provider mounts.
 * Rescans only happen when rescan() is called manually.
 *
 * Data quality gates applied BEFORE analyzeSymbol:
 * - Symbols blacklisted for SL hits are skipped
 * - Low 24h volume assets are skipped (< $1M USD)
 * - Price must be available and valid
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
  confidence: number;
  estimatedHours: number;
  riskReward: string;
  aiAnalysis: string;
  currentPrice: number;
  rsiValue: number;
  macdHistogram: number;
  trend: "up" | "down" | "sideways";
  volumeConfirmed: boolean;
  multiTimeframeConfluence: boolean;
  generatedAt: number;
  profitPercent: number;
}

// Scan list — established, high-liquidity pairs with real Binance OHLCV data
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
  "FIL",
  "NEAR",
  "ALGO",
  "VET",
  "ICP",
  "ETC",
  "HBAR",
  "OP",
  "ARB",
  "MKR",
  "AAVE",
  "CRV",
  "SAND",
  "MANA",
  "AXS",
  "DYDX",
  "GRT",
  "APT",
  "SUI",
  "INJ",
  "SEI",
  "TIA",
  "BLUR",
  "CFX",
  "MASK",
  "APE",
  "LDO",
  "FTM",
  "ONE",
  "ZIL",
  "WAVES",
  "KSM",
  "ROSE",
  "FLOW",
  "ENJ",
  "GALA",
  "CHZ",
  "KAVA",
  "QNT",
  "EGLD",
  "THETA",
  "FXS",
  "BAL",
  "SNX",
  "ZRX",
  "OGN",
  "REN",
  "YFI",
  "COMP",
  "SUSHI",
  "1INCH",
  "PERP",
  "ALPHA",
  "BADGER",
  "RUNE",
  "CELR",
  "SKL",
  "STX",
  "RNDR",
  "HFT",
  "LEVER",
  "HOOK",
  "MAGIC",
  "HIGH",
  "ACH",
  "AGLD",
  "AUCTION",
  "BAND",
  "BLZ",
  "BAKE",
  "BEAM",
  "BONK",
  "BNX",
  "CAKE",
  "CELO",
  "CLV",
  "CTSI",
  "PEPE",
  "SHIB",
  "WIF",
  "FLOKI",
  "DOGE",
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
  FIL: "Filecoin",
  NEAR: "NEAR Protocol",
  ALGO: "Algorand",
  VET: "VeChain",
  ICP: "Internet Computer",
  ETC: "Ethereum Classic",
  HBAR: "Hedera",
  OP: "Optimism",
  ARB: "Arbitrum",
  MKR: "Maker",
  AAVE: "Aave",
  CRV: "Curve",
  SAND: "The Sandbox",
  MANA: "Decentraland",
  AXS: "Axie Infinity",
  DYDX: "dYdX",
  GRT: "The Graph",
  APT: "Aptos",
  SUI: "Sui",
  INJ: "Injective",
  SEI: "Sei",
  TIA: "Celestia",
  BLUR: "Blur",
  CFX: "Conflux",
  MASK: "Mask Network",
  APE: "ApeCoin",
  LDO: "Lido DAO",
  FTM: "Fantom",
  ONE: "Harmony",
  ZIL: "Zilliqa",
  WAVES: "Waves",
  KSM: "Kusama",
  ROSE: "Oasis Network",
  FLOW: "Flow",
  ENJ: "Enjin Coin",
  GALA: "Gala",
  CHZ: "Chiliz",
  KAVA: "Kava",
  QNT: "Quant",
  EGLD: "MultiversX",
  THETA: "Theta Network",
  FXS: "Frax Share",
  BAL: "Balancer",
  SNX: "Synthetix",
  ZRX: "0x Protocol",
  OGN: "Origin Protocol",
  REN: "Ren",
  YFI: "yearn.finance",
  COMP: "Compound",
  SUSHI: "SushiSwap",
  "1INCH": "1inch",
  PERP: "Perpetual Protocol",
  ALPHA: "Alpha Finance",
  BADGER: "Badger DAO",
  RUNE: "THORChain",
  CELR: "Celer Network",
  SKL: "SKALE",
  STX: "Stacks",
  RNDR: "Render",
  HFT: "Hashflow",
  LEVER: "LeverFi",
  HOOK: "Hooked Protocol",
  MAGIC: "Magic",
  HIGH: "Highstreet",
  ACH: "Alchemy Pay",
  AGLD: "Adventure Gold",
  AUCTION: "Bounce Token",
  BAND: "Band Protocol",
  BLZ: "Bluzelle",
  BAKE: "BakeryToken",
  BEAM: "Beam",
  BONK: "Bonk",
  BNX: "BinaryX",
  CAKE: "PancakeSwap",
  CELO: "Celo",
  CLV: "Clover Finance",
  CTSI: "Cartesi",
  PEPE: "Pepe",
  SHIB: "Shiba Inu",
  WIF: "dogwifhat",
  FLOKI: "Floki",
  DOGE: "Dogecoin",
};

/** Minimum 24h USD volume to allow a symbol into the signal engine */
const MIN_24H_VOLUME_USD = 1_000_000;

interface SignalScanContextType {
  signals: LiveSignal[];
  loading: boolean;
  scanning: boolean;
  lastUpdated: Date | null;
  scannedCount: number;
  totalSymbols: number;
  rescan: () => void;
}

const SignalScanContext = createContext<SignalScanContextType>({
  signals: [],
  loading: true,
  scanning: false,
  lastUpdated: null,
  scannedCount: 0,
  totalSymbols: SCAN_SYMBOLS.length,
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
  const totalSymbols = SCAN_SYMBOLS.length;

  // Prevent concurrent scans
  const scanRef = useRef(false);
  // Ensure first scan only runs once even in StrictMode double-invoke
  const hasRunRef = useRef(false);

  const runScan = useCallback(async () => {
    if (scanRef.current) return;
    scanRef.current = true;
    setScanning(true);
    setSignals([]);
    setScannedCount(0);

    try {
      // Fetch all 24h tickers in one batch call — real data, no synthetic prices
      const tickers = await fetch24hTickers(SCAN_SYMBOLS);
      if (tickers.length === 0) {
        setLoading(false);
        setScanning(false);
        scanRef.current = false;
        return;
      }

      // Build price + volume maps for pre-filtering
      const priceMap: Record<string, number> = {};
      const volumeMap: Record<string, number> = {};
      for (const t of tickers) {
        priceMap[t.symbol] = t.price;
        volumeMap[t.symbol] = t.volume24h;
      }

      // Load SL blacklist — symbols that previously hit stop loss are excluded permanently
      const slHits: string[] = JSON.parse(
        localStorage.getItem("wb_sl_hits") ?? "[]",
      );

      for (const symbol of SCAN_SYMBOLS) {
        // Skip SL-blacklisted symbols
        if (slHits.includes(symbol)) {
          setScannedCount((prev) => prev + 1);
          continue;
        }

        const price = priceMap[symbol];
        if (!price || price <= 0) {
          setScannedCount((prev) => prev + 1);
          continue;
        }

        // Pre-filter: skip low-volume assets before running OHLCV analysis
        const vol24h = volumeMap[symbol] ?? 0;
        if (vol24h < MIN_24H_VOLUME_USD) {
          setScannedCount((prev) => prev + 1);
          continue;
        }

        try {
          // analyzeSymbol fetches real OHLCV from Binance and runs strict
          // multi-indicator, multi-timeframe analysis with confidence >= 80%
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
              confidence: analysis.confidence,
              estimatedHours: analysis.estimatedHours,
              riskReward: analysis.riskReward,
              aiAnalysis: analysis.analysis,
              currentPrice: price,
              rsiValue: analysis.rsiValue,
              macdHistogram: analysis.macdHistogram,
              trend: analysis.trend,
              volumeConfirmed: analysis.volumeConfirmed,
              multiTimeframeConfluence: analysis.multiTimeframeConfluence,
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
          // Skip failed symbols silently — data errors do not crash the scan
        }
        setScannedCount((prev) => prev + 1);
        // Small delay between requests to avoid rate-limiting
        await new Promise((r) => setTimeout(r, 120));
      }

      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setScanning(false);
      scanRef.current = false;
    }
  }, []);

  // Run ONCE on mount
  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;
    runScan();
  }, [runScan]);

  const rescan = useCallback(() => {
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
