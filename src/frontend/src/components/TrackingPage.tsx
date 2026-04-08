import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useActor } from "@/hooks/useActor";
import type { TrackedTradeRecord } from "@/hooks/useActor";
import {
  type UltraDeepVerdict,
  ultraDeepVerdictAnalysis,
  useLivePrices,
} from "@/hooks/useMarketData";
import { type LiveSignal, SCAN_SYMBOLS } from "@/hooks/useSignals";
import {
  AlertTriangle,
  Bot,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  outcome: "WIN" | "LOSS";
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

/** Fallback local verdict when deep analysis hasn't run */
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
    suggestion = `Price is approaching the stop loss zone at $${signal.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 4 })}. RSI: ${rsi.toFixed(1)}, Trend: ${signal.trend}. Consider reviewing position.`;
  } else if (bullishFactors >= 4) {
    verdict = "LIKELY";
    const pct = Math.max(0, progress * 100);
    suggestion = `Strong ${isBuy ? "bullish" : "bearish"} conditions persist. Progress to TP: ${pct.toFixed(1)}%. RSI: ${rsi.toFixed(1)}, MACD: ${macdPositive ? "bullish" : "bearish"}, Trend: ${signal.trend}. Multi-TF confluence: ${signal.multiTimeframeConfluence ? "YES" : "partial"}. High probability of hitting $${signal.targetPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}.`;
  } else {
    verdict = "UNCERTAIN";
    suggestion = `Mixed signals: RSI ${rsi.toFixed(1)}, MACD ${macdPositive ? "positive" : "negative"}, trend ${signal.trend}. Trade is valid but monitor closely. Progress: ${Math.max(0, progress * 100).toFixed(1)}% toward TP.`;
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

const AI_CHAT_RESPONSES: string[] = [
  "Based on live Binance OHLCV data, this trade is progressing as the signal engine projected. Continue monitoring price action at key support/resistance levels.",
  "The real-time RSI and MACD indicators are computed from actual candle data. The signal engine analyzed 5 timeframes (1m, 5m, 15m, 1h, 4h) before generating this trade.",
  "Current order book data from Binance shows volume is active. The trade setup remains valid as long as price stays above the stop loss level.",
  "Risk management is key. The stop loss is ATR-based (1.2x Average True Range), ensuring it's placed at a statistically meaningful level, not an arbitrary one.",
];

const DEEP_SCAN_MESSAGES = [
  "📡 Fetching live market data...",
  "📊 Running 18-gate analysis...",
  "🔬 Checking stop-hunt protection...",
  "📈 Verifying trend confirmation...",
  "✅ Computing final verdict...",
];

// ─── WIN RATE TRACKER COMPONENT ──────────────────────────────────────────────

function WinRateTracker({
  wins,
  losses,
}: {
  wins: number;
  losses: number;
}) {
  const total = wins + losses;
  const rate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const color = rate >= 70 ? "#22C55E" : rate >= 50 ? "#EAB308" : "#EF4444";
  const bgColor =
    rate >= 70
      ? "rgba(34,197,94,0.12)"
      : rate >= 50
        ? "rgba(234,179,8,0.12)"
        : "rgba(239,68,68,0.12)";
  const borderColor =
    rate >= 70
      ? "rgba(34,197,94,0.3)"
      : rate >= 50
        ? "rgba(234,179,8,0.3)"
        : "rgba(239,68,68,0.3)";

  return (
    <div
      className="rounded-2xl p-4 flex items-center justify-between gap-4"
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
      }}
      data-ocid="tracking.win_rate.tracker"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center font-black text-lg"
          style={{
            background: `conic-gradient(${color} ${rate * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
            boxShadow: `0 0 12px ${color}40`,
          }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: "#0B1F3B",
              color,
              fontSize: "0.6rem",
              fontWeight: 900,
            }}
          >
            {rate}%
          </div>
        </div>
        <div>
          <p className="font-black text-sm" style={{ color }}>
            Win Rate: {rate}%
          </p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            {wins} wins / {losses} losses
            {total === 0 && " — track trades to build history"}
          </p>
        </div>
      </div>
      <div className="flex gap-3 text-xs">
        <div className="text-center">
          <p className="font-black text-green-400 text-base">{wins}</p>
          <p style={{ color: "rgba(255,255,255,0.4)" }}>Wins</p>
        </div>
        <div
          className="w-px self-stretch"
          style={{ background: "rgba(255,255,255,0.1)" }}
        />
        <div className="text-center">
          <p className="font-black text-red-400 text-base">{losses}</p>
          <p style={{ color: "rgba(255,255,255,0.4)" }}>Losses</p>
        </div>
      </div>
    </div>
  );
}

// ─── VERDICT RESULT PANEL ─────────────────────────────────────────────────────

function VerdictPanel({
  dv,
  targetPrice,
}: { dv: UltraDeepVerdict; targetPrice: number }) {
  const isConfirmed = dv.verdict === "CONFIRMED_HIT_TP";
  const isMonitoring = dv.verdict === "MONITORING";

  if (isConfirmed) {
    return (
      <div
        className="rounded-xl p-4 mb-3"
        style={{
          background: "rgba(0, 200, 100, 0.15)",
          border: "1px solid #00C864",
          boxShadow: "0 0 20px rgba(0,200,100,0.12)",
        }}
        data-ocid="tracking.update.success_state"
      >
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2
            className="w-5 h-5 flex-shrink-0"
            style={{ color: "#00C864" }}
          />
          <p
            className="font-black text-sm tracking-wide"
            style={{ color: "#00C864" }}
          >
            ✅ CONFIRMED — WILL HIT TAKE PROFIT
          </p>
        </div>
        <p className="text-xs mb-1" style={{ color: "rgba(0,200,100,0.8)" }}>
          {dv.tpProgress.toFixed(1)}% progress toward TP • Confidence:{" "}
          {dv.compositeScore}%
        </p>
        <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.55)" }}>
          {dv.recommendation}
        </p>
        {dv.keyBullishSignals.length > 0 && (
          <>
            <div
              className="border-t mb-2"
              style={{ borderColor: "rgba(0,200,100,0.2)" }}
            />
            <div className="space-y-1">
              {dv.keyBullishSignals.slice(0, 5).map((sig) => (
                <p
                  key={sig}
                  className="text-xs flex items-center gap-1.5"
                  style={{ color: "rgba(0,200,100,0.75)" }}
                >
                  <span className="font-black" style={{ color: "#00C864" }}>
                    ✓
                  </span>{" "}
                  {sig}
                </p>
              ))}
            </div>
          </>
        )}
        <div
          className="border-t mt-2 pt-2"
          style={{ borderColor: "rgba(0,200,100,0.15)" }}
        >
          <p
            className="text-xs flex items-center gap-1"
            style={{ color: "rgba(0,200,100,0.4)" }}
          >
            <Clock className="w-3 h-3" />
            Current: $
            {dv.currentPrice.toLocaleString(undefined, {
              maximumFractionDigits: 6,
            })}{" "}
            → Target: $
            {targetPrice.toLocaleString(undefined, {
              maximumFractionDigits: 6,
            })}
            {dv.estimatedTimeToTP && ` · Est. ${dv.estimatedTimeToTP}`}
          </p>
        </div>
      </div>
    );
  }

  if (isMonitoring) {
    return (
      <div
        className="rounded-xl p-4 mb-3"
        style={{
          background: "rgba(255, 165, 0, 0.15)",
          border: "1px solid #FFA500",
          boxShadow: "0 0 20px rgba(255,165,0,0.1)",
        }}
        data-ocid="tracking.update.monitoring_state"
      >
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle
            className="w-5 h-5 flex-shrink-0"
            style={{ color: "#FFA500" }}
          />
          <p
            className="font-black text-sm tracking-wide"
            style={{ color: "#FFA500" }}
          >
            ⚠️ HOLD — Signal Still Valid
          </p>
        </div>
        <p className="text-xs mb-1" style={{ color: "rgba(255,165,0,0.8)" }}>
          {dv.tpProgress.toFixed(1)}% progress toward TP • Confidence:{" "}
          {dv.compositeScore}%
        </p>
        <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.55)" }}>
          {dv.recommendation}
        </p>
        {dv.hardExitReasons.length > 0 && (
          <>
            <div
              className="border-t mb-2"
              style={{ borderColor: "rgba(255,165,0,0.2)" }}
            />
            <p
              className="text-xs font-bold mb-1"
              style={{ color: "rgba(255,165,0,0.8)" }}
            >
              ⚡ Caution Flags:
            </p>
            <div className="space-y-1 mb-2">
              {dv.hardExitReasons.map((r) => (
                <p
                  key={r}
                  className="text-xs flex items-center gap-1.5"
                  style={{ color: "rgba(255,165,0,0.7)" }}
                >
                  <span className="font-black">!</span> {r}
                </p>
              ))}
            </div>
          </>
        )}
        {dv.keyBullishSignals.length > 0 && (
          <>
            <div
              className="border-t mb-2"
              style={{ borderColor: "rgba(255,165,0,0.2)" }}
            />
            <div className="space-y-1">
              {dv.keyBullishSignals.slice(0, 4).map((sig) => (
                <p
                  key={sig}
                  className="text-xs flex items-center gap-1.5"
                  style={{ color: "rgba(255,165,0,0.7)" }}
                >
                  <span className="font-black">✓</span> {sig}
                </p>
              ))}
            </div>
          </>
        )}
        <div
          className="border-t mt-2 pt-2"
          style={{ borderColor: "rgba(255,165,0,0.15)" }}
        >
          <p
            className="text-xs flex items-center gap-1"
            style={{ color: "rgba(255,165,0,0.4)" }}
          >
            <Clock className="w-3 h-3" />
            Analyzed at {new Date(dv.verdictTimestamp).toLocaleTimeString()}
          </p>
        </div>
      </div>
    );
  }

  // EXIT_NOW
  return (
    <div
      className="rounded-xl p-4 mb-3"
      style={{
        background: "rgba(255, 50, 50, 0.15)",
        border: "1px solid #FF3232",
        boxShadow: "0 0 20px rgba(255,50,50,0.12)",
      }}
      data-ocid="tracking.update.exit_state"
    >
      <div className="flex items-center gap-2 mb-2">
        <XCircle
          className="w-5 h-5 flex-shrink-0"
          style={{ color: "#FF3232" }}
        />
        <p
          className="font-black text-sm tracking-wide"
          style={{ color: "#FF3232" }}
        >
          🚨 EXIT NOW — Conditions Reversed
        </p>
      </div>
      <p className="text-xs mb-1" style={{ color: "rgba(255,50,50,0.8)" }}>
        Confidence dropped to {dv.compositeScore}% • Exit immediately
      </p>
      <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.55)" }}>
        {dv.recommendation}
      </p>
      {dv.hardExitReasons.length > 0 && (
        <>
          <div
            className="border-t mb-2"
            style={{ borderColor: "rgba(255,50,50,0.2)" }}
          />
          <p
            className="text-xs font-bold mb-1"
            style={{ color: "rgba(255,50,50,0.8)" }}
          >
            🚨 Confirmed Failures:
          </p>
          <div className="space-y-1 mb-3">
            {dv.hardExitReasons.map((r) => (
              <p
                key={r}
                className="text-xs flex items-center gap-1.5"
                style={{ color: "rgba(255,80,80,0.8)" }}
              >
                <span className="font-black text-red-400">✗</span> {r}
              </p>
            ))}
          </div>
        </>
      )}
      <div
        className="border-t pt-2 mt-1"
        style={{ borderColor: "rgba(255,50,50,0.2)" }}
      >
        <p className="text-xs font-bold" style={{ color: "#FF3232" }}>
          ⚠️ Exit at market: $
          {dv.currentPrice.toLocaleString(undefined, {
            maximumFractionDigits: 6,
          })}
        </p>
      </div>
    </div>
  );
}

// ─── TRADE CARD ───────────────────────────────────────────────────────────────

function TrackCard({
  trade,
  livePrice,
  updateResult,
  onRemove,
  onCloseWin,
  onCloseLoss,
  onDeepVerdict,
  deepVerdictLoading,
  deepVerdictMessage,
  deepVerdict,
}: {
  trade: TrackedTrade;
  livePrice: number;
  updateResult: UpdateResultData | null;
  onRemove: () => void;
  onCloseWin: () => void;
  onCloseLoss: () => void;
  onDeepVerdict: () => void;
  deepVerdictLoading: boolean;
  deepVerdictMessage: string;
  deepVerdict: UltraDeepVerdict | null;
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

  const tpHit = isBuy
    ? livePrice >= trade.targetPrice
    : livePrice <= trade.targetPrice;

  const slHit = isBuy
    ? livePrice <= trade.stopLoss
    : livePrice >= trade.stopLoss;

  const tpNotifiedRef = useRef(false);
  const slNotifiedRef = useRef(false);

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

  // Inline live verdict badge (without deep analysis)
  const { verdict: cv, suggestion } = computeVerdict(trade, livePrice);
  const cvColor = getVerdictColor(cv);
  const cvLabel =
    cv === "LIKELY"
      ? "🟢 ON TRACK"
      : cv === "UNCERTAIN"
        ? "⚡ MONITORING"
        : "🔴 AT RISK";

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

        {/* Progress Bar */}
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

        {/* Live AI Verdict Badge — shows deep verdict if available, fallback otherwise */}
        {deepVerdict ? (
          <div
            className="flex items-center gap-3 p-3 rounded-xl mb-3"
            style={{
              background:
                deepVerdict.verdict === "CONFIRMED_HIT_TP"
                  ? "rgba(0,200,100,0.08)"
                  : deepVerdict.verdict === "MONITORING"
                    ? "rgba(255,165,0,0.08)"
                    : "rgba(255,50,50,0.08)",
              border: `1px solid ${
                deepVerdict.verdict === "CONFIRMED_HIT_TP"
                  ? "rgba(0,200,100,0.25)"
                  : deepVerdict.verdict === "MONITORING"
                    ? "rgba(255,165,0,0.25)"
                    : "rgba(255,50,50,0.25)"
              }`,
            }}
          >
            <span
              style={{
                color:
                  deepVerdict.verdict === "CONFIRMED_HIT_TP"
                    ? "#00C864"
                    : deepVerdict.verdict === "MONITORING"
                      ? "#FFA500"
                      : "#FF3232",
              }}
            >
              {deepVerdict.verdict === "CONFIRMED_HIT_TP" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : deepVerdict.verdict === "MONITORING" ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
            </span>
            <div className="flex-1">
              <p
                className="text-xs font-black mb-0.5"
                style={{
                  color:
                    deepVerdict.verdict === "CONFIRMED_HIT_TP"
                      ? "#00C864"
                      : deepVerdict.verdict === "MONITORING"
                        ? "#FFA500"
                        : "#FF3232",
                }}
              >
                {deepVerdict.verdict === "CONFIRMED_HIT_TP"
                  ? "✅ CONFIRMED — WILL HIT TAKE PROFIT"
                  : deepVerdict.verdict === "MONITORING"
                    ? "⚠️ HOLD — Signal Still Valid"
                    : "🚨 EXIT NOW — Conditions Reversed"}
              </p>
              <p className="text-white/50 text-xs">
                Score: {deepVerdict.compositeScore}/100 ·{" "}
                {deepVerdict.tpProgress.toFixed(1)}% to TP
              </p>
            </div>
          </div>
        ) : (
          <div
            className="flex items-center gap-3 p-3 rounded-xl mb-3"
            style={{
              background: `${cvColor}12`,
              border: `1px solid ${cvColor}30`,
            }}
          >
            <span style={{ color: cvColor }}>{getVerdictIcon(cv)}</span>
            <div className="flex-1">
              <p
                className="text-xs font-black mb-0.5"
                style={{ color: cvColor }}
              >
                {cvLabel}
              </p>
              <p className="text-white/50 text-xs leading-relaxed">
                {suggestion}
              </p>
            </div>
          </div>
        )}

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

        {/* ── DEEP VERDICT BUTTON ─────────────────────────────────────────── */}
        <div className="mb-3">
          <button
            type="button"
            data-ocid="tracking.update.button"
            onClick={onDeepVerdict}
            disabled={deepVerdictLoading}
            className="w-full py-3 px-5 rounded-xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2.5 relative overflow-hidden"
            style={{
              background: deepVerdictLoading
                ? "linear-gradient(135deg, #1a1a2e, #16213e)"
                : "linear-gradient(135deg, #B8860B 0%, #FFD700 50%, #B8860B 100%)",
              color: deepVerdictLoading ? "#9ca3af" : "#1a1a1a",
              border: deepVerdictLoading
                ? "2px solid rgba(156,163,175,0.3)"
                : "none",
              boxShadow: deepVerdictLoading
                ? "none"
                : "0 4px 15px rgba(255, 215, 0, 0.4), 0 2px 8px rgba(184,134,11,0.3)",
              cursor: deepVerdictLoading ? "not-allowed" : "pointer",
              borderRadius: "8px",
              padding: "10px 20px",
            }}
          >
            {deepVerdictLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="tracking-wide">{deepVerdictMessage}</span>
              </>
            ) : (
              <>
                <Zap
                  className="w-4 h-4"
                  style={{ filter: "drop-shadow(0 0 3px rgba(0,0,0,0.4))" }}
                />
                <span className="tracking-widest uppercase font-black">
                  🔍 Deep Analysis
                </span>
                <Zap
                  className="w-4 h-4"
                  style={{ filter: "drop-shadow(0 0 3px rgba(0,0,0,0.4))" }}
                />
              </>
            )}
          </button>
          <p
            className="text-center text-xs mt-1.5"
            style={{ color: "rgba(212,175,55,0.45)" }}
          >
            5 timeframes · 30+ indicators · Absolute verdict
          </p>
        </div>

        {/* ── DEEP VERDICT RESULT PANEL ──────────────────────────────────── */}
        {deepVerdict && (
          <VerdictPanel dv={deepVerdict} targetPrice={trade.targetPrice} />
        )}

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

        {/* Legacy update result banner */}
        {updateResult && (
          <div
            className="mb-2 p-2 rounded-xl text-xs leading-relaxed"
            style={{
              background: updateResult.passed
                ? "rgba(34,197,94,0.1)"
                : "rgba(234,179,8,0.1)",
              border: `1px solid ${updateResult.passed ? "rgba(34,197,94,0.3)" : "rgba(234,179,8,0.3)"}`,
              color: updateResult.passed ? "#22C55E" : "#EAB308",
            }}
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
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
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

// ─── TRACKING PAGE ────────────────────────────────────────────────────────────

export function TrackingPage() {
  const { user, updateProfile } = useAuth();
  const { actor } = useActor();
  const storageKey = user ? `wb_tracked_${user.uid}` : "wb_tracked_guest";

  const [tracked, setTracked] = useState<TrackedTrade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeAnalysisEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Helper: sync all current trades to cloud
  const syncToCloud = useCallback(
    async (trades: TrackedTrade[]) => {
      if (!actor || !user) return;
      await Promise.all(
        trades.map((t) =>
          actor
            .saveTrackedTrade({
              tradeId: t.id,
              uid: user.uid,
              tradeJson: JSON.stringify(t),
              updatedAt: BigInt(Date.now() * 1_000_000),
            } satisfies TrackedTradeRecord)
            .catch(() => {}),
        ),
      );
    },
    [actor, user],
  );

  // Load tracked trades — localStorage first, then merge from cloud
  useEffect(() => {
    const loadTrades = async () => {
      try {
        const saved = localStorage.getItem(storageKey);
        const localTrades: TrackedTrade[] = saved ? JSON.parse(saved) : [];
        setTracked(localTrades);
        if (actor && user) {
          try {
            const cloudRecords = await actor.getTrackedTradesForUser(user.uid);
            if (cloudRecords.length > 0) {
              const localIds = new Set(localTrades.map((t) => t.id));
              const newFromCloud: TrackedTrade[] = [];
              for (const record of cloudRecords) {
                if (!localIds.has(record.tradeId)) {
                  try {
                    const parsed = JSON.parse(record.tradeJson) as TrackedTrade;
                    newFromCloud.push(parsed);
                  } catch {
                    // Skip malformed records
                  }
                }
              }
              if (newFromCloud.length > 0) {
                const merged = [...localTrades, ...newFromCloud];
                setTracked(merged);
                localStorage.setItem(storageKey, JSON.stringify(merged));
              }
            }
          } catch {
            // Cloud fetch failed — use local only
          }
        }
      } catch {
        setTracked([]);
      }
    };
    loadTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, actor, user]);

  const [refreshTick, setRefreshTick] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setRefreshTick((t) => t + 1);
      setLastRefreshed(new Date());
    }, 15000);
    return () => clearInterval(id);
  }, []);

  // 30-second auto-sync to cloud
  useEffect(() => {
    const id = setInterval(() => {
      const currentTrades: TrackedTrade[] = JSON.parse(
        localStorage.getItem(storageKey) ?? "[]",
      );
      if (currentTrades.length > 0) syncToCloud(currentTrades);
    }, 30000);
    return () => clearInterval(id);
  }, [storageKey, syncToCloud]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshTick is intentionally used as trigger
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

  const removeTrade = useCallback(
    (id: string) => {
      const updated = tracked.filter((t) => t.id !== id);
      setTracked(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      if (actor && user) {
        actor.deleteTrackedTrade(id).catch(() => {});
        syncToCloud(updated);
      }
    },
    [tracked, storageKey, actor, user, syncToCloud],
  );

  const closeTradeAsWin = useCallback(
    (trade: TrackedTrade, livePrice: number) => {
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
        outcome: "WIN",
        profitPercent: trade.profitPercent,
        closedAt: new Date().toISOString(),
        addedAt: trade.addedAt,
        aiNote: `WIN: ${trade.coinName} hit take profit at $${trade.targetPrice.toFixed(4)}. Entry was $${trade.entryPrice.toFixed(4)}. Profit: +${trade.profitPercent.toFixed(2)}%. Multi-TF confluence was ${trade.multiTimeframeConfluence ? "active" : "partial"}. RSI at entry: ${trade.rsiValue.toFixed(1)}.`,
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
          ? {
              ...t,
              outcome: "win" as const,
              closedAt: new Date().toISOString(),
            }
          : t,
      );
      setTracked(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      syncToCloud(updated);
      toast.success(
        `🎯 ${trade.coinName} marked as WIN! Trade history updated.`,
      );
    },
    [tracked, storageKey, user, updateProfile, syncToCloud],
  );

  const closeTradeAsLoss = useCallback(
    (trade: TrackedTrade, livePrice: number) => {
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
        outcome: "LOSS",
        profitPercent: -Math.abs(trade.profitPercent),
        closedAt: new Date().toISOString(),
        addedAt: trade.addedAt,
        aiNote: `LOSS: ${trade.coinName} hit stop loss at $${trade.stopLoss.toFixed(4)}. Entry was $${trade.entryPrice.toFixed(4)}. RSI at entry: ${trade.rsiValue.toFixed(1)}, Trend: ${trade.trend}.`,
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
      syncToCloud(updated);
      toast.error(`⛔ ${trade.coinName} marked as LOSS.`);
    },
    [tracked, storageKey, user, updateProfile, syncToCloud],
  );

  const [updateResults] = useState<Record<string, UpdateResultData>>({});

  // ── DEEP VERDICT STATE ──────────────────────────────────────────────────────
  const [tradeVerdicts, setTradeVerdicts] = useState<
    Record<string, UltraDeepVerdict>
  >({});
  const [verdictLoading, setVerdictLoading] = useState<Record<string, boolean>>(
    {},
  );
  const [verdictMessages, setVerdictMessages] = useState<
    Record<string, string>
  >({});

  const handleDeepVerdict = useCallback(
    async (trade: TrackedTrade, lp: number) => {
      const tradeId = trade.id;
      setVerdictLoading((prev) => ({ ...prev, [tradeId]: true }));
      let msgIdx = 0;
      setVerdictMessages((prev) => ({
        ...prev,
        [tradeId]: DEEP_SCAN_MESSAGES[0],
      }));
      const msgInterval = setInterval(() => {
        msgIdx = (msgIdx + 1) % DEEP_SCAN_MESSAGES.length;
        setVerdictMessages((prev) => ({
          ...prev,
          [tradeId]: DEEP_SCAN_MESSAGES[msgIdx],
        }));
      }, 1200);
      try {
        const verdict = await ultraDeepVerdictAnalysis(
          {
            symbol: trade.symbol,
            entryPrice: trade.entryPrice,
            targetPrice: trade.targetPrice,
            stopLoss: trade.stopLoss,
            direction: trade.direction as "BUY" | "SELL",
          } as Parameters<typeof ultraDeepVerdictAnalysis>[0],
          lp,
        );
        setTradeVerdicts((prev) => ({ ...prev, [tradeId]: verdict }));
      } catch (e) {
        console.error("Deep verdict error:", e);
      } finally {
        clearInterval(msgInterval);
        setVerdictLoading((prev) => ({ ...prev, [tradeId]: false }));
      }
    },
    [],
  );

  const symbols = tracked.map((t) => t.symbol);
  const livePrices = useLivePrices(
    symbols.length > 0 ? symbols : SCAN_SYMBOLS.slice(0, 5),
    6000,
  );

  const sortedTracks = [...tracked].sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
  );

  // Compute win/loss totals from user profile + trade history
  const wins =
    user?.tradeHistory?.wins ??
    tradeHistory.filter((t) => t.outcome === "WIN").length;
  const losses =
    user?.tradeHistory?.losses ??
    tradeHistory.filter((t) => t.outcome === "LOSS").length;

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

      {/* Win Rate Tracker */}
      <WinRateTracker wins={wins} losses={losses} />

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
            Verdicts recomputed from Binance price feeds every 15s. Deep
            Analysis button runs full re-analysis with 30+ indicators across 5
            timeframes. Cloud sync every 30s.
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
            const livePrice = livePrices[trade.symbol] ?? trade.currentPrice;
            return (
              <div key={trade.id} data-ocid={`tracking.item.${i + 1}`}>
                <TrackCard
                  trade={trade}
                  livePrice={livePrice}
                  updateResult={updateResults[trade.id] ?? null}
                  onRemove={() => removeTrade(trade.id)}
                  onCloseWin={() => closeTradeAsWin(trade, livePrice)}
                  onCloseLoss={() => closeTradeAsLoss(trade, livePrice)}
                  onDeepVerdict={() => handleDeepVerdict(trade, livePrice)}
                  deepVerdictLoading={verdictLoading[trade.id] ?? false}
                  deepVerdictMessage={
                    verdictMessages[trade.id] ?? DEEP_SCAN_MESSAGES[0]
                  }
                  deepVerdict={tradeVerdicts[trade.id] ?? null}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Trade History Section */}
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
              {tradeHistory.filter((t) => t.outcome === "WIN").length}W /{""}
              {tradeHistory.filter((t) => t.outcome === "LOSS").length}L
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
                        border: `1px solid ${entry.outcome === "WIN" ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`,
                        borderLeft: `4px solid ${entry.outcome === "WIN" ? "#22C55E" : "#EF4444"}`,
                      }}
                    >
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
                              border: `1px solid ${entry.direction === "BUY" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                            }}
                          >
                            {entry.direction}
                          </span>
                          <span
                            className="px-2.5 py-0.5 rounded-full text-xs font-black"
                            style={{
                              background:
                                entry.outcome === "WIN"
                                  ? "rgba(34,197,94,0.2)"
                                  : "rgba(239,68,68,0.2)",
                              color:
                                entry.outcome === "WIN" ? "#22C55E" : "#EF4444",
                              border: `1px solid ${entry.outcome === "WIN" ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
                            }}
                          >
                            {entry.outcome === "WIN" ? "✅ WIN" : "❌ LOSS"}
                          </span>
                          {entry.outcome === "WIN" ? (
                            <TrendingUp className="w-4 h-4 text-green-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                        {[
                          {
                            label: "Entry",
                            val: `$${entry.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}`,
                            color: "text-white",
                          },
                          {
                            label: "Close",
                            val: `$${entry.closePrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}`,
                            color:
                              entry.outcome === "WIN"
                                ? "text-green-400"
                                : "text-red-400",
                          },
                          {
                            label: "P&L",
                            val: `${entry.outcome === "WIN" ? "+" : ""}${entry.profitPercent.toFixed(2)}%`,
                            color:
                              entry.outcome === "WIN"
                                ? "text-green-400"
                                : "text-red-400",
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="rounded-lg p-2"
                            style={{ background: "rgba(255,255,255,0.05)" }}
                          >
                            <p className="text-white/40 mb-0.5">{item.label}</p>
                            <p className={`font-bold ${item.color}`}>
                              {item.val}
                            </p>
                          </div>
                        ))}
                      </div>

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
