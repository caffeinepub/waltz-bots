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
import { useLivePricesLegacy as useLivePrices } from "@/hooks/useMarketData";
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
  sector: string;
  multiplierPotential: number;
  currentPriceRef: number;
  targetPrice: number;
  reason: string;
  tpHitDate: string;
  catalyst: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  atHPercentBelow: number;
}

type HundredXSectorFilter =
  | "All"
  | "Meme"
  | "AI/DePIN"
  | "DeFi"
  | "Layer 1"
  | "Layer 2"
  | "RWA";

const SECTOR_FILTER_MAP: Record<HundredXSectorFilter, string[]> = {
  All: [],
  Meme: ["Meme Coin", "Meme Ecosystem"],
  "AI/DePIN": ["AI Protocol", "AI Agents", "AI / DePIN"],
  DeFi: [
    "DeFi / Layer 1",
    "DeFi / Perpetuals",
    "DeFi / Yield",
    "Oracle / DeFi",
    "Oracle / DeFi Infrastructure",
    "Liquid Staking / Solana",
    "DEX Aggregator / Solana",
    "Cross-Chain Bridge",
    "Restaking / Ethereum",
  ],
  "Layer 1": [
    "Layer 1",
    "Layer 1 / AI",
    "Layer 1 / Trading",
    "Layer 0 / Interop",
    "Layer 0 / IBC",
  ],
  "Layer 2": [
    "Layer 2",
    "Layer 2 / ZK",
    "Layer 2 / Privacy",
    "Modular Blockchain / DA",
  ],
  RWA: ["RWA / DeFi", "Gaming / P2E"],
};

const SECTOR_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  "Meme Coin": { bg: "rgba(236,72,153,0.18)", text: "#DB2777" },
  "Meme Ecosystem": { bg: "rgba(236,72,153,0.18)", text: "#DB2777" },
  "AI Protocol": { bg: "rgba(139,92,246,0.18)", text: "#7C3AED" },
  "AI Agents": { bg: "rgba(139,92,246,0.18)", text: "#7C3AED" },
  "AI / DePIN": { bg: "rgba(139,92,246,0.18)", text: "#7C3AED" },
  "DeFi / Layer 1": { bg: "rgba(34,197,94,0.18)", text: "#16A34A" },
  "DeFi / Perpetuals": { bg: "rgba(34,197,94,0.18)", text: "#16A34A" },
  "DeFi / Yield": { bg: "rgba(34,197,94,0.18)", text: "#16A34A" },
  "Oracle / DeFi": { bg: "rgba(34,197,94,0.18)", text: "#16A34A" },
  "Oracle / DeFi Infrastructure": {
    bg: "rgba(34,197,94,0.18)",
    text: "#16A34A",
  },
  "Liquid Staking / Solana": { bg: "rgba(34,197,94,0.18)", text: "#16A34A" },
  "DEX Aggregator / Solana": { bg: "rgba(34,197,94,0.18)", text: "#16A34A" },
  "Cross-Chain Bridge": { bg: "rgba(34,197,94,0.18)", text: "#16A34A" },
  "Restaking / Ethereum": { bg: "rgba(34,197,94,0.18)", text: "#16A34A" },
  "Layer 1": { bg: "rgba(59,130,246,0.18)", text: "#2563EB" },
  "Layer 1 / AI": { bg: "rgba(59,130,246,0.18)", text: "#2563EB" },
  "Layer 1 / Trading": { bg: "rgba(59,130,246,0.18)", text: "#2563EB" },
  "Layer 0 / Interop": { bg: "rgba(59,130,246,0.18)", text: "#2563EB" },
  "Layer 0 / IBC": { bg: "rgba(59,130,246,0.18)", text: "#2563EB" },
  "Layer 2": { bg: "rgba(20,184,166,0.18)", text: "#0D9488" },
  "Layer 2 / ZK": { bg: "rgba(20,184,166,0.18)", text: "#0D9488" },
  "Layer 2 / Privacy": { bg: "rgba(20,184,166,0.18)", text: "#0D9488" },
  "Modular Blockchain / DA": { bg: "rgba(20,184,166,0.18)", text: "#0D9488" },
  "RWA / DeFi": { bg: "rgba(245,158,11,0.18)", text: "#D97706" },
  "Gaming / P2E": { bg: "rgba(239,68,68,0.18)", text: "#DC2626" },
};

const RESEARCH_100X_COINS: Research100XCoin[] = [
  {
    symbol: "PEPE",
    name: "Pepe the Frog",
    sector: "Meme Coin",
    multiplierPotential: 150,
    currentPriceRef: 0.0000088,
    targetPrice: 0.00132,
    reason:
      "The most viral meme coin on Ethereum with top-50 market cap and massive retail holder base. PEPE has demonstrated extraordinary viral momentum and has established itself as the definitive Ethereum meme coin benchmark. During peak bull cycles, meme coins with established brand recognition historically deliver 100-200x from cycle lows.",
    tpHitDate: "15/09/2026",
    catalyst: "Ethereum ETF approval + meme supercycle momentum",
    riskLevel: "HIGH",
    atHPercentBelow: 72,
  },
  {
    symbol: "BONK",
    name: "Bonk",
    sector: "Meme Coin",
    multiplierPotential: 140,
    currentPriceRef: 0.0000155,
    targetPrice: 0.00217,
    reason:
      "Solana's flagship community meme coin with massive airdrop-driven distribution and deep integration in the Solana ecosystem. BONK is the standard meme coin unit for Solana DeFi, NFT marketplaces, and dApps. Solana's dominance growth directly amplifies BONK's utility and speculative premium.",
    tpHitDate: "22/10/2026",
    catalyst: "Solana ecosystem expansion + DeFi integration deepening",
    riskLevel: "HIGH",
    atHPercentBelow: 80,
  },
  {
    symbol: "WIF",
    name: "dogwifhat",
    sector: "Meme Coin",
    multiplierPotential: 120,
    currentPriceRef: 0.78,
    targetPrice: 93.6,
    reason:
      "The fastest meme coin to reach $1B market cap in crypto history, riding Solana's viral meme supercycle. WIF captured mainstream attention with zero utility positioning as pure cultural momentum. With Solana's continued growth and institutional interest in meme coins as a new asset class, WIF targets a 10-15x from current compressed levels.",
    tpHitDate: "18/11/2026",
    catalyst: "Meme coin ETF speculation + Solana ETF approval pipeline",
    riskLevel: "HIGH",
    atHPercentBelow: 83,
  },
  {
    symbol: "SHIB",
    name: "Shiba Inu",
    sector: "Meme Ecosystem",
    multiplierPotential: 100,
    currentPriceRef: 0.0000127,
    targetPrice: 0.00127,
    reason:
      "SHIB has evolved beyond meme coin status with Shibarium L2 launch, ShibaSwap DEX, and a burning mechanism reducing supply. The 600+ trillion token supply creates psychology for retail adoption at micro-price levels. SHIB's Shibarium ecosystem now processes millions of transactions, building real utility under the meme brand.",
    tpHitDate: "30/11/2026",
    catalyst:
      "Shibarium L2 adoption + token burn acceleration + Robinhood listing expansion",
    riskLevel: "HIGH",
    atHPercentBelow: 90,
  },
  {
    symbol: "FLOKI",
    name: "FLOKI",
    sector: "Meme Ecosystem",
    multiplierPotential: 110,
    currentPriceRef: 0.0000685,
    targetPrice: 0.007535,
    reason:
      "FLOKI has successfully transitioned from Elon-inspired meme coin to a fully developed ecosystem with Valhalla metaverse game, FlokiFi DeFi suite, and TokenFi launchpad. The upcoming Valhalla mainnet launch is a major catalyst as gaming assets become tradeable. FLOKI targets market cap parity with SHIB within 2 years.",
    tpHitDate: "05/01/2027",
    catalyst: "Valhalla metaverse mainnet launch + TokenFi product launches",
    riskLevel: "HIGH",
    atHPercentBelow: 85,
  },
  {
    symbol: "INJ",
    name: "Injective",
    sector: "DeFi / Layer 1",
    multiplierPotential: 30,
    currentPriceRef: 8.4,
    targetPrice: 252,
    reason:
      "Injective is the world's fastest Layer 1 blockchain purpose-built for decentralized finance, processing over 25,000 TPS with zero gas fees. Its on-chain derivatives market has surpassed $1.5B in volume. INJ trades 90%+ below its ATH of $52 with ecosystem TVL growing 400% YoY, making it severely undervalued relative to fundamentals.",
    tpHitDate: "14/07/2026",
    catalyst:
      "DeFi derivatives market expansion + $150M ecosystem fund deployment",
    riskLevel: "MEDIUM",
    atHPercentBelow: 92,
  },
  {
    symbol: "RENDER",
    name: "Render",
    sector: "AI / DePIN",
    multiplierPotential: 25,
    currentPriceRef: 2.8,
    targetPrice: 70,
    reason:
      "Render Network is the leading decentralized GPU computing marketplace, directly benefiting from the global AI compute demand explosion. With Hollywood studios, AI companies, and content creators all competing for GPU capacity, RENDER's tokenized compute marketplace positions it at the intersection of AI and blockchain—two of the hottest sectors.",
    tpHitDate: "20/06/2026",
    catalyst:
      "AI compute demand explosion + Apple Vision Pro content creation wave + major studio partnerships",
    riskLevel: "MEDIUM",
    atHPercentBelow: 78,
  },
  {
    symbol: "TAO",
    name: "Bittensor",
    sector: "AI Protocol",
    multiplierPotential: 20,
    currentPriceRef: 210,
    targetPrice: 4200,
    reason:
      "Bittensor is the first truly decentralized AI network, enabling competing AI models to be trained and validated on-chain. Following its first-ever halving in December 2025 which reduced new TAO emissions by 50%, the supply shock combined with institutional AI narrative creates an exceptional asymmetric opportunity. TAO is the only credible decentralized alternative to OpenAI.",
    tpHitDate: "28/08/2026",
    catalyst:
      "TAO halving supply shock + decentralized AI narrative + subnet ecosystem explosion",
    riskLevel: "MEDIUM",
    atHPercentBelow: 75,
  },
  {
    symbol: "FET",
    name: "Fetch.ai",
    sector: "AI Agents",
    multiplierPotential: 20,
    currentPriceRef: 0.68,
    targetPrice: 13.6,
    reason:
      "Fetch.ai is the pioneer AI agent protocol, enabling autonomous economic agents (AEAs) to perform tasks, negotiate, and transact on-chain. As part of the ASI Alliance merger with Ocean Protocol and SingularityNET, FET is evolving into the Artificial Superintelligence token (ASI). The AI agent narrative is the fastest-growing crypto vertical with institutional demand accelerating.",
    tpHitDate: "30/06/2026",
    catalyst:
      "ASI token merger + AI agent mass deployment + enterprise AI partnership announcements",
    riskLevel: "MEDIUM",
    atHPercentBelow: 80,
  },
  {
    symbol: "SEI",
    name: "Sei",
    sector: "Layer 1 / Trading",
    multiplierPotential: 20,
    currentPriceRef: 0.21,
    targetPrice: 4.2,
    reason:
      "Sei is the first blockchain purpose-built for trading, featuring a built-in central limit order book (CLOB), twin turbo consensus, and parallelized EVM. Sei V2's EVM compatibility has unlocked a wave of Ethereum DeFi migrations seeking faster execution. With sub-400ms finality and sector-specific optimizations, Sei is positioned as the exchange chain of the next bull market.",
    tpHitDate: "15/09/2026",
    catalyst:
      "Sei V2 EVM migration + institutional trading platform deployments + order flow from centralized exchanges",
    riskLevel: "HIGH",
    atHPercentBelow: 85,
  },
  {
    symbol: "JTO",
    name: "Jito",
    sector: "Liquid Staking / Solana",
    multiplierPotential: 20,
    currentPriceRef: 1.75,
    targetPrice: 35,
    reason:
      "Jito is Solana's leading liquid staking and MEV (Maximum Extractable Value) protocol, controlling 40%+ of all Solana staked value through jitoSOL. Jito's MEV bundles process 95% of Solana's block space, generating hundreds of millions in annual revenue. With Solana's institutional adoption accelerating and staking yields attractive, Jito's governance token is deeply undervalued.",
    tpHitDate: "25/07/2026",
    catalyst:
      "Solana ETF approval + liquid staking TVL growth + MEV revenue milestone announcements",
    riskLevel: "MEDIUM",
    atHPercentBelow: 78,
  },
  {
    symbol: "PENDLE",
    name: "Pendle Finance",
    sector: "DeFi / Yield",
    multiplierPotential: 20,
    currentPriceRef: 2.15,
    targetPrice: 43,
    reason:
      "Pendle Finance invented yield tokenization, allowing users to separate and trade the principal and yield components of any yield-bearing asset. With $5B+ in TVL and integrations with Ethena, EigenLayer, and every major liquid staking protocol, Pendle has become essential infrastructure. The upcoming RWA yield tokenization market could 10x Pendle's addressable market.",
    tpHitDate: "05/07/2026",
    catalyst:
      "RWA yield tokenization + EigenLayer points market + institutional fixed-income DeFi demand",
    riskLevel: "MEDIUM",
    atHPercentBelow: 80,
  },
  {
    symbol: "ZK",
    name: "zkSync",
    sector: "Layer 2 / ZK",
    multiplierPotential: 20,
    currentPriceRef: 0.055,
    targetPrice: 1.1,
    reason:
      "zkSync Era is the pioneering ZK-EVM Layer 2 with full EVM equivalence, enabling seamless Ethereum dApp migration with cryptographic security. The ZK token launched after one of the largest airdrops in history and is down 95% from peak with the protocol processing $1B+ in weekly volume. Upcoming Elastic Network (multiple zk chains) expansion is a major catalyst.",
    tpHitDate: "25/10/2026",
    catalyst:
      "Elastic Network launch + ZK Stack chain ecosystem + enterprise ZK deployment pipeline",
    riskLevel: "HIGH",
    atHPercentBelow: 95,
  },
  {
    symbol: "STRK",
    name: "Starknet",
    sector: "Layer 2 / ZK",
    multiplierPotential: 20,
    currentPriceRef: 0.12,
    targetPrice: 2.4,
    reason:
      "Starknet is the leading ZK-rollup on Ethereum, providing the highest level of cryptographic security with STARK proof technology. As the only L2 using pure ZK-proofs (not ZK-EVMs), Starknet enables smart contract capabilities impossible elsewhere. The STRK token is down 92% from ATH with massive ecosystem incentives unlocking new protocols weekly.",
    tpHitDate: "20/10/2026",
    catalyst:
      "Starknet v0.14 performance upgrade + DeFi ecosystem incentives + ZK-proof adoption by enterprises",
    riskLevel: "HIGH",
    atHPercentBelow: 92,
  },
  {
    symbol: "SUI",
    name: "Sui",
    sector: "Layer 1",
    multiplierPotential: 15,
    currentPriceRef: 2.1,
    targetPrice: 31.5,
    reason:
      "Sui is a next-generation Layer 1 blockchain built with Move language, offering sub-second finality and parallel transaction processing. Backed by Mysten Labs (ex-Meta engineers), Sui has captured the gaming and consumer crypto narrative with 3M+ daily active addresses. Its object-centric model enables unique applications impossible on other chains.",
    tpHitDate: "10/06/2026",
    catalyst:
      "Consumer crypto adoption + gaming ecosystem launch + DeFi TVL acceleration",
    riskLevel: "MEDIUM",
    atHPercentBelow: 65,
  },
  {
    symbol: "NEAR",
    name: "NEAR Protocol",
    sector: "Layer 1 / AI",
    multiplierPotential: 15,
    currentPriceRef: 1.75,
    targetPrice: 26.25,
    reason:
      "NEAR Protocol has pivoted successfully to the AI-blockchain convergence with the NEAR AI Hub, chain abstraction technology, and the Nightshade sharding architecture enabling unlimited throughput. NEAR's chain abstraction layer allows any blockchain user to interact with NEAR apps without bridging. Down 80% from ATH with AI narrative gaining momentum.",
    tpHitDate: "22/08/2026",
    catalyst:
      "NEAR AI Hub launch + chain abstraction adoption + developer growth to 1M+ monthly",
    riskLevel: "MEDIUM",
    atHPercentBelow: 80,
  },
  {
    symbol: "OP",
    name: "Optimism",
    sector: "Layer 2",
    multiplierPotential: 15,
    currentPriceRef: 0.62,
    targetPrice: 9.3,
    reason:
      "Optimism's Superchain vision — a network of OP Stack chains including Coinbase's Base, Sony's Soneium, and dozens more — has established it as the de-facto Layer 2 standard. The OP token governs this entire network of chains with $20B+ TVL. With the upcoming Fault Proof upgrade completing decentralization and massive airdrop cycles driving demand, OP is severely undervalued.",
    tpHitDate: "18/08/2026",
    catalyst:
      "Superchain expansion + fault proof upgrade + Coinbase Base TVL growth reflecting on OP",
    riskLevel: "MEDIUM",
    atHPercentBelow: 82,
  },
  {
    symbol: "JUP",
    name: "Jupiter Exchange",
    sector: "DEX Aggregator / Solana",
    multiplierPotential: 15,
    currentPriceRef: 0.48,
    targetPrice: 7.2,
    reason:
      "Jupiter is the most used DEX aggregator on Solana, routing 95%+ of all Solana swap volume through its intelligent routing engine. With $2B+ in daily volume and the JUP governance token controlling billions in ecosystem incentives, Jupiter is the Uniswap of Solana. The upcoming Jupiter Perpetuals upgrade and launchpad expand the value capture significantly.",
    tpHitDate: "30/07/2026",
    catalyst:
      "Jupiter Perpetuals V2 launch + launchpad token sale demand + Solana DeFi TVL growth",
    riskLevel: "MEDIUM",
    atHPercentBelow: 75,
  },
  {
    symbol: "EIGEN",
    name: "EigenLayer",
    sector: "Restaking / Ethereum",
    multiplierPotential: 15,
    currentPriceRef: 1.15,
    targetPrice: 17.25,
    reason:
      "EigenLayer invented restaking — allowing ETH stakers to re-secure other protocols and earn additional yields. With $20B+ in restaked ETH and 40+ actively validated services (AVSs) built on top, EigenLayer is the most important Ethereum ecosystem addition since DeFi Summer. EIGEN is newly listed and trading far below protocol value.",
    tpHitDate: "28/09/2026",
    catalyst:
      "AVS ecosystem launch + institutional restaking strategies + EigenDA adoption by major L2s",
    riskLevel: "MEDIUM",
    atHPercentBelow: 70,
  },
  {
    symbol: "DYDX",
    name: "dYdX",
    sector: "DeFi / Perpetuals",
    multiplierPotential: 15,
    currentPriceRef: 0.42,
    targetPrice: 6.3,
    reason:
      "dYdX is the largest decentralized perpetuals exchange with $1B+ in daily volume, now running its own sovereign Cosmos-based L1 blockchain for maximum performance. The migration to dYdX Chain enables sub-second order matching, MegaVault liquidity, and full staking rewards for DYDX holders. Down 95% from ATH with protocol revenue growing.",
    tpHitDate: "10/09/2026",
    catalyst:
      "dYdX Chain MegaVault launch + institutional market maker onboarding + protocol fee buyback activation",
    riskLevel: "MEDIUM",
    atHPercentBelow: 95,
  },
  {
    symbol: "ONDO",
    name: "Ondo Finance",
    sector: "RWA / DeFi",
    multiplierPotential: 25,
    currentPriceRef: 0.55,
    targetPrice: 13.75,
    reason:
      "Ondo Finance is the leading real-world assets (RWA) protocol, tokenizing US Treasuries and institutional-grade bonds on-chain. With BlackRock, Franklin Templeton, and Goldman Sachs all entering the tokenized asset space, Ondo is the primary infrastructure layer. Over $700M in tokenized treasuries under management and growing 50% monthly.",
    tpHitDate: "10/07/2026",
    catalyst:
      "BlackRock BUIDL fund expansion + tokenized treasury market crossing $10B + institutional DeFi adoption",
    riskLevel: "MEDIUM",
    atHPercentBelow: 60,
  },
  {
    symbol: "TIA",
    name: "Celestia",
    sector: "Modular Blockchain / DA",
    multiplierPotential: 25,
    currentPriceRef: 2.8,
    targetPrice: 70,
    reason:
      "Celestia invented the modular blockchain thesis, providing pure data availability (DA) as a service. With Ethereum's EIP-4844 proving the DA market's value, Celestia is capturing rollup chains, Layer 2s, and appchains seeking cheap, scalable DA. Every new blockchain built needs data availability — Celestia is the AWS of modular blockchains.",
    tpHitDate: "20/08/2026",
    catalyst:
      "Modular blockchain adoption explosion + Ethereum DA market growth + rollup ecosystem expansion",
    riskLevel: "HIGH",
    atHPercentBelow: 88,
  },
  {
    symbol: "MANTA",
    name: "Manta Network",
    sector: "Layer 2 / Privacy",
    multiplierPotential: 25,
    currentPriceRef: 0.32,
    targetPrice: 8,
    reason:
      "Manta Network brings ZK-powered privacy to Ethereum with its Pacific L2 and Atlantic parachain. As regulatory pressure increases globally, privacy-preserving DeFi protocols are becoming essential infrastructure. Manta Pacific hosts 40+ DeFi protocols with $500M+ TVL and is the only L2 with native ZK identity and compliance features.",
    tpHitDate: "18/11/2026",
    catalyst:
      "Institutional privacy compliance requirements + ZK identity adoption + Pacific TVL growth",
    riskLevel: "HIGH",
    atHPercentBelow: 90,
  },
  {
    symbol: "AXS",
    name: "Axie Infinity",
    sector: "Gaming / P2E",
    multiplierPotential: 25,
    currentPriceRef: 2.4,
    targetPrice: 60,
    reason:
      "Axie Infinity is the pioneering play-to-earn gaming protocol that pioneered the blockchain gaming model, reaching 2.7M daily active players at peak. With the Axie Infinity: Origins mobile rebrand, free-to-play migration, and Ronin chain now hosting 300+ games beyond Axie, the ecosystem is rebuilding for the next gaming wave. AXS is down 98% from ATH presenting an extraordinary recovery potential.",
    tpHitDate: "20/12/2026",
    catalyst:
      "Axie Origins F2P growth + Ronin chain gaming expansion + Web3 gaming mainstream adoption",
    riskLevel: "HIGH",
    atHPercentBelow: 98,
  },
  {
    symbol: "APT",
    name: "Aptos",
    sector: "Layer 1",
    multiplierPotential: 12,
    currentPriceRef: 3.8,
    targetPrice: 45.6,
    reason:
      "Aptos is a high-performance Layer 1 blockchain from ex-Meta Diem engineers, offering 160,000 TPS through its Block-STM parallel execution engine. With Microsoft Azure partnership for enterprise blockchain deployment and 7M+ monthly active users, Aptos bridges traditional enterprise adoption with DeFi innovation. Down 70% from ATH with strong institutional backing.",
    tpHitDate: "15/07/2026",
    catalyst:
      "Microsoft Azure enterprise partnership + institutional DeFi pipeline + MOVE ecosystem standardization",
    riskLevel: "MEDIUM",
    atHPercentBelow: 71,
  },
  {
    symbol: "ARB",
    name: "Arbitrum",
    sector: "Layer 2",
    multiplierPotential: 12,
    currentPriceRef: 0.32,
    targetPrice: 3.84,
    reason:
      "Arbitrum One is the largest Ethereum Layer 2 by TVL ($15B+), hosting hundreds of DeFi protocols, games, and social apps. Arbitrum Orbit and Stylus enable custom EVM+ execution, attracting enterprise deployments. GMX, the largest on-chain perpetuals exchange, runs on Arbitrum generating $1B+ in fees. With ARB down 90% from ATH, the token's governance value is deeply underpriced.",
    tpHitDate: "25/08/2026",
    catalyst:
      "Arbitrum Stylus enterprise adoption + Orbit chain ecosystem + GMX V2 fee growth",
    riskLevel: "MEDIUM",
    atHPercentBelow: 90,
  },
  {
    symbol: "DOT",
    name: "Polkadot",
    sector: "Layer 0 / Interop",
    multiplierPotential: 12,
    currentPriceRef: 3.6,
    targetPrice: 43.2,
    reason:
      "Polkadot's JAM upgrade (Join-Accumulate Machine) is the most significant protocol change since launch, enabling a unified computation space that subsumes all parachains. With 1,500+ projects in the ecosystem, $1B+ in native DOT staking, and the upcoming coretime marketplace, DOT is positioned as the cross-chain interoperability standard. Down 90% from ATH.",
    tpHitDate: "12/09/2026",
    catalyst:
      "JAM upgrade deployment + coretime marketplace launch + cross-chain DeFi wave",
    riskLevel: "LOW",
    atHPercentBelow: 90,
  },
  {
    symbol: "AVAX",
    name: "Avalanche",
    sector: "Layer 1",
    multiplierPotential: 10,
    currentPriceRef: 15.5,
    targetPrice: 155,
    reason:
      "Avalanche has captured enterprise blockchain adoption with its subnets architecture, hosting Amazon Web Services, Deloitte, and multiple governments. The Avalanche9000 upgrade reduced subnet creation costs by 99.9%, enabling a wave of new institutional subnets. AVAX is down 75% from ATH with institutional adoption accelerating through AWS marketplace listing.",
    tpHitDate: "05/08/2026",
    catalyst:
      "Avalanche9000 upgrade + AWS marketplace integration + institutional subnet launches",
    riskLevel: "LOW",
    atHPercentBelow: 75,
  },
  {
    symbol: "ATOM",
    name: "Cosmos",
    sector: "Layer 0 / IBC",
    multiplierPotential: 10,
    currentPriceRef: 3.8,
    targetPrice: 38,
    reason:
      "Cosmos is the backbone of the inter-blockchain communication (IBC) protocol connecting 100+ sovereign blockchains. The ATOM Economic Zone initiatives and v3 staking upgrade significantly increase ATOM's economic value capture from the broader Cosmos ecosystem. With IBC volume surpassing $100B and DEX activity growing, ATOM's under-valuation relative to ecosystem size is extreme.",
    tpHitDate: "30/09/2026",
    catalyst:
      "ATOM 2.0 economic zone completion + IBC v2 upgrade + Cosmos Hub shared security",
    riskLevel: "LOW",
    atHPercentBelow: 87,
  },
  {
    symbol: "LINK",
    name: "Chainlink",
    sector: "Oracle / DeFi Infrastructure",
    multiplierPotential: 8,
    currentPriceRef: 8.5,
    targetPrice: 68,
    reason:
      "Chainlink is the critical infrastructure layer for all of DeFi, providing tamper-proof price feeds, verifiable random functions, and cross-chain messaging used by 90%+ of DeFi protocols. The CCIP cross-chain protocol is being adopted by Swift, DTCC, and major banks for tokenized asset settlement. LINK is down 85% from ATH with institutional adoption at an all-time high.",
    tpHitDate: "20/07/2026",
    catalyst:
      "Swift CCIP integration + tokenized assets RWA wave + LINK staking v0.2 lock-up effect",
    riskLevel: "LOW",
    atHPercentBelow: 85,
  },
  {
    symbol: "PYTH",
    name: "Pyth Network",
    sector: "Oracle / DeFi",
    multiplierPotential: 18,
    currentPriceRef: 0.085,
    targetPrice: 1.53,
    reason:
      "Pyth Network is the financial data oracle used by 90+ blockchains and 350+ DeFi protocols with sub-400ms price update speed. Unlike Chainlink's push model, Pyth uses a pull-based system where users request data on demand, enabling unprecedented precision. Over 100 institutional market makers (including Jane Street and Jump Trading) contribute data.",
    tpHitDate: "10/08/2026",
    catalyst:
      "Cross-chain DeFi expansion + institutional data contributions + perpetuals market growth",
    riskLevel: "MEDIUM",
    atHPercentBelow: 82,
  },
  {
    symbol: "W",
    name: "Wormhole",
    sector: "Cross-Chain Bridge",
    multiplierPotential: 18,
    currentPriceRef: 0.092,
    targetPrice: 1.656,
    reason:
      "Wormhole is the most battle-tested cross-chain messaging protocol, processing $50B+ in cross-chain volume for DeFi, NFT, and gaming protocols. As the crypto industry moves toward a multi-chain future, cross-chain infrastructure becomes critical backbone. Wormhole's Native Token Transfers (NTT) framework is being adopted by Uniswap, Circle, and other blue-chip protocols.",
    tpHitDate: "15/10/2026",
    catalyst:
      "NTT framework adoption + multi-chain DeFi expansion + Circle USDC native bridging integration",
    riskLevel: "MEDIUM",
    atHPercentBelow: 85,
  },
].sort(
  (a, b) => b.multiplierPotential - a.multiplierPotential,
) as Research100XCoin[];

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

function getRiskColors(risk: "LOW" | "MEDIUM" | "HIGH") {
  if (risk === "LOW")
    return {
      bg: "rgba(34,197,94,0.18)",
      text: "#16A34A",
      border: "rgba(34,197,94,0.35)",
    };
  if (risk === "MEDIUM")
    return {
      bg: "rgba(245,158,11,0.18)",
      text: "#D97706",
      border: "rgba(245,158,11,0.35)",
    };
  return {
    bg: "rgba(239,68,68,0.18)",
    text: "#DC2626",
    border: "rgba(239,68,68,0.35)",
  };
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
  const sectorColor = SECTOR_BADGE_COLORS[coin.sector] ?? {
    bg: "rgba(212,175,55,0.18)",
    text: "#B8960C",
  };
  const riskColors = getRiskColors(coin.riskLevel);

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

      {/* Row 1: multiplier + 24h change */}
      <div className="flex items-center justify-between mb-3">
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
          className={`border text-xs ${
            isUp
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : "bg-red-500/20 text-red-400 border-red-500/30"
          }`}
        >
          {isUp ? "+" : ""}
          {change24h.toFixed(1)}%
        </Badge>
      </div>

      {/* Row 2: sector + risk badges */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <span
          className="px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: sectorColor.bg, color: sectorColor.text }}
        >
          {coin.sector}
        </span>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-bold"
          style={{
            background: riskColors.bg,
            color: riskColors.text,
            border: `1px solid ${riskColors.border}`,
          }}
        >
          {coin.riskLevel} RISK
        </span>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-semibold ml-auto"
          style={{ background: "rgba(139,92,246,0.18)", color: "#7C3AED" }}
        >
          ↓{coin.atHPercentBelow}% from ATH
        </span>
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

      <p className="text-white font-bold text-center text-lg leading-tight">
        {coin.name}
      </p>
      <p className="text-gold/70 text-center text-xs mb-3">
        {coin.symbol}/USDT
      </p>

      {/* Price grid: 2x2 */}
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
              <span className="text-white/30">Loading…</span>
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
              <span className="text-gold/30">Calculating…</span>
            )}
          </p>
        </div>
        <div
          className="rounded-xl p-2.5 text-center"
          style={{ background: "rgba(212,175,55,0.08)" }}
        >
          <p className="text-gold/70 mb-0.5">Est. TP Date</p>
          <p className="text-gold font-semibold text-xs">📅 {coin.tpHitDate}</p>
        </div>
        <div
          className="rounded-xl p-2.5 text-center"
          style={{ background: riskColors.bg }}
        >
          <p
            className="mb-0.5 text-xs"
            style={{ color: riskColors.text, opacity: 0.7 }}
          >
            Max Gain
          </p>
          <p
            className="font-black text-base"
            style={{ color: riskColors.text }}
          >
            {coin.multiplierPotential}x
          </p>
        </div>
      </div>

      {/* Click indicator */}
      <p className="text-white/25 text-xs text-center mt-1">
        Tap to view full AI research →
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
  const [sectorFilter, setSectorFilter] = useState<HundredXSectorFilter>("All");
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const filteredCoins =
    sectorFilter === "All"
      ? coins
      : coins.filter((c) => SECTOR_FILTER_MAP[sectorFilter].includes(c.sector));

  // Reset to first slide when filter changes
  const handleFilterChange = (f: HundredXSectorFilter) => {
    setSectorFilter(f);
    setActiveIndex(0);
  };

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
      if (diff > 0 && activeIndex < filteredCoins.length - 1)
        setActiveIndex((i) => i + 1);
      else if (diff < 0 && activeIndex > 0) setActiveIndex((i) => i - 1);
    }
    setDragStartX(null);
    setIsDragging(false);
  };

  const prev = () => setActiveIndex((i) => Math.max(0, i - 1));
  const next = () =>
    setActiveIndex((i) => Math.min(filteredCoins.length - 1, i + 1));

  const FILTER_TABS: HundredXSectorFilter[] = [
    "All",
    "Meme",
    "AI/DePIN",
    "DeFi",
    "Layer 1",
    "Layer 2",
    "RWA",
  ];

  return (
    <div className="select-none">
      {/* Sector filter tabs */}
      <div className="overflow-x-auto pb-2 mb-4" data-ocid="hundredx.filters">
        <div className="flex gap-2" style={{ minWidth: "max-content" }}>
          {FILTER_TABS.map((tab) => {
            const isActive = sectorFilter === tab;
            const count =
              tab === "All"
                ? coins.length
                : coins.filter((c) => SECTOR_FILTER_MAP[tab].includes(c.sector))
                    .length;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => handleFilterChange(tab)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap"
                style={
                  isActive
                    ? {
                        background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
                        color: "#3d2800",
                        boxShadow: "0 2px 8px rgba(212,175,55,0.35)",
                      }
                    : {
                        background: "rgba(11,31,59,0.07)",
                        color: "#0B1F3B",
                        border: "1px solid rgba(11,31,59,0.12)",
                      }
                }
              >
                {tab}{" "}
                <span
                  className="ml-0.5 opacity-60 text-xs"
                  style={{ fontSize: "10px" }}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filteredCoins.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: "rgba(11,31,59,0.05)",
            border: "1px dashed rgba(212,175,55,0.3)",
          }}
        >
          <p className="text-gray-400 text-sm">
            No coins in this sector — check back soon.
          </p>
        </div>
      ) : (
        <div className="relative">
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
              {filteredCoins.map((coin) => {
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
                        onClick={() =>
                          onSelect({ ...coin, livePrice, change24h })
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prev arrow */}
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

          {/* Next arrow */}
          <button
            type="button"
            onClick={next}
            disabled={activeIndex === filteredCoins.length - 1}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
            style={{
              background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
              color: "#3d2800",
            }}
            data-ocid="hundredx.pagination_next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Counter only — no dot indicators per user preference */}
          <p className="text-center text-xs text-gray-400 mt-4">
            {activeIndex + 1} / {filteredCoins.length} • Swipe or use arrows
          </p>
        </div>
      )}
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
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold text-navy flex items-center gap-2">
              <span className="text-lg">🔍</span>
              AI-Researched 100X Candidates
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Researched by AI 24/7 across Binance spot markets — swipe or use
              arrows to browse
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
        {/* Coins counter */}
        <p className="text-xs text-gray-400 mb-4">
          Total coins:{" "}
          <span className="font-semibold text-navy">
            {RESEARCH_100X_COINS.length}
          </span>{" "}
          | Researched by AI 24/7
        </p>

        {/* Swipeable animated carousel with sector filters */}
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
          className="max-w-lg overflow-y-auto"
          style={{
            background: "linear-gradient(135deg, #0B1F3B, #0A254A)",
            border: "1px solid rgba(212,175,55,0.35)",
            color: "white",
            maxHeight: "90vh",
          }}
          data-ocid="hundredx.dialog"
        >
          {selected100X &&
            (() => {
              const rc = getRiskColors(selected100X.riskLevel);
              const sc = SECTOR_BADGE_COLORS[selected100X.sector] ?? {
                bg: "rgba(212,175,55,0.18)",
                text: "#B8960C",
              };
              const aiTarget =
                selected100X.livePrice > 0
                  ? selected100X.livePrice * selected100X.multiplierPotential
                  : null;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                        style={{
                          background:
                            "linear-gradient(135deg, #F2D27A, #D4AF37)",
                          color: "#3d2800",
                          boxShadow: "0 0 16px rgba(212,175,55,0.5)",
                        }}
                      >
                        {selected100X.symbol.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-bold text-base leading-tight truncate">
                          {selected100X.name}
                        </p>
                        <p className="text-gold/60 text-xs font-normal">
                          {selected100X.symbol}/USDT
                        </p>
                      </div>
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 mt-2">
                    {/* Top badges row */}
                    <div className="flex flex-wrap gap-2">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-black"
                        style={{
                          background:
                            "linear-gradient(135deg, #F2D27A, #D4AF37)",
                          color: "#3d2800",
                        }}
                      >
                        🚀 {selected100X.multiplierPotential}x MAX POTENTIAL
                      </span>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{ background: sc.bg, color: sc.text }}
                      >
                        {selected100X.sector}
                      </span>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-bold"
                        style={{
                          background: rc.bg,
                          color: rc.text,
                          border: `1px solid ${rc.border}`,
                        }}
                      >
                        {selected100X.riskLevel} RISK
                      </span>
                    </div>

                    {/* Live price grid: 2x2 */}
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className="rounded-xl p-3"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        <p className="text-white/40 text-xs mb-1">
                          Current Price
                        </p>
                        <p className="text-white font-bold text-sm">
                          {selected100X.livePrice > 0
                            ? formatPrice(selected100X.livePrice)
                            : "Loading…"}
                        </p>
                      </div>
                      <div
                        className="rounded-xl p-3"
                        style={{ background: "rgba(212,175,55,0.12)" }}
                      >
                        <p className="text-gold/70 text-xs mb-1">
                          AI 100X Target
                        </p>
                        <p className="text-gold font-bold text-sm">
                          {aiTarget !== null
                            ? formatPrice(aiTarget)
                            : "Calculating…"}
                        </p>
                      </div>
                      <div
                        className="rounded-xl p-3"
                        style={{
                          background:
                            selected100X.change24h >= 0
                              ? "rgba(34,197,94,0.1)"
                              : "rgba(239,68,68,0.1)",
                        }}
                      >
                        <p
                          className="text-xs mb-1"
                          style={{
                            color:
                              selected100X.change24h >= 0
                                ? "rgba(74,222,128,0.7)"
                                : "rgba(248,113,113,0.7)",
                          }}
                        >
                          24h Change
                        </p>
                        <p
                          className="font-bold text-sm"
                          style={{
                            color:
                              selected100X.change24h >= 0
                                ? "#4ADE80"
                                : "#F87171",
                          }}
                        >
                          {selected100X.change24h >= 0 ? "+" : ""}
                          {selected100X.change24h.toFixed(2)}%
                        </p>
                      </div>
                      <div
                        className="rounded-xl p-3"
                        style={{ background: "rgba(212,175,55,0.08)" }}
                      >
                        <p className="text-gold/70 text-xs mb-1">
                          Est. TP Date
                        </p>
                        <p className="text-gold font-bold text-xs">
                          📅 {selected100X.tpHitDate}
                        </p>
                      </div>
                    </div>

                    {/* % below ATH */}
                    <div
                      className="flex items-center gap-3 rounded-xl p-3"
                      style={{
                        background: "rgba(139,92,246,0.12)",
                        border: "1px solid rgba(139,92,246,0.25)",
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black"
                        style={{
                          background: "rgba(139,92,246,0.25)",
                          color: "#A78BFA",
                        }}
                      >
                        ↓
                      </div>
                      <div>
                        <p
                          className="text-xs font-bold"
                          style={{ color: "#A78BFA" }}
                        >
                          {selected100X.atHPercentBelow}% Below All-Time High
                        </p>
                        <p className="text-white/50 text-xs mt-0.5">
                          Historically deep discount relative to peak — maximum
                          recovery room available at current levels.
                        </p>
                      </div>
                    </div>

                    {/* AI Research reason */}
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
                      <p className="text-white/75 text-xs leading-relaxed">
                        {selected100X.reason}
                      </p>
                    </div>

                    {/* Primary catalyst */}
                    <div
                      className="rounded-xl p-3"
                      style={{
                        background: "rgba(212,175,55,0.08)",
                        border: "1px solid rgba(212,175,55,0.2)",
                      }}
                    >
                      <p className="text-gold/70 text-xs mb-1 flex items-center gap-1">
                        🚀{" "}
                        <span className="font-bold uppercase tracking-wide">
                          Primary Catalyst
                        </span>
                      </p>
                      <p className="text-white/80 text-xs leading-relaxed">
                        {selected100X.catalyst}
                      </p>
                    </div>

                    {/* AI Deep Research Verified badge */}
                    <div
                      className="flex items-center gap-2 p-3 rounded-xl"
                      style={{
                        background: "rgba(34,197,94,0.08)",
                        border: "1px solid rgba(34,197,94,0.2)",
                      }}
                    >
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <p className="text-green-400 text-xs font-semibold">
                        AI Deep Research Verified — All 5 factors confirmed
                      </p>
                    </div>

                    {/* Research confidence meter */}
                    <div
                      className="rounded-xl p-4"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(212,175,55,0.12)",
                      }}
                    >
                      <p className="text-gold text-xs font-bold uppercase tracking-wider mb-3">
                        Research Confidence Factors
                      </p>
                      {[
                        "Binance Spot Listed",
                        "Fundamental Analysis Verified",
                        "Historical Cycle Data Confirmed",
                        "Sector Momentum Positive",
                        "Market Cap Growth Room Available",
                      ].map((factor) => (
                        <div
                          key={factor}
                          className="flex items-center gap-2 mb-2 last:mb-0"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                          <span className="text-white/70 text-xs">
                            {factor}
                          </span>
                        </div>
                      ))}
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
              );
            })()}
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
