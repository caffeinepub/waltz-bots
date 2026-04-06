import { Badge } from "@/components/ui/badge";
import { Brain, Clock, ExternalLink, Filter, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

type NewsCategory = "All" | "Market" | "DeFi" | "Regulation" | "Technology";

interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  aiInsight: string;
  category: Exclude<NewsCategory, "All">;
  source: string;
  timestamp: Date;
  aiAccuracy: number;
}

const MOCK_ARTICLES: NewsArticle[] = [
  {
    id: "1",
    headline: "Bitcoin ETF Inflows Surpass $1.2B in Single Day Record",
    summary:
      "BlackRock's IBIT and Fidelity's FBTC lead unprecedented institutional demand as BTC eyes new all-time highs. Daily net inflow surpassed previous record by 34%.",
    aiInsight:
      "This level of institutional inflow historically precedes a 15-25% price move within 2-3 weeks. AI model rates this as a strong bullish catalyst.",
    category: "Market",
    source: "CoinDesk",
    timestamp: new Date(Date.now() - 900000),
    aiAccuracy: 96,
  },
  {
    id: "2",
    headline: "Ethereum Layer-2 Ecosystem Hits $45B TVL Milestone",
    summary:
      "Arbitrum, Optimism, and Base collectively surpass record total value locked. DeFi activity on L2 networks outpaces mainnet for third consecutive month.",
    aiInsight:
      "L2 TVL growth directly correlates with ETH demand. AI analysis predicts ETH price appreciation of 12-18% over next 30 days based on this metric.",
    category: "DeFi",
    source: "The Block",
    timestamp: new Date(Date.now() - 2700000),
    aiAccuracy: 94,
  },
  {
    id: "3",
    headline: "SEC Greenlights Spot Ethereum ETF Applications",
    summary:
      "Regulatory green light opens the door for mainstream Ethereum investment vehicles. Eight asset managers receive approval simultaneously in landmark decision.",
    aiInsight:
      "Regulatory clarity is the single biggest price catalyst for ETH. AI signals a high-confidence BUY opportunity based on ETF approval pattern analysis.",
    category: "Regulation",
    source: "Reuters",
    timestamp: new Date(Date.now() - 5400000),
    aiAccuracy: 97,
  },
  {
    id: "4",
    headline: "Solana DEX Volume Surpasses Ethereum For First Time",
    summary:
      "Solana-based decentralized exchanges processed $4.2B in 24h volume, edging out Ethereum's $3.8B in a historic milestone for the high-speed blockchain.",
    aiInsight:
      "Competitive pressure on ETH but bullish for SOL ecosystem. AI notes this could trigger a rotation trade with SOL outperforming over 2-4 weeks.",
    category: "DeFi",
    source: "CryptoSlate",
    timestamp: new Date(Date.now() - 8100000),
    aiAccuracy: 92,
  },
  {
    id: "5",
    headline: "MiCA Regulation Takes Full Effect Across EU Markets",
    summary:
      "The Markets in Crypto-Assets regulation now applies to all 27 EU member states, bringing standardized rules for crypto asset service providers across Europe.",
    aiInsight:
      "Regulatory clarity in EU typically leads to increased institutional participation. AI models show 78% of past regulatory frameworks increased market cap within 6 months.",
    category: "Regulation",
    source: "Financial Times",
    timestamp: new Date(Date.now() - 12600000),
    aiAccuracy: 89,
  },
  {
    id: "6",
    headline: "Chainlink CCIP Integration Reaches 100+ Blockchain Networks",
    summary:
      "Chainlink's Cross-Chain Interoperability Protocol now connects over 100 networks, cementing its position as the backbone of Web3 infrastructure.",
    aiInsight:
      "Network effect acceleration for LINK. Each integration compounds demand. AI technical analysis shows LINK breakout pattern forming with 96% confidence.",
    category: "Technology",
    source: "Decrypt",
    timestamp: new Date(Date.now() - 18000000),
    aiAccuracy: 95,
  },
  {
    id: "7",
    headline: "Polkadot Parachain Auctions See Record Bidding Activity",
    summary:
      "DOT locked in parachain auctions reaches all-time high as 47 new projects compete for slots. Developer activity on Polkadot up 210% quarter-over-quarter.",
    aiInsight:
      "Increasing DOT locked reduces circulating supply. AI calculates this is equivalent to a 22% supply shock with bullish price implications.",
    category: "Technology",
    source: "CoinTelegraph",
    timestamp: new Date(Date.now() - 24000000),
    aiAccuracy: 91,
  },
  {
    id: "8",
    headline: "Total Crypto Market Cap Surpasses $3 Trillion",
    summary:
      "Global crypto market reaches historic milestone driven by Bitcoin ETF flows, altcoin season signals, and growing retail participation across emerging markets.",
    aiInsight:
      "$3T market cap represents an inflection point. Historical data shows markets rarely retrace more than 15% from this level before continuing upward.",
    category: "Market",
    source: "Bloomberg",
    timestamp: new Date(Date.now() - 32400000),
    aiAccuracy: 93,
  },
];

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const CATEGORY_COLORS: Record<Exclude<NewsCategory, "All">, string> = {
  Market: "#2F6FED",
  DeFi: "#8B5CF6",
  Regulation: "#EF4444",
  Technology: "#22C55E",
};

function NewsCard({ article }: { article: NewsArticle }) {
  const catColor = CATEGORY_COLORS[article.category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 hover:-translate-y-0.5 transition-transform"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${catColor}15`, color: catColor }}
            >
              {article.category}
            </span>
            <span className="text-xs text-gray-400">{article.source}</span>
          </div>
          <h3 className="font-bold text-navy text-sm leading-snug">
            {article.headline}
          </h3>
        </div>
        <ExternalLink className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
      </div>

      <p className="text-gray-500 text-xs leading-relaxed mb-3">
        {article.summary}
      </p>

      {/* AI Insight */}
      <div
        className="rounded-xl p-3 mb-3"
        style={{
          background:
            "linear-gradient(135deg, rgba(212,175,55,0.06), rgba(212,175,55,0.02))",
          border: "1px solid rgba(212,175,55,0.15)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-3.5 h-3.5 text-gold" />
          <span className="text-gold text-xs font-bold uppercase tracking-wider">
            AI Insight
          </span>
        </div>
        <p className="text-gray-600 text-xs leading-relaxed">
          {article.aiInsight}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-gray-400 text-xs">
          <Clock className="w-3 h-3" />
          <span>{timeAgo(article.timestamp)}</span>
        </div>
        <Badge
          className="text-xs"
          style={{
            background: "rgba(34,197,94,0.12)",
            color: "#16A34A",
            border: "1px solid rgba(34,197,94,0.2)",
          }}
        >
          AI Verified: {article.aiAccuracy}% accurate
        </Badge>
      </div>
    </motion.div>
  );
}

export function NewsPage() {
  const [filter, setFilter] = useState<NewsCategory>("All");
  const [countdown, setCountdown] = useState(300); // 5 min
  const [articles, setArticles] = useState<NewsArticle[]>(MOCK_ARTICLES);
  const [refreshCount, setRefreshCount] = useState(0);

  // Countdown timer
  useEffect(() => {
    const t = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // "Refresh" articles (shuffle and add slight variation)
          setArticles((a) =>
            [...a]
              .sort(() => Math.random() - 0.5)
              .map((art) => ({
                ...art,
                timestamp: new Date(art.timestamp.getTime() + 300000),
                aiAccuracy: Math.min(
                  99,
                  art.aiAccuracy + Math.floor((Math.random() - 0.3) * 2),
                ),
              })),
          );
          setRefreshCount((r) => r + 1);
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  const filtered =
    filter === "All" ? articles : articles.filter((a) => a.category === filter);

  return (
    <div className="space-y-6" data-ocid="news.page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy font-display flex items-center gap-3">
            <span className="live-dot w-3 h-3 rounded-full bg-green-500" />
            Crypto News
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            AI-verified news updates with market analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{
              background: "rgba(34,197,94,0.1)",
              color: "#16A34A",
              border: "1px solid rgba(34,197,94,0.2)",
            }}
          >
            <RefreshCw className="w-3 h-3" />
            Next update in: {mins}m {secs.toString().padStart(2, "0")}s
          </div>
          {refreshCount > 0 && (
            <Badge className="bg-gold/20 text-gold border-gold/30 text-xs">
              {refreshCount} refresh{refreshCount > 1 ? "es" : ""}
            </Badge>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap" data-ocid="news.tab">
        {(
          [
            "All",
            "Market",
            "DeFi",
            "Regulation",
            "Technology",
          ] as NewsCategory[]
        ).map((f) => (
          <button
            key={f}
            type="button"
            data-ocid={`news.${f.toLowerCase()}.tab`}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-full text-xs font-bold transition-all"
            style={
              filter === f
                ? {
                    background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
                    color: "#3d2800",
                  }
                : { background: "rgba(11,31,59,0.07)", color: "#4B5563" }
            }
          >
            {f}
          </button>
        ))}
      </div>

      {/* AI accuracy banner */}
      <div
        className="flex items-center gap-3 p-3 rounded-xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.03))",
          border: "1px solid rgba(212,175,55,0.2)",
        }}
      >
        <Brain className="w-5 h-5 text-gold" />
        <div>
          <p className="text-navy text-xs font-bold">
            AI News Analysis Engine Active
          </p>
          <p className="text-gray-500 text-xs">
            Cross-referencing {filtered.length} articles across 47 crypto news
            sources. Average accuracy:{" "}
            {Math.round(
              articles.reduce((a, b) => a + b.aiAccuracy, 0) / articles.length,
            )}
            %
          </p>
        </div>
        <Filter className="w-4 h-4 text-gold ml-auto" />
      </div>

      {/* Articles grid */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        data-ocid="news.list"
      >
        {filtered.map((article, i) => (
          <div
            key={`${article.id}-${refreshCount}`}
            data-ocid={`news.item.${i + 1}`}
          >
            <NewsCard article={article} />
          </div>
        ))}
      </div>
    </div>
  );
}
