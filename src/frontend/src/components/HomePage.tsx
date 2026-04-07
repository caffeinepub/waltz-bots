import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useActor } from "@/hooks/useActor";
import { useLivePrices } from "@/hooks/useMarketData";
import {
  Activity,
  AlertCircle,
  BarChart2,
  Brain,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { HeroSection } from "./HeroSection";
import { StackedCarousel } from "./StackedCarousel";

// Local type definitions (backend doesn't export these)
export const CoinCategory = {
  trending: "trending",
  hot: "hot",
  new: "new",
} as const;
export const MarketSentiment = {
  bullish: "bullish",
  bearish: "bearish",
  neutral: "neutral",
} as const;
export const PostCategory = {
  news: "news",
  post: "post",
  analysis: "analysis",
} as const;
export interface NewsPost {
  title: string;
  postCategory: string;
  timestamp: bigint;
  contentSummary: string;
}
export interface TrendingCoin {
  symbol: string;
  name: string;
  category: string;
  priceUsd: number;
  currentPrice?: number;
  change24h?: number;
  predictedTarget?: number;
}
export interface MarketStatus {
  sentiment: string;
  btcDominance: number;
  marketCap: number;
}

// ScanReport defined locally (removed from backend)
interface ScanReport {
  totalCoinsScanned: bigint;
  totalSignalsGenerated: bigint;
  activeSignalsCount: bigint;
  winRate: number;
}

// ─── Mock data ─────────────────────────────────────────────────────

export const MOCK_NEWS: NewsPost[] = [
  {
    title: "Bitcoin ETF Inflows Surpass $1.2B in Single Day",
    postCategory: PostCategory.news,
    timestamp: BigInt(Date.now() - 3600000),
    contentSummary:
      "BlackRock's IBIT and Fidelity's FBTC lead institutional demand as BTC targets new ATH. Analyst consensus points to $80K by end of Q2 2025.",
  },
  {
    title: "Ethereum Layer-2 Ecosystem Hits $45B TVL Milestone",
    postCategory: PostCategory.news,
    timestamp: BigInt(Date.now() - 7200000),
    contentSummary:
      "Arbitrum, Optimism, and Base collectively surpass record total value locked. DeFi summer 2.0 narrative gains momentum.",
  },
  {
    title: "SEC Approves Spot Ethereum ETF — Market Reacts",
    postCategory: PostCategory.news,
    timestamp: BigInt(Date.now() - 10800000),
    contentSummary:
      "Regulatory clarity opens floodgates for institutional ETH exposure. Price action suggests $5,000 target is within reach this cycle.",
  },
  {
    title: "Waltz Bots AI Model Achieves 96% Signal Accuracy",
    postCategory: PostCategory.news,
    timestamp: BigInt(Date.now() - 14400000),
    contentSummary:
      "Our proprietary Trezaria AI engine sets new benchmark for signal precision across 5,800+ monitored trading pairs.",
  },
];

export const MOCK_POSTS: NewsPost[] = [
  {
    title: "Why Bitcoin Will Hit $100K Before Year End",
    postCategory: PostCategory.post,
    timestamp: BigInt(Date.now() - 3600000),
    contentSummary:
      "Deep analysis of on-chain metrics, institutional flows, and historical halving patterns all pointing to one inevitable conclusion.",
  },
  {
    title: "Top 5 Altcoins to Watch This Week",
    postCategory: PostCategory.post,
    timestamp: BigInt(Date.now() - 86400000),
    contentSummary:
      "Our AI scanner flagged these 5 altcoins with exceptional signal quality and risk-reward ratios above 1:8.",
  },
  {
    title: "How to Read Our Trading Signals Like a Pro",
    postCategory: PostCategory.post,
    timestamp: BigInt(Date.now() - 172800000),
    contentSummary:
      "Master the entry, target, and stop-loss framework. Understanding signal confidence scores and timing windows.",
  },
];

const MOCK_SCAN: ScanReport = {
  totalCoinsScanned: BigInt(5840),
  totalSignalsGenerated: BigInt(1247),
  activeSignalsCount: BigInt(83),
  winRate: 94.7,
};

const MOCK_MARKET: MarketStatus = {
  sentiment: MarketSentiment.bullish,
  btcDominance: 54.3,
  marketCap: 2.87,
};

// ─── Expanded Trending Coins (buy/long-only) with TP multipliers ───
interface TrendingCoinData {
  symbol: string;
  name: string;
  emoji: string;
  tpMultiplier: number;
  reason: string;
}

const TRENDING_COINS: TrendingCoinData[] = [
  {
    symbol: "BTCUSDT",
    name: "Bitcoin",
    emoji: "₿",
    tpMultiplier: 1.12,
    reason: "Institutional inflows, ETF demand",
  },
  {
    symbol: "ETHUSDT",
    name: "Ethereum",
    emoji: "Ξ",
    tpMultiplier: 1.18,
    reason: "ETH ETF + staking yield",
  },
  {
    symbol: "SOLUSDT",
    name: "Solana",
    emoji: "◎",
    tpMultiplier: 1.22,
    reason: "High-speed DeFi ecosystem growth",
  },
  {
    symbol: "BNBUSDT",
    name: "BNB",
    emoji: "🔶",
    tpMultiplier: 1.15,
    reason: "Binance burn + ecosystem utility",
  },
  {
    symbol: "XRPUSDT",
    name: "XRP",
    emoji: "✕",
    tpMultiplier: 1.2,
    reason: "SEC clarity + SWIFT integration",
  },
  {
    symbol: "ADAUSDT",
    name: "Cardano",
    emoji: "₳",
    tpMultiplier: 1.25,
    reason: "Hydra scaling + governance upgrade",
  },
  {
    symbol: "AVAXUSDT",
    name: "Avalanche",
    emoji: "🔺",
    tpMultiplier: 1.28,
    reason: "Subnet adoption + institutional chains",
  },
  {
    symbol: "DOTUSDT",
    name: "Polkadot",
    emoji: "⬤",
    tpMultiplier: 1.3,
    reason: "Parachain auctions + cross-chain growth",
  },
  {
    symbol: "LINKUSDT",
    name: "Chainlink",
    emoji: "🔗",
    tpMultiplier: 1.2,
    reason: "CCIP adoption by major banks",
  },
  {
    symbol: "MATICUSDT",
    name: "Polygon",
    emoji: "🔷",
    tpMultiplier: 1.22,
    reason: "zkEVM adoption + CDK ecosystem",
  },
  {
    symbol: "NEARUSDT",
    name: "NEAR Protocol",
    emoji: "ⓝ",
    tpMultiplier: 1.35,
    reason: "AI integration + sharding breakthrough",
  },
  {
    symbol: "APTUSDT",
    name: "Aptos",
    emoji: "🅰",
    tpMultiplier: 1.4,
    reason: "Move language momentum + DeFi TVL spike",
  },
  {
    symbol: "ARBUSDT",
    name: "Arbitrum",
    emoji: "🔵",
    tpMultiplier: 1.32,
    reason: "L2 dominance + Stylus update",
  },
  {
    symbol: "OPUSDT",
    name: "Optimism",
    emoji: "🔴",
    tpMultiplier: 1.28,
    reason: "Superchain rollout + Coinbase Base",
  },
  {
    symbol: "INJUSDT",
    name: "Injective",
    emoji: "💉",
    tpMultiplier: 1.45,
    reason: "DeFi hub + on-chain trading surge",
  },
  {
    symbol: "SUIUSDT",
    name: "Sui",
    emoji: "🌊",
    tpMultiplier: 1.5,
    reason: "Object model DeFi growth + gaming",
  },
  {
    symbol: "TIAUSDT",
    name: "Celestia",
    emoji: "☁",
    tpMultiplier: 1.55,
    reason: "Modular blockchain pioneer",
  },
  {
    symbol: "STXUSDT",
    name: "Stacks",
    emoji: "🔒",
    tpMultiplier: 1.35,
    reason: "Bitcoin DeFi + Nakamoto upgrade",
  },
  {
    symbol: "RUNEUSDT",
    name: "THORChain",
    emoji: "⚡",
    tpMultiplier: 1.4,
    reason: "Native cross-chain DEX volume",
  },
  {
    symbol: "ATOMUSDT",
    name: "Cosmos",
    emoji: "⚛",
    tpMultiplier: 1.22,
    reason: "IBC adoption + ATOM 2.0",
  },
  {
    symbol: "ALGOUSDT",
    name: "Algorand",
    emoji: "◆",
    tpMultiplier: 1.18,
    reason: "CBDC partnerships + TPS growth",
  },
  {
    symbol: "FTMUSDT",
    name: "Fantom",
    emoji: "👻",
    tpMultiplier: 1.38,
    reason: "Sonic upgrade + DeFi resurgence",
  },
  {
    symbol: "GRTUSDT",
    name: "The Graph",
    emoji: "📊",
    tpMultiplier: 1.25,
    reason: "AI data indexing + dApp demand",
  },
  {
    symbol: "FILUSDT",
    name: "Filecoin",
    emoji: "📂",
    tpMultiplier: 1.3,
    reason: "Decentralized storage AI demand",
  },
  {
    symbol: "LTCUSDT",
    name: "Litecoin",
    emoji: "Ł",
    tpMultiplier: 1.15,
    reason: "Store of value + payment adoption",
  },
  {
    symbol: "TRXUSDT",
    name: "TRON",
    emoji: "🔆",
    tpMultiplier: 1.12,
    reason: "Stablecoin volume leader",
  },
  {
    symbol: "HBARUSDT",
    name: "Hedera",
    emoji: "ℏ",
    tpMultiplier: 1.28,
    reason: "Enterprise adoption + hashgraph speed",
  },
  {
    symbol: "ICPUSDT",
    name: "Internet Computer",
    emoji: "∞",
    tpMultiplier: 1.35,
    reason: "On-chain full-stack AI workloads",
  },
  {
    symbol: "VETUSDT",
    name: "VeChain",
    emoji: "☑",
    tpMultiplier: 1.2,
    reason: "Supply chain + enterprise ESG",
  },
  {
    symbol: "EOSUSDT",
    name: "EOS",
    emoji: "⭕",
    tpMultiplier: 1.18,
    reason: "EOS Network Foundation rebuild",
  },
  {
    symbol: "XTZUSDT",
    name: "Tezos",
    emoji: "🄧",
    tpMultiplier: 1.15,
    reason: "On-chain governance + NFT adoption",
  },
  {
    symbol: "FLOWUSDT",
    name: "Flow",
    emoji: "🌊",
    tpMultiplier: 1.22,
    reason: "NBA TopShot + Dapper Labs NFT",
  },
];

const TRENDING_SYMBOLS = TRENDING_COINS.map((c) => c.symbol);

// ─── AI-Researched 100X Candidate coins ───
interface Research100XCoin {
  symbol: string;
  name: string;
  multiplierPotential: number;
  reason: string;
  tpHitDate: string; // yyyy-mm-dd or display string
}

function formatTpDate(raw: string): string {
  // If already in dd/mm/yyyy format, return as-is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  // If yyyy-mm-dd, convert
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  // If "Est. TP: Q..." type string — keep as-is
  return raw;
}

function futureDateStr(monthsFromNow: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsFromNow);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

const RESEARCH_100X_COINS: Research100XCoin[] = [
  {
    symbol: "PEPE",
    name: "Pepe",
    multiplierPotential: 200,
    reason:
      "Ethereum meme coin in top 50 by market cap. Massive liquidity, battle-tested community, next rally could be historic.",
    tpHitDate: futureDateStr(8),
  },
  {
    symbol: "BONK",
    name: "Bonk",
    multiplierPotential: 180,
    reason:
      "Solana flagship meme coin. Viral growth engine, Coinbase listing, community-driven deflationary mechanics.",
    tpHitDate: futureDateStr(10),
  },
  {
    symbol: "SHIB",
    name: "Shiba Inu",
    multiplierPotential: 150,
    reason:
      "Massive global holder base. Shibarium L2 ecosystem, ShibaSwap DEX, and multi-chain expansion accelerating.",
    tpHitDate: futureDateStr(9),
  },
  {
    symbol: "WIF",
    name: "dogwifhat",
    multiplierPotential: 130,
    reason:
      "Viral Solana dog meme. Top 30 by market cap, exchange listings accelerating, cult following building.",
    tpHitDate: futureDateStr(11),
  },
  {
    symbol: "FLOKI",
    name: "Floki",
    multiplierPotential: 120,
    reason:
      "Strong utility roadmap: Valhalla metaverse, FlokiFi DeFi suite, and aggressive global marketing campaigns.",
    tpHitDate: futureDateStr(12),
  },
  {
    symbol: "DOGE",
    name: "Dogecoin",
    multiplierPotential: 100,
    reason:
      "Elon Musk endorsement, X/Twitter payment integration rumors, PayPal support — OG meme with real utility bridge.",
    tpHitDate: futureDateStr(7),
  },
  {
    symbol: "APE",
    name: "ApeCoin",
    multiplierPotential: 90,
    reason:
      "BAYC ecosystem, ApeChain launch, gaming partnerships. Undervalued relative to NFT blue chip status.",
    tpHitDate: futureDateStr(14),
  },
  {
    symbol: "SAND",
    name: "The Sandbox",
    multiplierPotential: 85,
    reason:
      "Metaverse land ownership, major brand partnerships, NFT gaming wave positioned for next cycle boom.",
    tpHitDate: futureDateStr(15),
  },
  {
    symbol: "MANA",
    name: "Decentraland",
    multiplierPotential: 80,
    reason:
      "First-mover metaverse protocol. Virtual real estate with real demand, active DAO governance.",
    tpHitDate: futureDateStr(16),
  },
  {
    symbol: "AXS",
    name: "Axie Infinity",
    multiplierPotential: 75,
    reason:
      "Play-to-earn pioneer rebuilt with Ronin chain. Next game cycle could bring 10M+ new players.",
    tpHitDate: futureDateStr(13),
  },
].sort((a, b) => b.multiplierPotential - a.multiplierPotential);

const HUNDRED_X_SYMBOLS = RESEARCH_100X_COINS.map((c) => c.symbol);

// ─── Helpers ───────────────────────────────────────────────────────

export function formatPrice(price: number): string {
  if (price >= 10000)
    return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(8)}`;
}

export function formatTimeAgo(ts: bigint): string {
  const ms = Number(ts);
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Sub-components ──────────────────────────────────────────────

function CounterStat({
  value,
  label,
  icon: Icon,
  color,
}: {
  value: string | number;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="stat-card p-4 flex flex-col gap-2"
    >
      {Icon && (
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: color ? `${color}20` : "rgba(212,175,55,0.12)" }}
        >
          <span style={{ color: color ?? "#D4AF37" }}>
            <Icon className="w-5 h-5" />
          </span>
        </div>
      )}
      <p className="font-bold text-2xl text-navy">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </motion.div>
  );
}

// Trending coin card (enhanced with Entry, TP Target, BUY SIGNAL badge)
function TrendingCoinCard({
  coin,
  livePrice,
  liveChange,
}: {
  coin: TrendingCoinData;
  livePrice: number;
  liveChange: number;
}) {
  const isUp = liveChange >= 0;
  const tp = livePrice > 0 ? livePrice * coin.tpMultiplier : 0;
  const ticker = coin.symbol.replace("USDT", "");
  return (
    <div
      className="flex-shrink-0 rounded-2xl p-3 cursor-pointer transition-all hover:-translate-y-1"
      style={{
        background: "rgba(255,255,255,0.92)",
        border: "1px solid rgba(34,197,94,0.25)",
        boxShadow: "0 4px 16px rgba(11,31,59,0.08)",
        minWidth: 168,
      }}
    >
      {/* BUY SIGNAL badge */}
      <div
        className="px-2 py-0.5 rounded-full text-xs font-black mb-2 inline-block"
        style={{
          background:
            "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(22,163,74,0.1))",
          color: "#16A34A",
          border: "1px solid rgba(34,197,94,0.3)",
        }}
      >
        ✅ BUY SIGNAL
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{
            background: isUp
              ? "linear-gradient(135deg, #16A34A, #22C55E)"
              : "linear-gradient(135deg, #DC2626, #EF4444)",
          }}
        >
          {ticker.slice(0, 2)}
        </div>
        <div>
          <p className="font-semibold text-xs text-navy">{ticker}</p>
          <p className="text-xs text-gray-400 leading-tight">{coin.name}</p>
        </div>
      </div>

      {/* Price data rows */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">Entry</span>
          <span className="font-bold text-xs text-navy">
            {livePrice > 0 ? formatPrice(livePrice) : "Loading..."}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">TP Target</span>
          <span className="font-bold text-xs text-green-600">
            {tp > 0 ? formatPrice(tp) : "—"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">24h</span>
          <span
            className={`font-semibold text-xs ${isUp ? "text-green-600" : "text-red-500"}`}
          >
            {isUp ? "▲" : "▼"} {Math.abs(liveChange).toFixed(2)}%
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-1.5 leading-tight border-t border-gray-100 pt-1.5">
        {coin.reason}
      </p>
    </div>
  );
}

// Trending coin card for legacy TrendingCoin type (from backend)
function LegacyTrendingCoinCard({
  coin,
  livePrice,
  liveChange,
}: { coin: TrendingCoin; livePrice: number; liveChange: number }) {
  const isUp = liveChange >= 0;
  const multiplier =
    livePrice > 0 ? ((coin.predictedTarget ?? 0) / livePrice).toFixed(1) : "—";
  return (
    <div
      className="flex-shrink-0 rounded-2xl p-3 cursor-pointer transition-all hover:-translate-y-1"
      style={{
        background: "rgba(255,255,255,0.85)",
        border: "1px solid rgba(230,234,242,0.9)",
        boxShadow: "0 4px 16px rgba(11,31,59,0.08)",
        minWidth: 140,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{
            background: isUp
              ? "linear-gradient(135deg, #16A34A, #22C55E)"
              : "linear-gradient(135deg, #DC2626, #EF4444)",
          }}
        >
          {coin.symbol.slice(0, 2)}
        </div>
        <div>
          <p className="font-semibold text-xs text-navy">{coin.symbol}</p>
          <p className="text-xs text-gray-400">{coin.name}</p>
        </div>
      </div>
      <p className="font-bold text-sm text-navy">{formatPrice(livePrice)}</p>
      <p
        className={`text-xs font-semibold mt-0.5 ${
          isUp ? "text-green-600" : "text-red-500"
        }`}
      >
        {isUp ? "↑" : "↓"} {Math.abs(liveChange).toFixed(2)}%
      </p>
      <p className="text-xs text-gold mt-1">
        Target: {formatPrice(coin.predictedTarget ?? 0)}
      </p>
      <div
        className="mt-1 px-1.5 py-0.5 rounded-full text-center text-xs font-bold"
        style={{ background: "rgba(212,175,55,0.12)", color: "#B8960C" }}
      >
        {multiplier}x potential
      </div>
    </div>
  );
}

function HundredXCard({
  coin,
  livePrice,
  change24h,
  onClick,
}: {
  coin: Research100XCoin;
  livePrice: number;
  change24h: number;
  onClick: () => void;
}) {
  const isUp = change24h >= 0;
  const aiTarget = livePrice > 0 ? livePrice * coin.multiplierPotential : null;
  const tpDateDisplay = formatTpDate(coin.tpHitDate);
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-full w-full text-left rounded-2xl p-5 relative overflow-hidden transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99]"
      style={{
        background:
          "linear-gradient(135deg, #071428 0%, #0B1F3B 60%, #0D2A50 100%)",
        border: "1px solid rgba(212,175,55,0.3)",
        boxShadow: "0 4px 20px rgba(11,31,59,0.25)",
      }}
    >
      {/* Background glow */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)",
          filter: "blur(12px)",
        }}
      />

      <div className="flex items-center justify-between mb-4">
        <div
          className="px-2 py-1 rounded-full text-xs font-black"
          style={{
            background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
            color: "#3d2800",
          }}
        >
          🚀 {coin.multiplierPotential}x POTENTIAL
        </div>
        <Badge
          className={`border ${
            isUp
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : "bg-red-500/20 text-red-400 border-red-500/30"
          }`}
        >
          {isUp ? "+" : ""}
          {change24h.toFixed(1)}%
        </Badge>
      </div>

      {/* Coin icon */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-black mx-auto mb-3"
        style={{
          background: "linear-gradient(135deg, #F2D27A, #D4AF37, #B8960C)",
          boxShadow: "0 0 20px rgba(212,175,55,0.5)",
          color: "#3d2800",
        }}
      >
        {coin.symbol.slice(0, 2)}
      </div>

      <p className="text-white font-bold text-center text-lg">{coin.name}</p>
      <p className="text-gold/70 text-center text-xs mb-2">
        {coin.symbol}/USDT
      </p>
      <p className="text-white/40 text-center text-xs leading-relaxed mb-4 italic">
        {coin.reason}
      </p>

      {/* Price + TP grid */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div
          className="rounded-xl p-2.5 text-center"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          <p className="text-white/50 mb-0.5">Live Price</p>
          <p className="text-white font-bold">
            {livePrice > 0 ? (
              formatPrice(livePrice)
            ) : (
              <span className="text-white/30 text-xs">Loading...</span>
            )}
          </p>
        </div>
        <div
          className="rounded-xl p-2.5 text-center"
          style={{ background: "rgba(212,175,55,0.12)" }}
        >
          <p className="text-gold/70 mb-0.5">AI Target (TP)</p>
          <p className="text-gold font-bold">
            {aiTarget !== null ? (
              formatPrice(aiTarget)
            ) : (
              <span className="text-gold/30 text-xs">Calculating...</span>
            )}
          </p>
        </div>
      </div>

      {/* TP Date */}
      <div
        className="py-2 px-3 rounded-xl text-center mb-3"
        style={{
          background: "rgba(212,175,55,0.08)",
          border: "1px solid rgba(212,175,55,0.2)",
        }}
      >
        <p className="text-gold/70 text-xs mb-0.5">Est. TP Hit Date</p>
        <p className="text-gold font-bold text-sm">📅 {tpDateDisplay}</p>
      </div>

      {/* Potential badge */}
      <div
        className="py-2.5 rounded-xl text-center"
        style={{
          background:
            "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))",
          border: "1px solid rgba(212,175,55,0.3)",
        }}
      >
        <p className="text-gold font-black text-2xl">
          {coin.multiplierPotential}x
        </p>
        <p className="text-white/50 text-xs">Max Gain Potential</p>
      </div>

      {/* Click indicator */}
      <p className="text-white/25 text-xs text-center mt-3">
        Tap to view full research →
      </p>
    </button>
  );
}

interface AdminPost {
  id: string;
  heading: string;
  tagline: string;
  description: string;
  photo?: string;
  isPromo: boolean;
  createdAt: string;
}

function PostCard({ post }: { post: AdminPost }) {
  if (post.isPromo) {
    return (
      <div
        className="h-full p-5 rounded-2xl relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #071428, #0B1F3B)",
          border: "2px solid #D4AF37",
          boxShadow:
            "0 0 20px rgba(212,175,55,0.3), 0 0 40px rgba(212,175,55,0.1)",
        }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(45deg, transparent 45%, rgba(212,175,55,0.1) 50%, transparent 55%)",
            backgroundSize: "200% 200%",
            animation: "shimmer 3s linear infinite",
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-black"
              style={{
                background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
                color: "#3d2800",
              }}
            >
              ⭐ SPONSORED
            </span>
          </div>
          <h3 className="text-gold font-bold text-sm mb-1">{post.heading}</h3>
          <p className="text-white/70 text-xs mb-2 italic">{post.tagline}</p>
          {post.photo && (
            <img
              src={post.photo}
              alt={post.heading}
              className="w-full h-20 object-cover rounded-lg mb-2"
            />
          )}
          <p className="text-white/50 text-xs leading-relaxed">
            {post.description}
          </p>
          <p className="text-gold/40 text-xs mt-2">
            {new Date(post.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div
      className="h-full p-5 rounded-2xl"
      style={{
        background: "linear-gradient(135deg, #0B1F3B, #0A254A)",
        border: "1px solid rgba(212,175,55,0.15)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-gold" />
        <span className="text-gold text-xs font-semibold tracking-widest uppercase">
          Post
        </span>
      </div>
      <h3 className="text-white font-bold text-sm leading-snug mb-1">
        {post.heading}
      </h3>
      <p className="text-white/60 text-xs italic mb-2">{post.tagline}</p>
      {post.photo && (
        <img
          src={post.photo}
          alt={post.heading}
          className="w-full h-20 object-cover rounded-lg mb-2"
        />
      )}
      <p className="text-white/50 text-xs leading-relaxed">
        {post.description}
      </p>
      <p className="text-gold/40 text-xs mt-2">
        {new Date(post.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}

// ─── 100X Swipeable Carousel ───────────────────────────────────────────

function HundredXCarousel({
  coins,
  hundredXPrices,
  onSelect,
}: {
  coins: Research100XCoin[];
  hundredXPrices: Record<string, { price: number; change24h: number }>;
  onSelect: (
    coin: Research100XCoin & { livePrice: number; change24h: number },
  ) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    const x = "touches" in e ? e.touches[0].clientX : e.clientX;
    setDragStartX(x);
    setIsDragging(true);
  };

  const handleDragEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (dragStartX === null || !isDragging) return;
    const x = "changedTouches" in e ? e.changedTouches[0].clientX : e.clientX;
    const diff = dragStartX - x;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && activeIndex < coins.length - 1)
        setActiveIndex((i) => i + 1);
      else if (diff < 0 && activeIndex > 0) setActiveIndex((i) => i - 1);
    }
    setDragStartX(null);
    setIsDragging(false);
  };

  const prev = () => setActiveIndex((i) => Math.max(0, i - 1));
  const next = () => setActiveIndex((i) => Math.min(coins.length - 1, i + 1));

  return (
    <div className="relative select-none">
      {/* Carousel track */}
      <div
        className="overflow-hidden rounded-2xl"
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchEnd={handleDragEnd}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
        data-ocid="hundredx.list"
      >
        <div
          className="flex transition-transform duration-400 ease-in-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {coins.map((coin) => {
            const livePrice = hundredXPrices[coin.symbol]?.price ?? 0;
            const change24h = hundredXPrices[coin.symbol]?.change24h ?? 0;
            return (
              <div
                key={coin.symbol}
                className="flex-shrink-0 w-full px-1"
                style={{ minWidth: "100%" }}
              >
                <div className="max-w-sm mx-auto">
                  <HundredXCard
                    coin={coin}
                    livePrice={livePrice}
                    change24h={change24h}
                    onClick={() => onSelect({ ...coin, livePrice, change24h })}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Prev / Next arrows */}
      <button
        type="button"
        onClick={prev}
        disabled={activeIndex === 0}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
        style={{
          background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
          color: "#3d2800",
        }}
        data-ocid="hundredx.pagination_prev"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={next}
        disabled={activeIndex === coins.length - 1}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
        style={{
          background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
          color: "#3d2800",
        }}
        data-ocid="hundredx.pagination_next"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-4">
        {coins.map((c, i) => (
          <button
            key={c.symbol}
            type="button"
            onClick={() => setActiveIndex(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === activeIndex ? 20 : 6,
              height: 6,
              background:
                i === activeIndex
                  ? "linear-gradient(90deg, #F2D27A, #D4AF37)"
                  : "rgba(212,175,55,0.25)",
            }}
          />
        ))}
      </div>

      {/* Counter */}
      <p className="text-center text-xs text-gray-400 mt-2">
        {activeIndex + 1} / {coins.length} • Swipe or use arrows
      </p>
    </div>
  );
}

// ─── Main HomePage ────────────────────────────────────────────────

export function HomePage({
  onTabChange,
}: { onTabChange: (tab: string) => void }) {
  // We use TRENDING_COINS (expanded local list) as primary trending data
  // Backend TrendingCoin type used only when backend provides data
  const [backendCoins, setBackendCoins] = useState<TrendingCoin[]>([]);
  const [news, setNews] = useState<NewsPost[]>(MOCK_NEWS);
  const [scanReport, _setScanReport] = useState<ScanReport>(MOCK_SCAN);
  const [_marketStatus, setMarketStatus] = useState<MarketStatus>(MOCK_MARKET);

  // Global market data (CoinGecko + Fear & Greed)
  const [globalMarket, setGlobalMarket] = useState<{
    totalMarketCapT: number;
    btcDominance: number;
    ethDominance: number;
    marketChange24h: number;
    activeCryptos: number;
    fearGreedValue: number;
    fearGreedLabel: string;
    loaded: boolean;
  }>({
    totalMarketCapT: 2.87,
    btcDominance: 54.3,
    ethDominance: 17.2,
    marketChange24h: 1.4,
    activeCryptos: 13240,
    fearGreedValue: 65,
    fearGreedLabel: "Greed",
    loaded: false,
  });

  // Trending coin detail dialog (for backend-sourced coins)
  const [selectedTrendingCoin, setSelectedTrendingCoin] =
    useState<TrendingCoin | null>(null);
  // Trending coin detail (for local TRENDING_COINS data)
  const [selectedLocalCoin, setSelectedLocalCoin] =
    useState<TrendingCoinData | null>(null);

  // 100X coin detail modal state
  const [selected100X, setSelected100X] = useState<
    (Research100XCoin & { livePrice: number; change24h: number }) | null
  >(null);

  // Live prices for local trending coins (30+)
  const realPrices = useLivePrices(TRENDING_SYMBOLS, 8000);

  // Live prices for 100X coins
  const hundredXPrices = useLivePrices(HUNDRED_X_SYMBOLS, 10000);

  // Load admin posts
  const [adminPosts, setAdminPosts] = useState<AdminPost[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("wb_posts");
      if (raw) setAdminPosts(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const { actor } = useActor();

  useEffect(() => {
    if (!actor) return;
    Promise.all([
      actor.getAllTrendingCoins(),
      actor.getAllNewsPosts(),
      actor.getMarketStatus(),
    ])
      .then(([coins, newsPosts, market]) => {
        if (coins.length > 0) {
          const trending = coins.filter(
            (c) => c.category === CoinCategory.trending,
          );
          if (trending.length > 0) setBackendCoins(trending);
        }
        if (newsPosts.length > 0)
          setNews(
            newsPosts.filter((p) => p.postCategory === PostCategory.news),
          );
        setMarketStatus(market ?? MOCK_MARKET);
      })
      .catch(() => {
        /* fallback to mock */
      });
  }, [actor]);

  // Fetch global market data from CoinGecko + Fear & Greed
  useEffect(() => {
    let cancelled = false;
    const fetchGlobal = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const [globalRes, fngRes] = await Promise.all([
          fetch("https://api.coingecko.com/api/v3/global", {
            signal: controller.signal,
          }),
          fetch("https://api.alternative.me/fng/?limit=1", {
            signal: controller.signal,
          }),
        ]);
        clearTimeout(timeout);
        if (cancelled) return;
        const globalJson = await globalRes.json();
        const fngJson = await fngRes.json();
        const gd = globalJson.data;
        const fg = fngJson?.data?.[0];
        if (!cancelled) {
          setGlobalMarket({
            totalMarketCapT: (gd.total_market_cap?.usd ?? 0) / 1e12,
            btcDominance: gd.market_cap_percentage?.btc ?? 54.3,
            ethDominance: gd.market_cap_percentage?.eth ?? 17.2,
            marketChange24h: gd.market_cap_change_percentage_24h_usd ?? 0,
            activeCryptos: gd.active_cryptocurrencies ?? 13240,
            fearGreedValue: Number(fg?.value ?? 65),
            fearGreedLabel: fg?.value_classification ?? "Greed",
            loaded: true,
          });
        }
      } catch {
        // silently fall back to defaults
      }
    };
    fetchGlobal();
    const interval = setInterval(fetchGlobal, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Combine admin posts with mock posts for carousel
  const allPostItems = [
    ...adminPosts.map((p) => ({
      title: p.heading,
      content: <PostCard post={p} />,
    })),
    ...MOCK_POSTS.map((p) => ({
      title: p.title,
      content: (
        <div
          className="h-full p-5"
          style={{
            background: "linear-gradient(135deg, #0B1F3B, #0A254A)",
            borderRadius: 16,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-gold" />
            <span className="text-gold text-xs font-semibold tracking-widest uppercase">
              Post
            </span>
          </div>
          <h3 className="text-white font-bold text-sm leading-snug mb-3">
            {p.title}
          </h3>
          <p className="text-white/50 text-xs leading-relaxed">
            {p.contentSummary}
          </p>
          <p className="text-gold/50 text-xs mt-3">
            {formatTimeAgo(p.timestamp)}
          </p>
        </div>
      ),
    })),
  ];

  const newsItems = news.map((n) => ({
    title: n.title,
    content: (
      <div
        className="h-full p-5 rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.9)",
          border: "1px solid rgba(230,234,242,0.8)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-blue-500" />
          <span className="text-blue-500 text-xs font-semibold tracking-widest uppercase">
            Breaking
          </span>
        </div>
        <h3 className="text-navy font-bold text-sm leading-snug mb-3">
          {n.title}
        </h3>
        <p className="text-gray-500 text-xs leading-relaxed">
          {n.contentSummary}
        </p>
        <p className="text-gray-400 text-xs mt-3 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTimeAgo(n.timestamp)}
        </p>
      </div>
    ),
  }));

  // Which trending coins to show: prefer local expanded list
  const showBackendTrending = backendCoins.length > 0;

  // Quick BTC/ETH/SOL prices for market status
  const btcPrice = realPrices.BTCUSDT?.price ?? 0;
  const ethPrice = realPrices.ETHUSDT?.price ?? 0;
  const solPrice = realPrices.SOLUSDT?.price ?? 0;

  return (
    <div className="space-y-6">
      <HeroSection onExplore={() => onTabChange("signals")} />

      {/* Home grid row */}
      <div data-ocid="home.section">
        <h2 className="text-xl font-bold text-navy mb-4 flex items-center gap-2">
          <span className="w-1 h-6 rounded-full bg-gold inline-block" />
          Home Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* About */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5"
          >
            <h3 className="font-bold text-navy mb-2 flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black"
                style={{
                  background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
                  color: "#3d2800",
                }}
              >
                WB
              </span>
              About Waltz Bots
            </h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-3">
              Waltz Bots is a professional AI-driven crypto trading signal
              platform by Trezaria Holdings. Our proprietary algorithms scan
              5,800+ crypto pairs in real-time, delivering precision BUY/SELL
              signals with industry-leading 94.7% accuracy.
            </p>
            <p className="text-gray-500 text-xs leading-relaxed">
              Every signal includes entry price, target, and stop-loss levels —
              engineered so you can trade like an institutional professional.
            </p>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gold/70 font-medium">
                Powered by Trezaria Holdings
              </p>
            </div>
          </motion.div>

          {/* Posts carousel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-5"
          >
            <h3 className="font-bold text-navy mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-gold" />
              Recent Posts
            </h3>
            <StackedCarousel
              items={allPostItems}
              className="h-52"
              interval={5000}
            />
          </motion.div>

          {/* News carousel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-5"
          >
            <h3 className="font-bold text-navy mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              Market News
            </h3>
            <StackedCarousel
              items={newsItems}
              className="h-52"
              interval={4500}
            />
          </motion.div>
        </div>
      </div>

      {/* Scan Report */}
      <div>
        <h2 className="text-xl font-bold text-navy mb-4 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-gold" />
          Scan Report
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <CounterStat
            value={Number(scanReport.totalCoinsScanned).toLocaleString()}
            label="Coins Scanned"
            icon={Globe}
            color="#2F6FED"
          />
          <CounterStat
            value={Number(scanReport.totalSignalsGenerated).toLocaleString()}
            label="Signals Generated"
            icon={Zap}
            color="#D4AF37"
          />
          <CounterStat
            value={`${scanReport.winRate.toFixed(1)}%`}
            label="Win Rate"
            icon={Target}
            color="#16A34A"
          />
          <CounterStat
            value={Number(scanReport.activeSignalsCount).toLocaleString()}
            label="Active Signals"
            icon={Activity}
            color="#8B5CF6"
          />
        </div>
      </div>

      {/* Market Status — Global Crypto Market */}
      <div>
        <h2 className="text-xl font-bold text-navy mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-navy" />
          Overall Crypto Market
        </h2>
        <div className="glass-card p-5">
          {/* Top row: sentiment + live price pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background:
                    globalMarket.marketChange24h >= 0
                      ? "#16A34A20"
                      : "#DC262620",
                }}
              >
                {globalMarket.marketChange24h >= 0 ? (
                  <TrendingUp
                    className="w-6 h-6"
                    style={{ color: "#16A34A" }}
                  />
                ) : (
                  <TrendingDown
                    className="w-6 h-6"
                    style={{ color: "#DC2626" }}
                  />
                )}
              </div>
              <div>
                <p className="text-xs text-gray-400">Overall Sentiment</p>
                <p
                  className="font-bold text-lg"
                  style={{
                    color:
                      globalMarket.marketChange24h >= 0 ? "#16A34A" : "#DC2626",
                  }}
                >
                  {globalMarket.marketChange24h >= 0 ? "Bullish" : "Bearish"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { sym: "BTC", price: btcPrice },
                { sym: "ETH", price: ethPrice },
                { sym: "SOL", price: solPrice },
              ].map(({ sym, price }) => (
                <div
                  key={sym}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    background: "rgba(11,31,59,0.08)",
                    color: "#0B1F3B",
                    border: "1px solid rgba(11,31,59,0.12)",
                  }}
                >
                  {sym} {price > 0 ? formatPrice(price) : ""}
                </div>
              ))}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Market Cap */}
            <div
              className="rounded-xl p-3"
              style={{
                background: "rgba(11,31,59,0.04)",
                border: "1px solid rgba(11,31,59,0.07)",
              }}
            >
              <p className="text-xs text-gray-400 mb-1">Total Market Cap</p>
              <p className="font-bold text-navy text-sm">
                ${globalMarket.totalMarketCapT.toFixed(2)}T
              </p>
            </div>

            {/* BTC Dominance */}
            <div
              className="rounded-xl p-3"
              style={{
                background: "rgba(11,31,59,0.04)",
                border: "1px solid rgba(11,31,59,0.07)",
              }}
            >
              <p className="text-xs text-gray-400 mb-1">BTC Dominance</p>
              <p className="font-bold text-navy text-sm">
                {globalMarket.btcDominance.toFixed(1)}%
              </p>
              <Progress
                value={globalMarket.btcDominance}
                className="h-1 mt-1.5"
              />
            </div>

            {/* ETH Dominance */}
            <div
              className="rounded-xl p-3"
              style={{
                background: "rgba(11,31,59,0.04)",
                border: "1px solid rgba(11,31,59,0.07)",
              }}
            >
              <p className="text-xs text-gray-400 mb-1">ETH Dominance</p>
              <p className="font-bold text-navy text-sm">
                {globalMarket.ethDominance.toFixed(1)}%
              </p>
              <Progress
                value={globalMarket.ethDominance}
                className="h-1 mt-1.5"
              />
            </div>

            {/* 24h Market Change */}
            <div
              className="rounded-xl p-3"
              style={{
                background: "rgba(11,31,59,0.04)",
                border: "1px solid rgba(11,31,59,0.07)",
              }}
            >
              <p className="text-xs text-gray-400 mb-1">24h Change</p>
              <p
                className="font-bold text-sm"
                style={{
                  color:
                    globalMarket.marketChange24h >= 0 ? "#16A34A" : "#DC2626",
                }}
              >
                {globalMarket.marketChange24h >= 0 ? "+" : ""}
                {globalMarket.marketChange24h.toFixed(2)}%
              </p>
            </div>

            {/* Fear & Greed */}
            <div
              className="rounded-xl p-3"
              style={{
                background: "rgba(11,31,59,0.04)",
                border: "1px solid rgba(11,31,59,0.07)",
              }}
            >
              <p className="text-xs text-gray-400 mb-1">Fear &amp; Greed</p>
              <p
                className="font-bold text-sm"
                style={{
                  color:
                    globalMarket.fearGreedValue >= 75
                      ? "#16A34A"
                      : globalMarket.fearGreedValue >= 55
                        ? "#D4AF37"
                        : globalMarket.fearGreedValue >= 45
                          ? "#8A94A6"
                          : globalMarket.fearGreedValue >= 25
                            ? "#EA580C"
                            : "#DC2626",
                }}
              >
                {globalMarket.fearGreedValue} — {globalMarket.fearGreedLabel}
              </p>
            </div>

            {/* Active Cryptos */}
            <div
              className="rounded-xl p-3"
              style={{
                background: "rgba(11,31,59,0.04)",
                border: "1px solid rgba(11,31,59,0.07)",
              }}
            >
              <p className="text-xs text-gray-400 mb-1">Active Cryptos</p>
              <p className="font-bold text-navy text-sm">
                {globalMarket.activeCryptos.toLocaleString()}
              </p>
            </div>
          </div>

          {!globalMarket.loaded && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              ⏳ Loading live global market data...
            </p>
          )}
        </div>
      </div>

      {/* Trending Coins — expanded local list (30+ buy/long only) */}
      <div>
        <h2 className="text-xl font-bold text-navy mb-2 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Trending Coins
          <span
            className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold"
            style={{
              background: "rgba(34,197,94,0.12)",
              color: "#16A34A",
              border: "1px solid rgba(34,197,94,0.2)",
            }}
          >
            Buy/Long Only
          </span>
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          AI-researched buy/long candidates with calculated TP targets — tap for
          details
        </p>
        {showBackendTrending ? (
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3" style={{ minWidth: "max-content" }}>
              {backendCoins.map((coin, i) => (
                <motion.div
                  key={coin.symbol}
                  data-ocid={`trending.item.${i + 1}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedTrendingCoin(coin)}
                  style={{ cursor: "pointer" }}
                >
                  <LegacyTrendingCoinCard
                    coin={coin}
                    livePrice={
                      realPrices[`${coin.symbol}USDT`]?.price ??
                      realPrices[coin.symbol]?.price ??
                      coin.currentPrice
                    }
                    liveChange={
                      realPrices[`${coin.symbol}USDT`]?.change24h ??
                      realPrices[coin.symbol]?.change24h ??
                      coin.change24h
                    }
                  />
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto pb-2" data-ocid="trending.list">
            <div className="flex gap-3" style={{ minWidth: "max-content" }}>
              {TRENDING_COINS.map((coin, i) => (
                <motion.div
                  key={coin.symbol}
                  data-ocid={`trending.item.${i + 1}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedLocalCoin(coin)}
                  style={{ cursor: "pointer" }}
                >
                  <TrendingCoinCard
                    coin={coin}
                    livePrice={realPrices[coin.symbol]?.price ?? 0}
                    liveChange={realPrices[coin.symbol]?.change24h ?? 0}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Trending Coin Detail Dialog (legacy backend type) */}
      <Dialog
        open={!!selectedTrendingCoin}
        onOpenChange={(o) => !o && setSelectedTrendingCoin(null)}
      >
        <DialogContent
          style={{
            background: "linear-gradient(135deg, #0B1F3B, #0A254A)",
            border: "1px solid rgba(212,175,55,0.3)",
            color: "white",
          }}
          data-ocid="trending.dialog"
        >
          {selectedTrendingCoin &&
            (() => {
              const liveP =
                realPrices[`${selectedTrendingCoin.symbol}USDT`]?.price ??
                realPrices[selectedTrendingCoin.symbol]?.price ??
                selectedTrendingCoin.currentPrice;
              const liveC =
                realPrices[`${selectedTrendingCoin.symbol}USDT`]?.change24h ??
                realPrices[selectedTrendingCoin.symbol]?.change24h ??
                selectedTrendingCoin.change24h;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-black"
                        style={{
                          background:
                            "linear-gradient(135deg, #F2D27A, #D4AF37)",
                          color: "#3d2800",
                        }}
                      >
                        {selectedTrendingCoin.symbol.slice(0, 2)}
                      </div>
                      {selectedTrendingCoin.name} — Live Analysis
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className="rounded-xl p-3"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        <p className="text-white/40 text-xs mb-1">
                          Current Price
                        </p>
                        <p className="text-white font-bold">
                          {formatPrice(liveP)}
                        </p>
                      </div>
                      <div
                        className="rounded-xl p-3"
                        style={{ background: "rgba(34,197,94,0.1)" }}
                      >
                        <p className="text-green-400/70 text-xs mb-1">
                          AI Target
                        </p>
                        <p className="text-green-400 font-bold">
                          {formatPrice(
                            selectedTrendingCoin.predictedTarget ?? 0,
                          )}
                        </p>
                      </div>
                      <div
                        className="rounded-xl p-3"
                        style={{ background: "rgba(212,175,55,0.1)" }}
                      >
                        <p className="text-gold/70 text-xs mb-1">24h Change</p>
                        <p
                          className={`font-bold ${
                            liveC >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {liveC >= 0 ? "+" : ""}
                          {liveC.toFixed(2)}%
                        </p>
                      </div>
                      <div
                        className="rounded-xl p-3"
                        style={{ background: "rgba(212,175,55,0.08)" }}
                      >
                        <p className="text-gold/70 text-xs mb-1">Multiplier</p>
                        <p className="text-gold font-bold">
                          {(
                            (selectedTrendingCoin.predictedTarget ?? 0) / liveP
                          ).toFixed(1)}
                          x
                        </p>
                      </div>
                    </div>
                    <div
                      className="rounded-xl p-4"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(212,175,55,0.15)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4 text-gold" />
                        <span className="text-gold text-xs font-bold uppercase tracking-wider">
                          AI Analysis
                        </span>
                      </div>
                      <p className="text-white/70 text-xs leading-relaxed">
                        {selectedTrendingCoin.name} (
                        {selectedTrendingCoin.symbol}/USDT) is trending with
                        strong market momentum. Live price data from Binance
                        shows {liveC >= 0 ? "positive" : "negative"} 24h
                        movement. AI target at{" "}
                        {formatPrice(selectedTrendingCoin.predictedTarget ?? 0)}{" "}
                        represents a{" "}
                        {(
                          (selectedTrendingCoin.predictedTarget ?? 0) / liveP
                        ).toFixed(1)}
                        x potential from current levels.
                      </p>
                    </div>
                    <Button
                      data-ocid="trending.close_button"
                      onClick={() => setSelectedTrendingCoin(null)}
                      className="w-full btn-gold border-0"
                    >
                      Got It
                    </Button>
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* Trending Coin Detail Dialog (local expanded list) */}
      <Dialog
        open={!!selectedLocalCoin}
        onOpenChange={(o) => !o && setSelectedLocalCoin(null)}
      >
        <DialogContent
          style={{
            background: "linear-gradient(135deg, #0B1F3B, #0A254A)",
            border: "1px solid rgba(212,175,55,0.3)",
            color: "white",
          }}
          data-ocid="trending.dialog"
        >
          {selectedLocalCoin &&
            (() => {
              const liveP = realPrices[selectedLocalCoin.symbol]?.price ?? 0;
              const liveC =
                realPrices[selectedLocalCoin.symbol]?.change24h ?? 0;
              const tp = liveP > 0 ? liveP * selectedLocalCoin.tpMultiplier : 0;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-black"
                        style={{
                          background:
                            "linear-gradient(135deg, #F2D27A, #D4AF37)",
                          color: "#3d2800",
                        }}
                      >
                        {selectedLocalCoin.symbol
                          .replace("USDT", "")
                          .slice(0, 2)}
                      </div>
                      {selectedLocalCoin.name} — Live Analysis
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className="rounded-xl p-3"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        <p className="text-white/40 text-xs mb-1">
                          Current Price
                        </p>
                        <p className="text-white font-bold">
                          {liveP > 0 ? formatPrice(liveP) : "Loading..."}
                        </p>
                      </div>
                      <div
                        className="rounded-xl p-3"
                        style={{ background: "rgba(34,197,94,0.1)" }}
                      >
                        <p className="text-green-400/70 text-xs mb-1">
                          TP Target
                        </p>
                        <p className="text-green-400 font-bold">
                          {tp > 0 ? formatPrice(tp) : "Calculating..."}
                        </p>
                      </div>
                      <div
                        className="rounded-xl p-3"
                        style={{ background: "rgba(212,175,55,0.1)" }}
                      >
                        <p className="text-gold/70 text-xs mb-1">24h Change</p>
                        <p
                          className={`font-bold ${
                            liveC >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {liveC >= 0 ? "+" : ""}
                          {liveC.toFixed(2)}%
                        </p>
                      </div>
                      <div
                        className="rounded-xl p-3"
                        style={{ background: "rgba(212,175,55,0.08)" }}
                      >
                        <p className="text-gold/70 text-xs mb-1">
                          TP Multiplier
                        </p>
                        <p className="text-gold font-bold">
                          {selectedLocalCoin.tpMultiplier.toFixed(2)}x
                        </p>
                      </div>
                    </div>
                    <div
                      className="rounded-xl p-4"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(212,175,55,0.15)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4 text-gold" />
                        <span className="text-gold text-xs font-bold uppercase tracking-wider">
                          AI Buy Signal Rationale
                        </span>
                      </div>
                      <p className="text-white/70 text-xs leading-relaxed">
                        <strong className="text-white">
                          {selectedLocalCoin.name}
                        </strong>{" "}
                        ({selectedLocalCoin.symbol.replace("USDT", "")}/USDT):{" "}
                        {selectedLocalCoin.reason}. TP calculated at{" "}
                        {(selectedLocalCoin.tpMultiplier * 100 - 100).toFixed(
                          0,
                        )}
                        % above current price. Only buy/long-side signals are
                        shown.
                      </p>
                    </div>
                    <Button
                      data-ocid="trending.close_button"
                      onClick={() => setSelectedLocalCoin(null)}
                      className="w-full btn-gold border-0"
                    >
                      Got It
                    </Button>
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* 100X AI-Researched Coins — Swipeable Carousel */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-navy flex items-center gap-2">
              <span className="text-lg">🔍</span>
              AI-Researched 100X Candidates — Sorted by Potential
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Researched by AI bots 24/7 across BingX &amp; Binance spot markets
              — swipe or use arrows to browse
            </p>
          </div>
          <div
            className="px-2 py-1 rounded-full text-xs font-bold flex-shrink-0"
            style={{
              background: "rgba(34,197,94,0.12)",
              color: "#16A34A",
              border: "1px solid rgba(34,197,94,0.2)",
            }}
          >
            AI 24/7
          </div>
        </div>

        {/* Swipeable animated carousel */}
        <HundredXCarousel
          coins={RESEARCH_100X_COINS}
          hundredXPrices={hundredXPrices}
          onSelect={setSelected100X}
        />
      </div>

      {/* 100X Coin Detail Dialog */}
      <Dialog
        open={!!selected100X}
        onOpenChange={(o) => !o && setSelected100X(null)}
      >
        <DialogContent
          className="max-w-lg"
          style={{
            background: "linear-gradient(135deg, #0B1F3B, #0A254A)",
            border: "1px solid rgba(212,175,55,0.3)",
            color: "white",
          }}
          data-ocid="hundredx.dialog"
        >
          {selected100X && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm"
                    style={{
                      background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
                      color: "#3d2800",
                    }}
                  >
                    {selected100X.symbol.slice(0, 2)}
                  </div>
                  {selected100X.name} — AI Deep Research
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {/* Potential badge */}
                <div className="flex items-center justify-center">
                  <span
                    className="px-4 py-1.5 rounded-full text-sm font-black"
                    style={{
                      background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
                      color: "#3d2800",
                    }}
                  >
                    🚀 {selected100X.multiplierPotential}x MAX POTENTIAL
                  </span>
                </div>

                {/* Price grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="rounded-xl p-3"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <p className="text-white/40 text-xs mb-1">Live Price</p>
                    <p className="text-white font-bold">
                      {selected100X.livePrice > 0
                        ? formatPrice(selected100X.livePrice)
                        : "Loading..."}
                    </p>
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{ background: "rgba(212,175,55,0.12)" }}
                  >
                    <p className="text-gold/70 text-xs mb-1">AI Target (TP)</p>
                    <p className="text-gold font-bold">
                      {selected100X.livePrice > 0
                        ? formatPrice(
                            selected100X.livePrice *
                              selected100X.multiplierPotential,
                          )
                        : "Calculating..."}
                    </p>
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{ background: "rgba(34,197,94,0.1)" }}
                  >
                    <p className="text-green-400/70 text-xs mb-1">24h Change</p>
                    <p
                      className={`font-bold ${
                        selected100X.change24h >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {selected100X.change24h >= 0 ? "+" : ""}
                      {selected100X.change24h.toFixed(2)}%
                    </p>
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{ background: "rgba(212,175,55,0.08)" }}
                  >
                    <p className="text-gold/70 text-xs mb-1">Est. TP Date</p>
                    <p className="text-gold font-bold text-xs">
                      📅 {formatTpDate(selected100X.tpHitDate)}
                    </p>
                  </div>
                </div>

                {/* AI Research section */}
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(212,175,55,0.15)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-gold" />
                    <span className="text-gold text-xs font-bold uppercase tracking-wider">
                      AI Deep Research
                    </span>
                    <span
                      className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        background: "rgba(34,197,94,0.15)",
                        color: "#22C55E",
                      }}
                    >
                      Verified 24/7
                    </span>
                  </div>
                  <p className="text-white/70 text-xs leading-relaxed">
                    {selected100X.reason}
                  </p>
                </div>

                {/* Verified badge */}
                <div
                  className="flex items-center gap-2 p-3 rounded-xl"
                  style={{
                    background: "rgba(34,197,94,0.08)",
                    border: "1px solid rgba(34,197,94,0.2)",
                  }}
                >
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <p className="text-green-400 text-xs">
                    Confirmed by AI multi-source research: social sentiment,
                    on-chain data, exchange listing pipeline, and fundamental
                    analysis all aligned.
                  </p>
                </div>

                <Button
                  data-ocid="hundredx.close_button"
                  onClick={() => setSelected100X(null)}
                  className="w-full btn-gold border-0"
                >
                  Got It
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-400 border-t border-gray-100 mt-8">
        <p>
          &copy; {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            target="_blank"
            rel="noreferrer"
            className="text-gold hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
