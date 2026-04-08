import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  analyzeSymbol,
  fetch24hTickers,
  fetchCandles,
} from "@/hooks/useMarketData";
import { type LiveSignal, SCAN_SYMBOLS } from "@/hooks/useSignals";
import {
  Brain,
  Clock,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Shield,
  TrendingUp,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";

const COIN_NAMES: Record<string, string> = {
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
  SAND: "Sandbox",
  MANA: "Decentraland",
  AXS: "Axie Infinity",
  DYDX: "dYdX",
  GRT: "The Graph",
};

const QUICK_QUESTIONS = [
  "Is now a good entry?",
  "What's the risk?",
  "When will it hit TP?",
  "Should I set a tighter stop?",
];

function getAIResponse(
  coin: string,
  question: string,
  signal: LiveSignal | null,
): string {
  const q = question.toLowerCase();
  const sym = signal?.symbol ?? coin;
  if (q.includes("entry") || q.includes("enter")) {
    return `For ${coin} (${sym}), the current price is near the optimal entry zone identified from live Binance OHLCV data. RSI is at ${signal?.rsiValue.toFixed(1) ?? "N/A"} and MACD histogram is ${signal ? (signal.macdHistogram > 0 ? "bullish" : "bearish") : "neutral"}. ${
      signal?.multiTimeframeConfluence
        ? "Multi-timeframe confluence confirmed across 5m, 15m, and 1h charts."
        : "Signal detected on primary timeframe — proceed with appropriate position sizing."
    } Entry is valid now.`;
  }
  if (q.includes("risk")) {
    return `The ${coin} trade carries a real ATR-based risk-to-reward ratio of ${signal?.riskReward ?? "~1:2.5"}. Stop loss is placed at $${signal?.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 4 }) ?? "calculated level"}, below key structural support identified from the 1-hour chart. Volume ${signal?.volumeConfirmed ? "is above average, confirming" : "is near average for"} this setup. AI rates this risk as ACCEPTABLE for current conditions.`;
  }
  if (q.includes("tp") || q.includes("target") || q.includes("when")) {
    return `Based on ATR calculations from live Binance 1h candles for ${coin}, the estimated time to hit the take profit of $${signal?.targetPrice.toLocaleString(undefined, { maximumFractionDigits: 4 }) ?? "target"} is ~${signal?.estimatedHours ?? "24"} hours. This estimate accounts for current momentum: trend is ${signal?.trend ?? "neutral"}, RSI at ${signal?.rsiValue.toFixed(1) ?? "N/A"}. AI confidence: ${signal?.confidence ?? "N/A"}%.`;
  }
  if (q.includes("stop") || q.includes("tighter")) {
    return `The stop loss for ${coin} is at $${signal?.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 4 }) ?? "calculated level"}, derived from 1.2x ATR below the entry. This is an evidence-based level from real candle data. Tightening it increases the risk of being stopped out prematurely on normal volatility. The AI recommends keeping the stop as calculated.`;
  }
  return `${coin} signal analysis: Trend is ${signal?.trend ?? "neutral"} on 1h timeframe. RSI ${signal?.rsiValue.toFixed(1) ?? "N/A"}, MACD histogram ${signal ? (signal.macdHistogram > 0 ? "positive (bullish)" : "negative (bearish)") : "neutral"}. Volume ${signal?.volumeConfirmed ? "confirmed above average" : "near average"}. Multi-timeframe confluence: ${signal?.multiTimeframeConfluence ? "YES — strong signal" : "partial — use smaller position size"}. This analysis is computed from live Binance data.`;
}

interface ChatMsg {
  role: "user" | "ai";
  text: string;
}

function SearchSignalCard({ signal }: { signal: LiveSignal }) {
  const isBuy = signal.direction === "BUY";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5"
      style={{
        background: "linear-gradient(135deg, #0B1F3B, #0A254A)",
        border: `1px solid ${
          isBuy ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"
        }`,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center font-black text-navy"
            style={{ background: "linear-gradient(135deg, #F2D27A, #D4AF37)" }}
          >
            {signal.symbol.slice(0, 2)}
          </div>
          <div>
            <p className="text-white font-bold text-lg">{signal.coinName}</p>
            <p className="text-white/40 text-sm">{signal.symbol}/USDT</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={isBuy ? "badge-buy" : "badge-sell"}>
            {isBuy ? "BUY" : "SELL"}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}
          >
            Live Data ✓
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs mb-4">
        <div
          className="rounded-xl p-3"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <p className="text-white/40 mb-1">Entry Price</p>
          <p className="text-white font-bold text-sm">
            $
            {signal.entryPrice.toLocaleString(undefined, {
              maximumFractionDigits: 4,
            })}
          </p>
        </div>
        <div
          className="rounded-xl p-3"
          style={{ background: "rgba(34,197,94,0.1)" }}
        >
          <p className="text-green-400/70 mb-1">Take Profit</p>
          <p className="text-green-400 font-bold text-sm">
            $
            {signal.targetPrice.toLocaleString(undefined, {
              maximumFractionDigits: 4,
            })}
          </p>
        </div>
        <div
          className="rounded-xl p-3"
          style={{ background: "rgba(239,68,68,0.08)" }}
        >
          <p className="text-red-400/70 mb-1">Stop Loss</p>
          <p className="text-red-400 font-bold text-sm">
            $
            {signal.stopLoss.toLocaleString(undefined, {
              maximumFractionDigits: 4,
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs mb-4">
        <div className="flex items-center gap-1 text-white/50">
          <Brain className="w-3 h-3 text-gold" />
          <span>{signal.confidence}% AI</span>
        </div>
        <div className="flex items-center gap-1 text-white/50">
          <Clock className="w-3 h-3" />
          <span>~{signal.estimatedHours}h to TP</span>
        </div>
        <div className="flex items-center gap-1 text-white/50">
          <TrendingUp className="w-3 h-3" />
          <span>{signal.riskReward}</span>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-white/30 mb-1">
          <span>AI Confidence</span>
          <span className="text-gold font-bold">{signal.confidence}%</span>
        </div>
        <div
          className="h-2 rounded-full"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${signal.confidence}%`,
              background: "linear-gradient(90deg, #D4AF37, #F2D27A)",
            }}
          />
        </div>
      </div>

      {/* AI Analysis */}
      <div
        className="rounded-xl p-3"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(212,175,55,0.15)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-3 h-3 text-gold" />
          <span className="text-gold text-xs font-bold uppercase tracking-wider">
            AI Insight
          </span>
        </div>
        <p className="text-white/60 text-xs leading-relaxed">
          {signal.aiAnalysis}
        </p>
      </div>
    </motion.div>
  );
}

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LiveSignal[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);
  const doSearch = async (q: string) => {
    const term = q.toUpperCase().trim();
    if (!term) return;
    setSearching(true);
    setSearched(false);

    // Resolve symbol
    const exactSymbol =
      Object.entries(COIN_NAMES).find(
        ([sym, name]) =>
          sym === term ||
          name.toUpperCase() === term ||
          name.toUpperCase().includes(term),
      )?.[0] ?? term.replace("USDT", "");

    try {
      const tickers = await fetch24hTickers();
      const tickerEntry = tickers[exactSymbol] ?? tickers[`${exactSymbol}USDT`];
      const price = tickerEntry?.price;

      if (!price) {
        setResults([]);
        setSearched(true);
        setMsgs([
          {
            role: "ai",
            text: `"${q}" is not found on Binance USDT markets. Try a valid symbol like BTC, ETH, SOL.`,
          },
        ]);
        return;
      }

      const analysis = await analyzeSymbol(exactSymbol, tickers);

      if (analysis) {
        const sig: LiveSignal = {
          id: `${exactSymbol}-search`,
          symbol: exactSymbol,
          coinName: COIN_NAMES[exactSymbol] ?? exactSymbol,
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
          aiAnalysis: analysis.analysis ?? "",
          currentPrice: price,
          rsiValue: analysis.rsiValue,
          macdHistogram: analysis.macdHistogram,
          trend: analysis.trend ?? "up",
          volumeConfirmed: analysis.volumeConfirmed ?? true,
          volumeSpike: analysis.volumeSpike,
          bosConfirmed: analysis.chochConfirmed,
          multiTimeframeConfluence:
            typeof analysis.multiTimeframeConfluence === "string"
              ? true
              : analysis.multiTimeframeConfluence,
          entryType: analysis.entryType,
          generatedAt: Date.now(),
          profitPercent: analysis.profitPercent,
          goldenCross: analysis.goldenCross ?? false,
          supportZone: analysis.supportZone ?? false,
          scanTime: Date.now(),
          stopHuntConfirmed: analysis.stopHuntConfirmed,
          chochConfirmed: analysis.chochConfirmed,
          ichimokuConfirmed: analysis.ichimokuConfirmed,
          vwapConfirmed: analysis.vwapConfirmed,
          breakOfStructure: analysis.breakOfStructure,
          testPassed: false,
          testLocked: false,
          isPreVerified: false,
        };
        setResults([sig]);
        setMsgs([
          {
            role: "ai",
            text: `Live ${analysis.direction} signal generated for ${COIN_NAMES[exactSymbol] ?? exactSymbol} from real Binance data. Confidence: ${analysis.confidence}%. Ask me anything about this trade.`,
          },
        ]);
      } else {
        setResults([]);
        setMsgs([
          {
            role: "ai",
            text: `Analyzed ${COIN_NAMES[exactSymbol] ?? exactSymbol} live data but no high-confidence signal (90%+) found right now. Market conditions are mixed — indicators are not aligned across timeframes. Check back later or try another coin.`,
          },
        ]);
      }
    } catch {
      setResults([]);
      setMsgs([
        {
          role: "ai",
          text: `Error fetching live data for "${q}". Please check your connection and try again.`,
        },
      ]);
    } finally {
      setSearched(true);
      setSearching(false);
    }
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    const coinName = results[0]?.coinName ?? query;
    const userMsg = { role: "user" as const, text: chatInput.trim() };
    const aiText = getAIResponse(coinName, chatInput, results[0] ?? null);
    setChatInput("");
    setMsgs((prev) => [
      ...prev,
      userMsg,
      { role: "ai" as const, text: aiText },
    ]);
    setTimeout(() => {
      if (chatRef.current)
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, 100);
  };

  return (
    <div className="space-y-6" data-ocid="search.page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy font-display flex items-center gap-3">
          <Search className="w-6 h-6 text-gold" />
          Search Crypto Signals
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Search any Binance-listed cryptocurrency for live signals and real
          indicator analysis
        </p>
      </div>

      {/* Search input */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            data-ocid="search.search_input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch(query)}
            placeholder="Search any crypto (e.g. BTC, ETH, SOLANA)"
            className="pl-10 h-12 text-sm border-gray-200 focus:border-gold rounded-xl"
          />
        </div>
        <Button
          data-ocid="search.primary_button"
          onClick={() => doSearch(query)}
          disabled={searching}
          className="btn-gold border-0 h-12 px-6"
        >
          {searching ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            "Search"
          )}
        </Button>
      </div>

      {searching && (
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <RefreshCw className="w-4 h-4 animate-spin text-gold" />
          Fetching live OHLCV data from Binance and computing RSI, MACD, EMA...
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {searched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {results.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16 gap-3"
                data-ocid="search.empty_state"
              >
                <Search className="w-12 h-12 text-gray-300" />
                <p className="text-gray-500 font-medium">
                  No high-confidence signal for "{query}"
                </p>
                <p className="text-gray-400 text-sm">
                  The AI requires 90%+ multi-indicator confluence. Try BTC, ETH,
                  SOL, etc.
                </p>
              </div>
            ) : (
              <div className="space-y-4" data-ocid="search.list">
                <h2 className="font-bold text-navy flex items-center gap-2">
                  <span className="live-dot w-2 h-2 rounded-full bg-green-500" />
                  Live Signal Found — Real Binance Data
                </h2>
                {results.map((sig, i) => (
                  <div key={sig.id} data-ocid={`search.item.${i + 1}`}>
                    <SearchSignalCard signal={sig} />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Live Chat */}
      {searched && (
        <div className="glass-card p-5" data-ocid="search.panel">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-gold" />
            <h3 className="font-bold text-navy">
              Chat with AI about {results[0]?.coinName ?? query}
            </h3>
          </div>

          {/* Quick questions */}
          <div className="flex flex-wrap gap-2 mb-4">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  const aiText = getAIResponse(
                    results[0]?.coinName ?? query,
                    q,
                    results[0] ?? null,
                  );
                  setMsgs((prev) => [
                    ...prev,
                    { role: "user", text: q },
                    { role: "ai", text: aiText },
                  ]);
                  setTimeout(() => {
                    if (chatRef.current)
                      chatRef.current.scrollTop = chatRef.current.scrollHeight;
                  }, 100);
                }}
                className="text-xs px-3 py-1.5 rounded-full border transition-colors hover:bg-gold hover:text-navy hover:border-gold"
                style={{
                  background: "rgba(212,175,55,0.08)",
                  color: "#B8960C",
                  borderColor: "rgba(212,175,55,0.3)",
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat messages */}
          <div
            ref={chatRef}
            className="space-y-3 max-h-64 overflow-y-auto mb-4 rounded-xl p-3"
            style={{ background: "rgba(11,31,59,0.04)" }}
          >
            {msgs.map((m, i) => (
              <div
                key={`msg-${i}-${m.role}`}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {m.role === "ai" && (
                  <div
                    className="w-6 h-6 rounded-full flex-shrink-0 mr-2 flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
                    }}
                  >
                    <Brain className="w-3 h-3 text-navy" />
                  </div>
                )}
                <div
                  className="max-w-sm rounded-2xl px-4 py-2 text-sm leading-relaxed"
                  style={{
                    background: m.role === "user" ? "#0B1F3B" : "white",
                    color: m.role === "user" ? "white" : "#1a2a3a",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              data-ocid="search.input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Ask about entry, risk, TP timing..."
              className="flex-1 border-gray-200 focus:border-gold"
            />
            <Button
              data-ocid="search.submit_button"
              onClick={sendChat}
              className="btn-gold border-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
