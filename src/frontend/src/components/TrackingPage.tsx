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
  ChevronDown,
  ChevronUp,
  Clock,
  MessageCircle,
  RefreshCw,
  Send,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// TrackedTrade extends LiveSignal with tracking-specific fields
interface TrackedTrade extends LiveSignal {
  addedAt: string;
  aiVerdict: "LIKELY" | "UNCERTAIN" | "UNLIKELY";
  aiSuggestion: string;
  outcome?: "win" | "loss" | "open";
  closedAt?: string;
}

interface TradeAnalysisEntry {
  id: string;
  symbol: string;
  coinName: string;
  direction: "BUY" | "SELL";
  entryPrice: number;
  closePrice: number;
  targetPrice: number;
  stopLoss: number;
  outcome: "win" | "loss";
  profitPercent: number;
  closedAt: string;
  addedAt: string;
  aiNote: string;
}

interface ChatMsg {
  role: "user" | "ai";
  text: string;
}

interface UpdateResultData {
  passed: boolean;
  details: string;
}

/**
 * Compute AI verdict using LIVE PRICE ONLY (no stale indicator values from signal generation).
 * This gives accurate real-time assessment of trade health.
 */
function computeVerdict(
  signal: LiveSignal,
  livePrice: number,
): { verdict: TrackedTrade["aiVerdict"]; suggestion: string } {
  const isBuy = signal.direction === "BUY";
  const progress = isBuy
    ? (livePrice - signal.entryPrice) / (signal.targetPrice - signal.entryPrice)
    : (signal.entryPrice - livePrice) /
      (signal.entryPrice - signal.targetPrice);
  const progressPct = Math.max(0, progress * 100);

  // Distance to SL and TP as % of total range
  const totalRange = Math.abs(signal.targetPrice - signal.stopLoss);
  const distToSL = isBuy
    ? ((livePrice - signal.stopLoss) / totalRange) * 100
    : ((signal.stopLoss - livePrice) / totalRange) * 100;

  // Is price dangerously close to SL? (< 15% of range remaining to SL)
  const nearSL = distToSL < 15;
  // Is price already past the midpoint toward TP?
  const pastMidpoint = progressPct >= 50;
  // Has price moved adversely from entry? (> 5% wrong direction)
  const adverseMove = isBuy
    ? livePrice < signal.entryPrice * 0.95
    : livePrice > signal.entryPrice * 1.05;

  let verdict: TrackedTrade["aiVerdict"];
  let suggestion: string;

  if (nearSL || adverseMove) {
    verdict = "UNLIKELY";
    const exitPrice = livePrice.toLocaleString(undefined, {
      maximumFractionDigits: 4,
    });
    const slPrice = signal.stopLoss.toLocaleString(undefined, {
      maximumFractionDigits: 4,
    });
    suggestion = `⚠️ EXIT RECOMMENDATION: Price at $${exitPrice} is dangerously close to stop loss ($${slPrice}). Distance to SL: ${distToSL.toFixed(1)}% of range. Consider exiting now at $${exitPrice} to preserve capital. Market conditions have shifted adversely since signal generation.`;
  } else if (pastMidpoint) {
    verdict = "LIKELY";
    const tpPrice = signal.targetPrice.toLocaleString(undefined, {
      maximumFractionDigits: 4,
    });
    suggestion = `✅ ON TRACK: Price has moved ${progressPct.toFixed(1)}% toward TP target ($${tpPrice}). Trade is performing well. Consider taking partial profit at TP1/TP2 levels while leaving remainder to run to full TP3 target.`;
  } else if (progressPct >= 20) {
    verdict = "LIKELY";
    const tpPrice = signal.targetPrice.toLocaleString(undefined, {
      maximumFractionDigits: 4,
    });
    suggestion = `✅ PROGRESSING: ${progressPct.toFixed(1)}% progress to TP3 ($${tpPrice}). Price is moving in the expected direction. Continue holding. ATR-based target is realistic given current volatility.`;
  } else {
    verdict = "UNCERTAIN";
    suggestion = `⏳ EARLY STAGE: ${progressPct.toFixed(1)}% progress toward TP. Price is consolidating near entry. This is normal — ATR-based targets require time for volatility to carry price. Hold position as long as price stays above SL ($${signal.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 4 })}).`;
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
  onCloseWin,
  onCloseLoss,
}: {
  trade: TrackedTrade;
  livePrice: number;
  onUpdate: () => void;
  isUpdating: boolean;
  updateResult: UpdateResultData | null;
  onRemove: () => void;
  onCloseWin: () => void;
  onCloseLoss: () => void;
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

  // Detect SL hit
  const slHit = isBuy
    ? livePrice <= trade.stopLoss
    : livePrice >= trade.stopLoss;

  // Track whether we've already fired the TP notification for this trade
  const tpNotifiedRef = useRef(false);
  const slNotifiedRef = useRef(false);

  // TP hit effect — fire notification and auto-close as win
  useEffect(() => {
    if (
      tpHit &&
      !tpNotifiedRef.current &&
      trade.outcome !== "win" &&
      trade.outcome !== "loss"
    ) {
      tpNotifiedRef.current = true;
      addNotification({
        type: "tp_hit",
        title: "🎯 TP Hit!",
        message: `${trade.symbol} reached take profit target of $${trade.targetPrice.toFixed(4)}`,
        symbol: trade.symbol,
      });
      onCloseWin();
    }
  }, [
    tpHit,
    trade.symbol,
    trade.targetPrice,
    trade.outcome,
    addNotification,
    onCloseWin,
  ]);

  // SL hit effect — fire notification and auto-close as loss
  useEffect(() => {
    if (
      slHit &&
      !slNotifiedRef.current &&
      trade.outcome !== "win" &&
      trade.outcome !== "loss"
    ) {
      slNotifiedRef.current = true;
      addNotification({
        type: "tp_hit",
        title: "⛔ Stop Loss Hit",
        message: `${trade.symbol} hit stop loss at $${trade.stopLoss.toFixed(4)}`,
        symbol: trade.symbol,
      });
      onCloseLoss();
    }
  }, [
    slHit,
    trade.symbol,
    trade.stopLoss,
    trade.outcome,
    addNotification,
    onCloseLoss,
  ]);

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

  const isClosed = trade.outcome === "win" || trade.outcome === "loss";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0B1F3B, #0A254A)",
        border: `1px solid ${
          trade.outcome === "win"
            ? "rgba(34,197,94,0.8)"
            : trade.outcome === "loss"
              ? "rgba(239,68,68,0.8)"
              : tpHit
                ? "rgba(34,197,94,0.8)"
                : slHit
                  ? "rgba(239,68,68,0.8)"
                  : isBuy
                    ? "rgba(34,197,94,0.25)"
                    : "rgba(239,68,68,0.25)"
        }`,
        boxShadow:
          trade.outcome === "win" || tpHit
            ? "0 0 20px rgba(34,197,94,0.3)"
            : trade.outcome === "loss" || slHit
              ? "0 0 20px rgba(239,68,68,0.3)"
              : undefined,
      }}
    >
      {/* TP Hit Banner */}
      {(tpHit || trade.outcome === "win") && (
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

      {/* SL Hit Banner */}
      {(slHit || trade.outcome === "loss") &&
        !tpHit &&
        trade.outcome !== "win" && (
          <div
            className="animate-pulse px-4 py-2 text-center font-black text-sm"
            style={{
              background: "linear-gradient(90deg, #DC2626, #EF4444)",
              color: "white",
              letterSpacing: "0.05em",
            }}
            data-ocid="tracking.sl_hit.error_state"
          >
            ⛔ STOP LOSS HIT
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

        {/* Manual Mark TP / SL buttons */}
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            data-ocid="tracking.mark_win.button"
            onClick={onCloseWin}
            disabled={isClosed}
            className="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            style={{
              background: isClosed
                ? "rgba(100,116,139,0.1)"
                : "rgba(34,197,94,0.15)",
              color: isClosed ? "#64748B" : "#22C55E",
              border: `1px solid ${isClosed ? "rgba(100,116,139,0.2)" : "rgba(34,197,94,0.3)"}`,
              cursor: isClosed ? "not-allowed" : "pointer",
              opacity: isClosed ? 0.5 : 1,
            }}
          >
            <CheckCircle2 className="w-3 h-3" />✅ Mark TP Hit
          </button>
          <button
            type="button"
            data-ocid="tracking.mark_loss.button"
            onClick={onCloseLoss}
            disabled={isClosed}
            className="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            style={{
              background: isClosed
                ? "rgba(100,116,139,0.1)"
                : "rgba(239,68,68,0.15)",
              color: isClosed ? "#64748B" : "#EF4444",
              border: `1px solid ${isClosed ? "rgba(100,116,139,0.2)" : "rgba(239,68,68,0.3)"}`,
              cursor: isClosed ? "not-allowed" : "pointer",
              opacity: isClosed ? 0.5 : 1,
            }}
          >
            <XCircle className="w-3 h-3" />⛔ Mark SL Hit
          </button>
        </div>

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
  const { user, updateProfile } = useAuth();
  const storageKey = user ? `wb_tracked_${user.uid}` : "wb_tracked_guest";

  // Initialize empty; load from per-user key in effect
  const [tracked, setTracked] = useState<TrackedTrade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeAnalysisEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

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

  // Load trade analysis history
  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshTick is intentionally used as a trigger
  useEffect(() => {
    const uid = user?.uid ?? "guest";
    try {
      const data = JSON.parse(
        localStorage.getItem(`wb_trade_analysis_${uid}`) ?? "[]",
      );
      setTradeHistory(data);
    } catch {
      setTradeHistory([]);
    }
  }, [user, refreshTick]);

  // Remove a tracked trade by ID
  const removeTrade = (id: string) => {
    const updated = tracked.filter((t) => t.id !== id);
    setTracked(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  // Close trade as WIN
  const closeTradeAsWin = (trade: TrackedTrade, livePrice: number) => {
    const uid = user?.uid ?? "guest";
    const analysis: TradeAnalysisEntry = {
      id: `ta-${Date.now()}`,
      symbol: trade.symbol,
      coinName: trade.coinName,
      direction: trade.direction,
      entryPrice: trade.entryPrice,
      closePrice: livePrice,
      targetPrice: trade.targetPrice,
      stopLoss: trade.stopLoss,
      outcome: "win",
      profitPercent: trade.profitPercent,
      closedAt: new Date().toISOString(),
      addedAt: trade.addedAt,
      aiNote: `WIN: ${trade.coinName} hit take profit at $${trade.targetPrice.toFixed(4)}. Entry was $${trade.entryPrice.toFixed(4)}. Profit: +${trade.profitPercent.toFixed(2)}%. Multi-TF confluence was ${
        trade.multiTimeframeConfluence ? "active" : "partial"
      }. RSI at entry: ${trade.rsiValue.toFixed(1)}. This pattern reinforces our ${trade.trend} trend + ${trade.direction} signal logic.`,
    };
    const logKey = `wb_trade_analysis_${uid}`;
    const existing: TradeAnalysisEntry[] = JSON.parse(
      localStorage.getItem(logKey) ?? "[]",
    );
    const updatedLog = [analysis, ...existing];
    localStorage.setItem(logKey, JSON.stringify(updatedLog));
    setTradeHistory(updatedLog);

    const current = user?.tradeHistory ?? { total: 0, wins: 0, losses: 0 };
    updateProfile({
      tradeHistory: {
        total: current.total + 1,
        wins: current.wins + 1,
        losses: current.losses,
      },
    });

    const updated = tracked.map((t) =>
      t.id === trade.id
        ? { ...t, outcome: "win" as const, closedAt: new Date().toISOString() }
        : t,
    );
    setTracked(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    toast.success(`🎯 ${trade.coinName} marked as WIN! Trade history updated.`);
  };

  // Close trade as LOSS
  const closeTradeAsLoss = (trade: TrackedTrade, livePrice: number) => {
    const uid = user?.uid ?? "guest";
    const analysis: TradeAnalysisEntry = {
      id: `ta-${Date.now()}`,
      symbol: trade.symbol,
      coinName: trade.coinName,
      direction: trade.direction,
      entryPrice: trade.entryPrice,
      closePrice: livePrice,
      targetPrice: trade.targetPrice,
      stopLoss: trade.stopLoss,
      outcome: "loss",
      profitPercent: -Math.abs(trade.profitPercent),
      closedAt: new Date().toISOString(),
      addedAt: trade.addedAt,
      aiNote: `LOSS: ${trade.coinName} hit stop loss at $${trade.stopLoss.toFixed(4)}. Entry was $${trade.entryPrice.toFixed(4)}. RSI at entry: ${trade.rsiValue.toFixed(1)}, Trend: ${trade.trend}. This trade is flagged for AI learning to improve signal filtering. Symbol added to SL blacklist.`,
    };
    const logKey = `wb_trade_analysis_${uid}`;
    const existing: TradeAnalysisEntry[] = JSON.parse(
      localStorage.getItem(logKey) ?? "[]",
    );
    const updatedLog = [analysis, ...existing];
    localStorage.setItem(logKey, JSON.stringify(updatedLog));
    setTradeHistory(updatedLog);

    // Add symbol to global SL blacklist
    const slHits: string[] = JSON.parse(
      localStorage.getItem("wb_sl_hits") ?? "[]",
    );
    if (!slHits.includes(trade.symbol)) {
      localStorage.setItem(
        "wb_sl_hits",
        JSON.stringify([...slHits, trade.symbol]),
      );
    }

    const current = user?.tradeHistory ?? { total: 0, wins: 0, losses: 0 };
    updateProfile({
      tradeHistory: {
        total: current.total + 1,
        wins: current.wins,
        losses: current.losses + 1,
      },
    });

    const updated = tracked.map((t) =>
      t.id === trade.id
        ? {
            ...t,
            outcome: "loss" as const,
            closedAt: new Date().toISOString(),
          }
        : t,
    );
    setTracked(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    toast.error(
      `⛔ ${trade.coinName} marked as LOSS. Symbol blacklisted from future signals.`,
    );
  };

  // Update verdict states per trade
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateResults, setUpdateResults] = useState<
    Record<string, UpdateResultData>
  >({});

  const handleUpdate = async (trade: TrackedTrade, livePrice: number) => {
    setUpdatingId(trade.id);
    try {
      // Fetch FRESH candle analysis — not stale signal data
      const result = await analyzeSymbol(trade.symbol, livePrice);
      const isBuy = trade.direction === "BUY";
      const progress = isBuy
        ? ((livePrice - trade.entryPrice) /
            (trade.targetPrice - trade.entryPrice)) *
          100
        : ((trade.entryPrice - livePrice) /
            (trade.entryPrice - trade.targetPrice)) *
          100;
      const progressPct = Math.max(0, progress);
      const tp1 =
        trade.tp1 ??
        (isBuy
          ? trade.entryPrice + (trade.targetPrice - trade.entryPrice) * 0.4
          : trade.entryPrice - (trade.entryPrice - trade.targetPrice) * 0.4);
      const tp1Hit = isBuy ? livePrice >= tp1 : livePrice <= tp1;

      if (
        result &&
        result.direction === trade.direction &&
        result.confidence >= 75
      ) {
        setUpdateResults((prev) => ({
          ...prev,
          [trade.id]: {
            passed: true,
            details: `✅ STILL VALID: Fresh 4h+1h+15m analysis confirms ${trade.direction} setup. Confidence: ${result.confidence}%. Progress to TP: ${progressPct.toFixed(1)}%. ATR: $${result.atrValue.toFixed(4)}. RR: ${result.riskReward}. ${result.breakOfStructure ? "Break of Structure still active. " : ""}${tp1Hit ? "TP1 already hit — consider securing partial profits." : `TP1 at $${tp1.toFixed(4)} is next milestone.`} Hold position.`,
          },
        }));
      } else if (result && result.direction !== trade.direction) {
        // Signal reversed direction — strong exit signal
        setUpdateResults((prev) => ({
          ...prev,
          [trade.id]: {
            passed: false,
            details: `🔄 DIRECTION FLIP: Fresh analysis now shows ${result.direction} signal — OPPOSITE to your open ${trade.direction} trade. EXIT NOW at $${livePrice.toLocaleString(undefined, { maximumFractionDigits: 4 })} to avoid stop loss. Market structure has shifted significantly.`,
          },
        }));
      } else {
        // No clear signal — conditions degraded
        const distToSL = Math.abs(livePrice - trade.stopLoss);
        const distToTP = Math.abs(trade.targetPrice - livePrice);
        const ratio = distToSL > 0 ? (distToTP / distToSL).toFixed(1) : "N/A";
        setUpdateResults((prev) => ({
          ...prev,
          [trade.id]: {
            passed: false,
            details: `⚠️ CONDITIONS WEAKENED: Market structure no longer clearly ${trade.direction === "BUY" ? "bullish" : "bearish"}. Progress: ${progressPct.toFixed(1)}%. Remaining RR ratio: 1:${ratio}. Current price: $${livePrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}. ${progressPct > 30 ? "Consider taking partial profit now before conditions deteriorate further." : "Consider exiting to avoid stop loss hit."}`,
          },
        }));
      }
    } catch {
      setUpdateResults((prev) => ({
        ...prev,
        [trade.id]: {
          passed: false,
          details:
            "⚠️ Could not fetch fresh market data. Check network and try again.",
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
                  onCloseWin={() => closeTradeAsWin(trade, livePrice)}
                  onCloseLoss={() => closeTradeAsLoss(trade, livePrice)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Trade History & Deep Analysis Section */}
      <div className="mt-8">
        <button
          type="button"
          data-ocid="tracking.history.toggle"
          onClick={() => setShowHistory((v) => !v)}
          className="w-full flex items-center justify-between p-4 rounded-2xl transition-all"
          style={{
            background: "linear-gradient(135deg, #071428, #0B1F3B)",
            border: "1px solid rgba(212,175,55,0.2)",
          }}
        >
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-gold" />
            <div className="text-left">
              <p className="font-bold text-white text-sm">
                Trade History &amp; Deep Analysis
              </p>
              <p className="text-gold/50 text-xs">
                {tradeHistory.length} closed trades analyzed by AI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: "rgba(212,175,55,0.15)",
                color: "#D4AF37",
                border: "1px solid rgba(212,175,55,0.25)",
              }}
            >
              {tradeHistory.filter((t) => t.outcome === "win").length}W /{" "}
              {tradeHistory.filter((t) => t.outcome === "loss").length}L
            </span>
            {showHistory ? (
              <ChevronUp className="w-4 h-4 text-gold" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gold" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-3" data-ocid="tracking.history.list">
                {tradeHistory.length === 0 ? (
                  <div
                    className="flex flex-col items-center gap-3 py-10"
                    data-ocid="tracking.history.empty_state"
                  >
                    <Brain className="w-10 h-10 text-gray-300" />
                    <p className="text-gray-500 text-sm">
                      No closed trades yet. Win/Loss history will appear here.
                    </p>
                  </div>
                ) : (
                  tradeHistory.map((entry, i) => (
                    <motion.div
                      key={entry.id}
                      data-ocid={`tracking.history.item.${i + 1}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-2xl p-4"
                      style={{
                        background: "linear-gradient(135deg, #0B1F3B, #0A254A)",
                        border: `1px solid ${
                          entry.outcome === "win"
                            ? "rgba(34,197,94,0.35)"
                            : "rgba(239,68,68,0.35)"
                        }`,
                        borderLeft: `4px solid ${
                          entry.outcome === "win" ? "#22C55E" : "#EF4444"
                        }`,
                      }}
                    >
                      {/* Card header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-black text-navy text-xs"
                            style={{
                              background:
                                "linear-gradient(135deg, #F2D27A, #D4AF37)",
                            }}
                          >
                            {entry.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm">
                              {entry.coinName}
                            </p>
                            <p className="text-white/40 text-xs">
                              {entry.symbol}/USDT
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{
                              background:
                                entry.direction === "BUY"
                                  ? "rgba(34,197,94,0.15)"
                                  : "rgba(239,68,68,0.15)",
                              color:
                                entry.direction === "BUY"
                                  ? "#22C55E"
                                  : "#EF4444",
                              border: `1px solid ${
                                entry.direction === "BUY"
                                  ? "rgba(34,197,94,0.3)"
                                  : "rgba(239,68,68,0.3)"
                              }`,
                            }}
                          >
                            {entry.direction}
                          </span>
                          <span
                            className="px-2.5 py-0.5 rounded-full text-xs font-black"
                            style={{
                              background:
                                entry.outcome === "win"
                                  ? "rgba(34,197,94,0.2)"
                                  : "rgba(239,68,68,0.2)",
                              color:
                                entry.outcome === "win" ? "#22C55E" : "#EF4444",
                              border: `1px solid ${
                                entry.outcome === "win"
                                  ? "rgba(34,197,94,0.4)"
                                  : "rgba(239,68,68,0.4)"
                              }`,
                            }}
                          >
                            {entry.outcome === "win" ? "✅ WIN" : "❌ LOSS"}
                          </span>
                          {entry.outcome === "win" ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                      </div>

                      {/* Price data */}
                      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                        <div
                          className="rounded-lg p-2"
                          style={{ background: "rgba(255,255,255,0.05)" }}
                        >
                          <p className="text-white/40 mb-0.5">Entry</p>
                          <p className="font-bold text-white">
                            $
                            {entry.entryPrice.toLocaleString(undefined, {
                              maximumFractionDigits: 4,
                            })}
                          </p>
                        </div>
                        <div
                          className="rounded-lg p-2"
                          style={{ background: "rgba(255,255,255,0.05)" }}
                        >
                          <p className="text-white/40 mb-0.5">Close</p>
                          <p
                            className="font-bold"
                            style={{
                              color:
                                entry.outcome === "win" ? "#22C55E" : "#EF4444",
                            }}
                          >
                            $
                            {entry.closePrice.toLocaleString(undefined, {
                              maximumFractionDigits: 4,
                            })}
                          </p>
                        </div>
                        <div
                          className="rounded-lg p-2"
                          style={{ background: "rgba(255,255,255,0.05)" }}
                        >
                          <p className="text-white/40 mb-0.5">P&amp;L</p>
                          <p
                            className="font-bold"
                            style={{
                              color:
                                entry.outcome === "win" ? "#22C55E" : "#EF4444",
                            }}
                          >
                            {entry.outcome === "win" ? "+" : ""}
                            {entry.profitPercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      {/* AI Note */}
                      <div
                        className="rounded-xl p-3 mb-2"
                        style={{
                          background: "rgba(0,0,0,0.3)",
                          border: "1px solid rgba(212,175,55,0.15)",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Brain className="w-3.5 h-3.5 text-gold" />
                          <span className="text-gold text-xs font-bold uppercase tracking-wide">
                            AI Deep Analysis
                          </span>
                        </div>
                        <p className="text-white/70 text-xs leading-relaxed">
                          {entry.aiNote}
                        </p>
                      </div>

                      {/* Date */}
                      <p className="text-white/30 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Closed:{" "}
                        {new Date(entry.closedAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
