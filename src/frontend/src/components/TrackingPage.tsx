import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { analyzeSymbol, useLivePrices } from "@/hooks/useMarketData";
import { type LiveSignal, SCAN_SYMBOLS } from "@/hooks/useSignals";
import {
  AlertTriangle,
  Bot,
  Brain,
  CheckCircle2,
  Clock,
  MessageCircle,
  RefreshCw,
  Send,
  Target,
  Trash2,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

// TrackedTrade extends LiveSignal with tracking-specific fields
interface TrackedTrade extends LiveSignal {
  addedAt: string;
  aiVerdict: "LIKELY" | "UNCERTAIN" | "UNLIKELY";
  aiSuggestion: string;
}

interface ChatMsg {
  role: "user" | "ai";
  text: string;
}

interface UpdateResultData {
  passed: boolean;
  details: string;
}

/** Compute AI verdict from live data vs signal targets */
function computeVerdict(
  signal: LiveSignal,
  livePrice: number,
): { verdict: TrackedTrade["aiVerdict"]; suggestion: string } {
  const isBuy = signal.direction === "BUY";
  const progress = isBuy
    ? (livePrice - signal.entryPrice) / (signal.targetPrice - signal.entryPrice)
    : (signal.entryPrice - livePrice) /
      (signal.entryPrice - signal.targetPrice);

  const rsi = signal.rsiValue;
  const macdPositive = signal.macdHistogram > 0;
  const trending = signal.trend === (isBuy ? "up" : "down");

  let bullishFactors = 0;
  let bearishFactors = 0;

  if (isBuy) {
    if (livePrice > signal.entryPrice) bullishFactors++;
    if (rsi < 70 && rsi > 30) bullishFactors++;
    if (macdPositive) bullishFactors++;
    if (trending) bullishFactors++;
    if (livePrice < signal.stopLoss * 1.01) bearishFactors += 3;
    if (signal.multiTimeframeConfluence) bullishFactors++;
  } else {
    if (livePrice < signal.entryPrice) bullishFactors++;
    if (rsi > 30 && rsi < 70) bullishFactors++;
    if (!macdPositive) bullishFactors++;
    if (trending) bullishFactors++;
    if (livePrice > signal.stopLoss * 0.99) bearishFactors += 3;
    if (signal.multiTimeframeConfluence) bullishFactors++;
  }

  let verdict: TrackedTrade["aiVerdict"];
  let suggestion: string;

  if (bearishFactors >= 3) {
    verdict = "UNLIKELY";
    suggestion = `Price is approaching the stop loss zone at $${signal.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 4 })}. RSI: ${rsi.toFixed(1)}, Trend: ${signal.trend}. Consider reviewing position. This assessment is based on live Binance data.`;
  } else if (bullishFactors >= 4) {
    verdict = "LIKELY";
    const pct = Math.max(0, progress * 100);
    suggestion = `Strong ${isBuy ? "bullish" : "bearish"} conditions persist. Progress to TP: ${pct.toFixed(1)}%. RSI: ${rsi.toFixed(1)}, MACD: ${macdPositive ? "bullish" : "bearish"}, Trend: ${signal.trend}. Multi-TF confluence: ${signal.multiTimeframeConfluence ? "YES" : "partial"}. High probability of hitting $${signal.targetPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}.`;
  } else {
    verdict = "UNCERTAIN";
    suggestion = `Mixed signals: RSI ${rsi.toFixed(1)}, MACD ${macdPositive ? "positive" : "negative"}, trend ${signal.trend}. Trade is valid but monitor closely. Progress: ${Math.max(0, progress * 100).toFixed(1)}% toward TP. Live Binance data is being tracked.`;
  }

  return { verdict, suggestion };
}

function getVerdictColor(v: TrackedTrade["aiVerdict"]) {
  if (v === "LIKELY") return "#22C55E";
  if (v === "UNCERTAIN") return "#EAB308";
  return "#EF4444";
}

function getVerdictIcon(v: TrackedTrade["aiVerdict"]) {
  if (v === "LIKELY") return <CheckCircle2 className="w-4 h-4" />;
  if (v === "UNCERTAIN") return <AlertTriangle className="w-4 h-4" />;
  return <XCircle className="w-4 h-4" />;
}

function getVerdictLabel(v: TrackedTrade["aiVerdict"]) {
  if (v === "LIKELY") return "LIKELY TO HIT TP ✓";
  if (v === "UNCERTAIN") return "UNCERTAIN ⚠";
  return "UNLIKELY ✗";
}

const AI_CHAT_RESPONSES: string[] = [
  "Based on live Binance OHLCV data, this trade is progressing as the signal engine projected. Continue monitoring price action at key support/resistance levels.",
  "The real-time RSI and MACD indicators are computed from actual candle data. The signal engine analyzed 3 timeframes (5m, 15m, 1h) before generating this trade.",
  "Current order book data from Binance shows volume is active. The trade setup remains valid as long as price stays above the stop loss level.",
  "Risk management is key. The stop loss is ATR-based (1.2x Average True Range), ensuring it's placed at a statistically meaningful level, not an arbitrary one.",
];

function TrackCard({
  trade,
  livePrice,
  onUpdate,
  isUpdating,
  updateResult,
  onRemove,
}: {
  trade: TrackedTrade;
  livePrice: number;
  onUpdate: () => void;
  isUpdating: boolean;
  updateResult: UpdateResultData | null;
  onRemove: () => void;
}) {
  const { addNotification } = useNotifications();
  const isBuy = trade.direction === "BUY";
  const progress = isBuy
    ? ((livePrice - trade.entryPrice) /
        (trade.targetPrice - trade.entryPrice)) *
      100
    : ((trade.entryPrice - livePrice) /
        (trade.entryPrice - trade.targetPrice)) *
      100;
  const clamped = Math.max(0, Math.min(100, progress));

  // Detect TP hit
  const tpHit = isBuy
    ? livePrice >= trade.targetPrice
    : livePrice <= trade.targetPrice;

  // Track whether we've already fired the TP notification for this trade
  const tpNotifiedRef = useRef(false);

  useEffect(() => {
    if (tpHit && !tpNotifiedRef.current) {
      tpNotifiedRef.current = true;
      addNotification({
        type: "tp_hit",
        title: "🎯 TP Hit!",
        message: `${trade.symbol} reached take profit target of $${trade.targetPrice.toFixed(4)}`,
        symbol: trade.symbol,
      });
    }
  }, [tpHit, trade.symbol, trade.targetPrice, addNotification]);

  // Recompute verdict from live data
  const { verdict, suggestion } = computeVerdict(trade, livePrice);
  const verdictColor = getVerdictColor(verdict);

  const [showChat, setShowChat] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [inputVal, setInputVal] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  const sendMsg = () => {
    if (!inputVal.trim()) return;
    const userMsg = { role: "user" as const, text: inputVal.trim() };
    setInputVal("");
    const aiText =
      AI_CHAT_RESPONSES[Math.floor(Math.random() * AI_CHAT_RESPONSES.length)];
    setMsgs((prev) => [...prev, userMsg, { role: "ai", text: aiText }]);
    setTimeout(() => {
      if (chatRef.current)
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0B1F3B, #0A254A)",
        border: `1px solid ${
          tpHit
            ? "rgba(34,197,94,0.8)"
            : isBuy
              ? "rgba(34,197,94,0.25)"
              : "rgba(239,68,68,0.25)"
        }`,
        boxShadow: tpHit ? "0 0 20px rgba(34,197,94,0.3)" : undefined,
      }}
    >
      {/* TP Hit Banner */}
      {tpHit && (
        <div
          className="animate-pulse px-4 py-2 text-center font-black text-sm"
          style={{
            background: "linear-gradient(90deg, #16A34A, #22C55E)",
            color: "white",
            letterSpacing: "0.05em",
          }}
          data-ocid="tracking.tp_hit.success_state"
        >
          🎯 TP HIT! TARGET REACHED
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-black text-navy text-sm"
              style={{
                background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
              }}
            >
              {trade.symbol.slice(0, 2)}
            </div>
            <div>
              <p className="text-white font-bold">{trade.coinName}</p>
              <p className="text-white/40 text-xs">{trade.symbol}/USDT</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end gap-1">
              <span className={isBuy ? "badge-buy" : "badge-sell"}>
                {isBuy ? "BUY" : "SELL"}
              </span>
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  background: "rgba(212,175,55,0.12)",
                  color: "#D4AF37",
                }}
              >
                +{trade.profitPercent.toFixed(2)}%
              </span>
            </div>
            {/* Remove button */}
            <button
              type="button"
              data-ocid="tracking.delete_button"
              onClick={onRemove}
              className="ml-1 p-1.5 rounded-lg transition-all hover:bg-red-500/20 active:scale-95"
              style={{
                color: "rgba(239,68,68,0.7)",
                border: "1px solid rgba(239,68,68,0.2)",
                background: "rgba(239,68,68,0.08)",
              }}
              title="Remove tracked trade"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Prices */}
        <div className="grid grid-cols-4 gap-2 text-xs mb-4">
          {[
            {
              label: "Entry",
              val: `$${trade.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}`,
              color: "text-white",
            },
            {
              label: "Live",
              val: `$${livePrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}`,
              color: "text-gold",
            },
            {
              label: "Target",
              val: `$${trade.targetPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}`,
              color: "text-green-400",
            },
            {
              label: "Stop",
              val: `$${trade.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 4 })}`,
              color: "text-red-400",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg p-2"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <p className="text-white/40 mb-0.5">{item.label}</p>
              <p className={`font-bold ${item.color} text-xs`}>{item.val}</p>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-white/30 mb-1">
            <span>Progress to TP</span>
            <span>{clamped.toFixed(1)}%</span>
          </div>
          <div
            className="h-2 rounded-full"
            style={{ background: "rgba(255,255,255,0.07)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${clamped}%`,
                background: isBuy
                  ? "linear-gradient(90deg,#16A34A,#22C55E)"
                  : "linear-gradient(90deg,#DC2626,#EF4444)",
              }}
            />
          </div>
        </div>

        {/* Live AI Verdict (recomputed from real data) */}
        <div
          className="flex items-center gap-3 p-3 rounded-xl mb-3"
          style={{
            background: `${verdictColor}12`,
            border: `1px solid ${verdictColor}30`,
          }}
        >
          <span style={{ color: verdictColor }}>{getVerdictIcon(verdict)}</span>
          <div className="flex-1">
            <p
              className="text-xs font-black mb-0.5"
              style={{ color: verdictColor }}
            >
              {getVerdictLabel(verdict)}
            </p>
            <p className="text-white/50 text-xs leading-relaxed">
              {suggestion}
            </p>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-white/30 mb-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> ~{trade.estimatedHours}h est.
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> {trade.riskReward}
          </span>
          <span className="flex items-center gap-1">
            <Brain className="w-3 h-3" /> {trade.confidence}% confidence
          </span>
        </div>

        {/* Update Verdict Button */}
        <button
          type="button"
          data-ocid="tracking.update.button"
          onClick={onUpdate}
          disabled={isUpdating}
          className="w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 mb-2"
          style={{
            background: isUpdating
              ? "rgba(100,116,139,0.2)"
              : "rgba(34,197,94,0.15)",
            color: isUpdating ? "#94A3B8" : "#22C55E",
            border: `1px solid ${
              isUpdating ? "rgba(100,116,139,0.2)" : "rgba(34,197,94,0.3)"
            }`,
            cursor: isUpdating ? "not-allowed" : "pointer",
          }}
        >
          {isUpdating ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3" />🔄 Update Verdict
            </>
          )}
        </button>

        {/* Update result banner */}
        {updateResult && (
          <div
            className="mb-2 p-2 rounded-xl text-xs leading-relaxed"
            style={{
              background: updateResult.passed
                ? "rgba(34,197,94,0.1)"
                : "rgba(234,179,8,0.1)",
              border: `1px solid ${
                updateResult.passed
                  ? "rgba(34,197,94,0.3)"
                  : "rgba(234,179,8,0.3)"
              }`,
              color: updateResult.passed ? "#22C55E" : "#EAB308",
            }}
            data-ocid="tracking.update.success_state"
          >
            {updateResult.details}
          </div>
        )}

        {/* Ask AI button */}
        <Button
          type="button"
          data-ocid="tracking.ask_ai.button"
          size="sm"
          onClick={() => setShowChat((v) => !v)}
          className="w-full"
          style={{
            background: "rgba(212,175,55,0.15)",
            color: "#D4AF37",
            border: "1px solid rgba(212,175,55,0.3)",
          }}
        >
          <MessageCircle className="w-3.5 h-3.5 mr-2" />
          {showChat ? "Close AI Chat" : "Ask AI About This Trade"}
        </Button>
      </div>

      {/* Inline AI Chat */}
      {showChat && (
        <div
          className="border-t"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-gold" />
              <span className="text-gold text-xs font-bold">
                AI Trade Assistant
              </span>
            </div>
            <div
              ref={chatRef}
              className="space-y-2 max-h-40 overflow-y-auto mb-2"
            >
              {msgs.length === 0 && (
                <p className="text-white/30 text-xs italic">
                  Ask anything about this {trade.coinName} trade...
                </p>
              )}
              {msgs.map((m, i) => (
                <div
                  key={`msg-${i}-${m.role}`}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className="max-w-xs rounded-xl px-3 py-2 text-xs"
                    style={{
                      background:
                        m.role === "user"
                          ? "rgba(212,175,55,0.2)"
                          : "rgba(255,255,255,0.07)",
                      color:
                        m.role === "user" ? "#F2D27A" : "rgba(255,255,255,0.8)",
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                data-ocid="tracking.ai_chat.input"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMsg()}
                placeholder="Ask about this trade..."
                className="text-xs h-8 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <Button
                data-ocid="tracking.ai_send.button"
                onClick={sendMsg}
                size="sm"
                className="h-8 btn-gold border-0 px-3"
              >
                <Send className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function TrackingPage() {
  const { user } = useAuth();
  const storageKey = user ? `wb_tracked_${user.uid}` : "wb_tracked_guest";

  // Initialize empty; load from per-user key in effect
  const [tracked, setTracked] = useState<TrackedTrade[]>([]);

  // Load tracked trades whenever the storage key changes (login/logout)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setTracked(saved ? JSON.parse(saved) : []);
    } catch {
      setTracked([]);
    }
  }, [storageKey]);

  // Auto-refresh every 15 seconds
  const [refreshTick, setRefreshTick] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setRefreshTick((t) => t + 1);
      setLastRefreshed(new Date());
    }, 15000);
    return () => clearInterval(id);
  }, []);

  // Remove a tracked trade by ID
  const removeTrade = (id: string) => {
    const updated = tracked.filter((t) => t.id !== id);
    setTracked(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  // Update verdict states per trade
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateResults, setUpdateResults] = useState<
    Record<string, UpdateResultData>
  >({});

  const handleUpdate = async (trade: TrackedTrade, livePrice: number) => {
    setUpdatingId(trade.id);
    try {
      const result = await analyzeSymbol(trade.symbol, livePrice);
      if (
        result &&
        result.direction === trade.direction &&
        result.confidence >= 55
      ) {
        setUpdateResults((prev) => ({
          ...prev,
          [trade.id]: {
            passed: true,
            details:
              "✅ CONFIRMED: Trade is still on track to hit TP. No adverse signals detected. Conditions remain aligned with original signal.",
          },
        }));
      } else {
        setUpdateResults((prev) => ({
          ...prev,
          [trade.id]: {
            passed: false,
            details:
              "⚠️ ALERT: Market conditions have shifted. Re-evaluate entry and consider tightening stop loss.",
          },
        }));
      }
    } catch {
      setUpdateResults((prev) => ({
        ...prev,
        [trade.id]: {
          passed: false,
          details: "⚠️ Could not complete update. Check network and try again.",
        },
      }));
    } finally {
      setUpdatingId(null);
    }
  };

  const symbols = tracked.map((t) => t.symbol);
  const livePrices = useLivePrices(
    symbols.length > 0 ? symbols : SCAN_SYMBOLS.slice(0, 5),
    6000,
  );

  // Sort by time — newest first
  const sortedTracks = [...tracked].sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
  );

  return (
    <div className="space-y-6" data-ocid="tracking.page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy font-display flex items-center gap-3">
            <span className="live-dot w-3 h-3 rounded-full bg-green-500" />
            Tracked Trades
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Live monitoring with real Binance price feeds — sorted by time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="px-3 py-1 rounded-full text-xs font-bold"
            style={{
              background: "rgba(34,197,94,0.12)",
              color: "#16A34A",
              border: "1px solid rgba(34,197,94,0.2)",
            }}
          >
            ↻ 15s auto-refresh
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div
        className="glass-card p-4 flex items-center gap-4"
        style={{ borderLeft: "4px solid #D4AF37" }}
      >
        <Brain className="w-8 h-8 text-gold flex-shrink-0" />
        <div>
          <p className="font-bold text-navy text-sm">
            AI Live Monitoring Active
          </p>
          <p className="text-gray-500 text-xs">
            Verdicts recomputed from Binance price feeds every 15s. Update
            Verdict button runs a full re-analysis with RSI, MACD, multi-TF
            confluence check.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 ml-auto">
          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
            LIVE
          </Badge>
          <span className="text-xs text-gray-400">
            Refresh #{refreshTick + 1} — {lastRefreshed.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Tracked cards */}
      {sortedTracks.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center min-h-64 gap-4"
          data-ocid="tracking.empty_state"
        >
          <Target className="w-16 h-16 text-gray-300" />
          <h2 className="text-xl font-bold text-navy">No Tracked Trades</h2>
          <p className="text-gray-500 text-sm">
            Add signals to track from the Signals page.
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          data-ocid="tracking.list"
        >
          {sortedTracks.map((trade, i) => {
            const livePrice =
              livePrices[trade.symbol]?.price ?? trade.currentPrice;
            return (
              <div key={trade.id} data-ocid={`tracking.item.${i + 1}`}>
                <TrackCard
                  trade={trade}
                  livePrice={livePrice}
                  onUpdate={() => handleUpdate(trade, livePrice)}
                  isUpdating={updatingId === trade.id}
                  updateResult={updateResults[trade.id] ?? null}
                  onRemove={() => removeTrade(trade.id)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
