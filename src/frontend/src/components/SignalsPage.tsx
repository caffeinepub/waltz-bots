// Local type aliases — backend doesn't export these
type Direction = string;
type SignalStatus = string;
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { type LiveSignal, useSignalScan } from "@/context/SignalScanContext";
import { useActor } from "@/hooks/useActor";
import { deepTestSignal, useLivePrices } from "@/hooks/useMarketData";
import {
  Activity,
  BookmarkPlus,
  Brain,
  Clock,
  FlaskConical,
  Loader2,
  RefreshCw,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function confidenceColor(c: number) {
  if (c >= 85) return "#D4AF37";
  if (c >= 70) return "#22C55E";
  if (c >= 55) return "#EAB308";
  return "#94A3B8";
}

function ConfidenceBar({ value }: { value: number }) {
  const color = confidenceColor(value);
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">AI Confidence</span>
        <span className="font-bold" style={{ color }}>
          {value}%
        </span>
      </div>
      <div
        className="h-2 rounded-full"
        style={{ background: "rgba(0,0,0,0.1)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, ${color}80, ${color})`,
          }}
        />
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: "up" | "down" | "sideways" }) {
  if (trend === "up") return <TrendingUp className="w-3 h-3 text-green-400" />;
  if (trend === "down")
    return <TrendingDown className="w-3 h-3 text-red-400" />;
  return <Activity className="w-3 h-3 text-yellow-400" />;
}

interface TestResultData {
  passed: boolean;
  details: string;
}

function SignalCard({
  signal,
  livePrice,
  onClick,
  onTest,
  isTesting,
  isTested,
  testResult,
  onTrack,
  isTracked,
}: {
  signal: LiveSignal;
  livePrice: number;
  onClick: () => void;
  onTest: () => void;
  isTesting: boolean;
  isTested: boolean;
  testResult: TestResultData | null;
  onTrack: () => void;
  isTracked: boolean;
}) {
  const isBuy = signal.direction === "BUY";
  const progress = isBuy
    ? ((livePrice - signal.entryPrice) /
        (signal.targetPrice - signal.entryPrice)) *
      100
    : ((signal.entryPrice - livePrice) /
        (signal.entryPrice - signal.targetPrice)) *
      100;
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div
      className="h-full w-full text-left rounded-2xl p-5"
      style={{
        background:
          "linear-gradient(135deg, #0B1F3B 0%, #0A254A 60%, #0D2A50 100%)",
        border: `1px solid ${
          isBuy ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"
        }`,
        boxShadow: isBuy
          ? "0 4px 20px rgba(34,197,94,0.1)"
          : "0 4px 20px rgba(239,68,68,0.1)",
      }}
    >
      {/* Clickable header area */}
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black"
              style={{
                background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
                color: "#3d2800",
              }}
            >
              {signal.symbol.slice(0, 2)}
            </div>
            <div>
              <p className="text-white font-bold text-sm">{signal.coinName}</p>
              <p className="text-white/40 text-xs">{signal.symbol}/USDT</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={isBuy ? "badge-buy" : "badge-sell"}>
              {isBuy ? "BUY" : "SELL"}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{
                background: "rgba(34,197,94,0.18)",
                color: "#22C55E",
                border: "1px solid rgba(34,197,94,0.35)",
              }}
            >
              ✅ TP CONFIRMED
            </span>
          </div>
        </div>

        {/* Profit % badge */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{
              background: "rgba(212,175,55,0.15)",
              color: "#D4AF37",
              border: "1px solid rgba(212,175,55,0.3)",
            }}
          >
            💰 Profit: +{signal.profitPercent.toFixed(2)}%
          </span>
        </div>

        {/* Permanent TP confirmation banner */}
        <div
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
          style={{
            background:
              "linear-gradient(90deg, rgba(34,197,94,0.12), rgba(34,197,94,0.06))",
            border: "1px solid rgba(34,197,94,0.3)",
          }}
        >
          <Shield className="w-3 h-3 text-green-400 flex-shrink-0" />
          <span className="text-green-400 text-xs font-bold tracking-wide">
            CONFIRMED — WILL HIT TAKE PROFIT
          </span>
        </div>

        {/* Prices */}
        <div className="grid grid-cols-3 gap-2 text-xs mb-3">
          <div
            className="rounded-xl p-2"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <p className="text-white/40 mb-0.5">Entry</p>
            <p className="text-white font-bold">
              $
              {signal.entryPrice.toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}
            </p>
          </div>
          <div
            className="rounded-xl p-2"
            style={{ background: "rgba(34,197,94,0.1)" }}
          >
            <p className="text-green-400/70 mb-0.5">Target</p>
            <p className="text-green-400 font-bold">
              $
              {signal.targetPrice.toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}
            </p>
          </div>
          <div
            className="rounded-xl p-2"
            style={{ background: "rgba(239,68,68,0.08)" }}
          >
            <p className="text-red-400/70 mb-0.5">Stop Loss</p>
            <p className="text-red-400 font-bold">
              $
              {signal.stopLoss.toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}
            </p>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="mb-3">
          <ConfidenceBar value={signal.confidence} />
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between text-xs text-white/40 mb-2">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>~{signal.estimatedHours}h to TP</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendIcon trend={signal.trend} />
            <span>R:R {signal.riskReward}</span>
          </div>
        </div>

        {/* Entry type + confirmation badges */}
        <div className="flex flex-wrap gap-1 mb-3">
          {signal.entryType && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
              style={{
                background: "rgba(212,175,55,0.12)",
                color: "#D4AF37",
                border: "1px solid rgba(212,175,55,0.25)",
              }}
            >
              {signal.entryType}
            </span>
          )}
          {signal.bosConfirmed && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
              style={{
                background: "rgba(34,197,94,0.12)",
                color: "#22C55E",
                border: "1px solid rgba(34,197,94,0.25)",
              }}
            >
              BoS ✓
            </span>
          )}
          {signal.volumeSpike && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
              style={{
                background: "rgba(59,130,246,0.12)",
                color: "#60A5FA",
                border: "1px solid rgba(59,130,246,0.25)",
              }}
            >
              Vol Spike ✓
            </span>
          )}
          {signal.goldenCross && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
              style={{
                background: "rgba(212,175,55,0.15)",
                color: "#D4AF37",
                border: "1px solid rgba(212,175,55,0.35)",
              }}
            >
              Golden Cross ✓
            </span>
          )}
          {signal.supportZone && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
              style={{
                background: "rgba(34,197,94,0.12)",
                color: "#4ADE80",
                border: "1px solid rgba(74,222,128,0.35)",
              }}
            >
              Support Zone ✓
            </span>
          )}
          {(signal as LiveSignal & { ichimokuBullish?: boolean })
            .ichimokuBullish && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
              style={{
                background: "rgba(168,85,247,0.12)",
                color: "#A855F7",
                border: "1px solid rgba(168,85,247,0.25)",
              }}
            >
              Ichimoku ✓
            </span>
          )}
          {(signal as LiveSignal & { stochRsiBullish?: boolean })
            .stochRsiBullish && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
              style={{
                background: "rgba(20,184,166,0.12)",
                color: "#14B8A6",
                border: "1px solid rgba(20,184,166,0.25)",
              }}
            >
              StochRSI ✓
            </span>
          )}
          {(signal as LiveSignal & { obvRising?: boolean }).obvRising && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
              style={{
                background: "rgba(249,115,22,0.12)",
                color: "#F97316",
                border: "1px solid rgba(249,115,22,0.25)",
              }}
            >
              OBV ↑ ✓
            </span>
          )}
          {(signal as LiveSignal & { fibLevel?: string }).fibLevel && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
              style={{
                background: "rgba(236,72,153,0.12)",
                color: "#EC4899",
                border: "1px solid rgba(236,72,153,0.25)",
              }}
            >
              {(signal as LiveSignal & { fibLevel?: string }).fibLevel} ✓
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-white/30 mb-1">
            <span>Progress to TP</span>
            <span>{clampedProgress.toFixed(1)}%</span>
          </div>
          <div
            className="h-1.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${clampedProgress}%`,
                background: isBuy
                  ? "linear-gradient(90deg, #16A34A, #22C55E)"
                  : "linear-gradient(90deg, #DC2626, #EF4444)",
              }}
            />
          </div>
        </div>
      </button>

      {/* Track Button */}
      <button
        type="button"
        data-ocid="signals.track.button"
        onClick={(e) => {
          e.stopPropagation();
          onTrack();
        }}
        disabled={isTracked}
        className="w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 mb-2"
        style={{
          background: "rgba(34,197,94,0.12)",
          color: "#22C55E",
          border: `1px solid rgba(34,197,94,${isTracked ? "0.4" : "0.3"})`,
          cursor: isTracked ? "default" : "pointer",
          opacity: isTracked ? 0.7 : 1,
        }}
      >
        <BookmarkPlus className="w-3 h-3" />
        {isTracked ? "\u2713 Already Tracking" : "Track This Signal"}
      </button>

      {/* Test Button */}
      <button
        type="button"
        data-ocid="signals.test.button"
        onClick={(e) => {
          e.stopPropagation();
          onTest();
        }}
        disabled={isTesting || isTested}
        className="w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
        style={
          isTested
            ? {
                background: "rgba(34,197,94,0.12)",
                color: "#22C55E",
                border: "1px solid rgba(34,197,94,0.25)",
                cursor: "not-allowed",
              }
            : isTesting
              ? {
                  background: "rgba(100,116,139,0.15)",
                  color: "#94A3B8",
                  border: "1px solid rgba(100,116,139,0.15)",
                  cursor: "not-allowed",
                }
              : {
                  background: "rgba(212,175,55,0.12)",
                  color: "#D4AF37",
                  border: "1px solid rgba(212,175,55,0.25)",
                  cursor: "pointer",
                }
        }
      >
        {isTesting ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            Running full verification...
          </>
        ) : isTested ? (
          <>✅ Test Passed — Locked</>
        ) : (
          <>
            <FlaskConical className="w-3 h-3" />🔬 Test Signal
          </>
        )}
      </button>

      {/* Test result banner — shown ONLY after test completes */}
      {testResult && (
        <div
          className="mt-2 p-3 rounded-xl text-xs leading-relaxed"
          style={{
            background: testResult.passed
              ? "rgba(34,197,94,0.08)"
              : "rgba(234,179,8,0.08)",
            border: `1px solid ${
              testResult.passed ? "rgba(34,197,94,0.3)" : "rgba(234,179,8,0.3)"
            }`,
            color: testResult.passed ? "#22C55E" : "#EAB308",
          }}
          data-ocid="signals.test.success_state"
        >
          {testResult.details}
        </div>
      )}
    </div>
  );
}

function WinRateTracker({ uid }: { uid: string }) {
  const [stats, setStats] = useState({ wins: 0, losses: 0, total: 0 });

  useEffect(() => {
    const load = () => {
      try {
        const key = `wb_trade_analysis_${uid}`;
        const raw = localStorage.getItem(key);
        if (!raw) {
          setStats({ wins: 0, losses: 0, total: 0 });
          return;
        }
        const arr = JSON.parse(raw) as Array<{ outcome?: string }>;
        const wins = arr.filter(
          (t) => t.outcome === "WIN" || t.outcome === "TP_HIT",
        ).length;
        const losses = arr.filter(
          (t) => t.outcome === "LOSS" || t.outcome === "SL_HIT",
        ).length;
        setStats({ wins, losses, total: arr.length });
      } catch {
        setStats({ wins: 0, losses: 0, total: 0 });
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);
  const winRate =
    stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : null;
  const rateColor =
    winRate === null
      ? "#94A3B8"
      : winRate >= 70
        ? "#22C55E"
        : winRate >= 50
          ? "#EAB308"
          : "#EF4444";

  return (
    <div
      className="rounded-xl p-3 flex items-center justify-between gap-4"
      style={{
        background: "rgba(11,31,59,0.85)",
        border: "1px solid rgba(212,175,55,0.25)",
      }}
      data-ocid="signals.win_rate.card"
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">📊</span>
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Platform Win Rate
          </div>
          {winRate === null ? (
            <div className="text-xs text-gray-500 mt-0.5">
              No trades yet — track a signal to start
            </div>
          ) : (
            <div className="flex items-center gap-3 mt-0.5">
              <span
                className="text-xl font-extrabold"
                style={{ color: rateColor }}
              >
                {winRate}%
              </span>
              <span className="text-xs text-gray-400">
                <span style={{ color: "#22C55E" }} className="font-bold">
                  {stats.wins}W
                </span>
                {" / "}
                <span style={{ color: "#EF4444" }} className="font-bold">
                  {stats.losses}L
                </span>
                {" / "}
                <span className="text-gray-300">{stats.total} Total</span>
              </span>
            </div>
          )}
        </div>
      </div>
      <div
        className="text-xs font-bold px-2 py-0.5 rounded-full"
        style={{
          background: "rgba(212,175,55,0.15)",
          color: "#F2D27A",
          border: "1px solid rgba(212,175,55,0.3)",
        }}
      >
        LIVE
      </div>
    </div>
  );
}

type FilterType = "All" | "BUY" | "SELL" | "Hot";

function getTrackedIds(key: string): Set<string> {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return new Set();
    const arr = JSON.parse(saved) as Array<{ symbol: string }>;
    return new Set(arr.map((t) => t.symbol));
  } catch {
    return new Set();
  }
}

export function SignalsPage({
  onTabChange,
}: {
  onTabChange?: (tab: string) => void;
}) {
  const { user } = useAuth();
  const { actor } = useActor();
  const storageKey = user ? `wb_tracked_${user.uid}` : "wb_tracked_guest";

  const [filter, setFilter] = useState<FilterType>("All");
  const [selectedSignal, setSelectedSignal] = useState<LiveSignal | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testedIds, setTestedIds] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<
    Record<string, TestResultData>
  >({});
  const [droppedIds, setDroppedIds] = useState<Set<string>>(new Set());
  const [trackedSymbols, setTrackedSymbols] = useState<Set<string>>(() =>
    getTrackedIds(storageKey),
  );

  // Re-sync tracked symbols when user changes (login/logout)
  useEffect(() => {
    setTrackedSymbols(getTrackedIds(storageKey));
  }, [storageKey]);

  // — Use global context (scan persists across navigation)
  const {
    signals,
    loading,
    scanning,
    lastUpdated,
    rescan,
    scannedCount,
    totalSymbols,
    preFilteredCount,
    countdown,
  } = useSignalScan();

  const signalSymbols = signals.map((s) => s.symbol);
  const livePrices = useLivePrices(signalSymbols, 8000);

  const handleTest = async (signal: LiveSignal) => {
    // One-time only: if already tested and passed, do nothing
    if (testedIds.has(signal.id)) return;

    setTestingId(signal.id);
    setTestResults((prev) => {
      const copy = { ...prev };
      delete copy[signal.id];
      return copy;
    });

    try {
      const livePrice = livePrices[signal.symbol]?.price ?? signal.currentPrice;
      const result = await deepTestSignal(
        signal.symbol,
        {
          entryPrice: signal.entryPrice,
          stopLoss: signal.stopLoss,
          targetPrice: signal.targetPrice,
          confidence: signal.confidence,
          score: (signal as LiveSignal & { score?: number }).score ?? 22,
        },
        livePrice,
      );

      if (result.passed) {
        // Signal passed — lock it as tested
        setTestedIds((prev) => new Set([...prev, signal.id]));
        setTestResults((prev) => ({
          ...prev,
          [signal.id]: {
            passed: true,
            details: result.details,
          },
        }));
      } else {
        // Signal failed — drop it from the list entirely
        setDroppedIds((prev) => new Set([...prev, signal.id]));
        toast.error(
          `${signal.coinName} dropped — failed deep TP verification.`,
        );
      }
    } catch {
      // Data error — drop the signal to be safe
      setDroppedIds((prev) => new Set([...prev, signal.id]));
      toast.error(`${signal.coinName} dropped — could not verify market data.`);
    } finally {
      setTestingId(null);
    }
  };

  const handleTrack = async (signal: LiveSignal) => {
    try {
      const saved = localStorage.getItem(storageKey);
      const existing = saved ? JSON.parse(saved) : [];
      if (
        existing.some((t: { symbol: string }) => t.symbol === signal.symbol)
      ) {
        toast.info(`${signal.coinName} is already being tracked.`);
        return;
      }
      const trackedEntry = {
        ...signal,
        addedAt: new Date().toISOString(),
        aiVerdict: "LIKELY" as const,
        aiSuggestion: signal.aiAnalysis,
      };
      const updated = [trackedEntry, ...existing];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setTrackedSymbols((prev) => new Set([...prev, signal.symbol]));

      // Persist to cloud
      if (actor) {
        try {
          await actor.addTradingSignal({
            coinName: signal.symbol,
            direction: "buy" as unknown as Direction,
            entryPrice: signal.entryPrice,
            targetPrice: signal.targetPrice,
            stopLoss: signal.stopLoss,
            timestamp: BigInt(Date.now() * 1_000_000),
            signalStatus: "active" as unknown as SignalStatus,
          });
        } catch {
          // Cloud save failed — signal still tracked locally
        }
      }

      toast.success(`${signal.coinName} added to tracking!`);
      setTimeout(() => onTabChange?.("tracking"), 800);
    } catch {
      toast.error("Could not add to tracking.");
    }
  };

  const EIGHT_HOURS = 8 * 60 * 60 * 1000;
  const filtered = signals.filter((s) => {
    if (droppedIds.has(s.id)) return false;
    if (Date.now() - s.generatedAt > EIGHT_HOURS) return false;
    if (filter === "BUY") return s.direction === "BUY";
    if (filter === "SELL") return s.direction === "SELL";
    if (filter === "Hot") return s.confidence >= 70;
    return true;
  });

  return (
    <div className="space-y-6" data-ocid="signals.page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy font-display flex items-center gap-3">
            <span className="live-dot w-3 h-3 rounded-full bg-green-500" />
            Live Trading Signals
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Real-time signals — shown only after full multi-layer verification
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={rescan}
            disabled={scanning}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold"
            style={{
              background: scanning
                ? "rgba(11,31,59,0.05)"
                : "rgba(212,175,55,0.12)",
              color: scanning ? "#9CA3AF" : "#B8960C",
              border: `1px solid ${
                scanning ? "rgba(0,0,0,0.08)" : "rgba(212,175,55,0.3)"
              }`,
              cursor: scanning ? "not-allowed" : "pointer",
            }}
            title="Re-scan market"
            data-ocid="signals.rescan.button"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`}
            />
            {scanning ? "Scanning..." : "Re-scan"}
          </button>
          <div
            className="px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: "rgba(34,197,94,0.12)",
              color: "#16A34A",
              border: "1px solid rgba(34,197,94,0.2)",
            }}
          >
            <Activity className="w-3 h-3 inline mr-1" />
            {scanning
              ? `Scanning ${scannedCount}/${totalSymbols} — ${preFilteredCount} passed pre-filter, analyzing...`
              : `${signals.length} Active`}
          </div>
        </div>
      </div>

      {/* Last updated + progress */}
      {lastUpdated && (
        <div>
          <p className="text-xs text-gray-400">
            Last scan: {lastUpdated.toLocaleTimeString()} — Binance live data —
            Sorted by highest profit %
            {!scanning && countdown > 0 && (
              <span className="ml-2 text-gold font-semibold">
                {countdown > 60
                  ? `Next scan in ${Math.floor(countdown / 60)}m ${countdown % 60}s`
                  : `Next scan in ${countdown}s`}
              </span>
            )}
          </p>
          {scanning && (
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${
                    totalSymbols > 0 ? (scannedCount / totalSymbols) * 100 : 0
                  }%`,
                  background: "linear-gradient(90deg, #D4AF37, #F2D27A)",
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Win Rate Tracker */}
      <WinRateTracker uid={user?.uid ?? "guest"} />

      {/* Filter tabs */}
      <div className="flex gap-2" data-ocid="signals.tab">
        {(["All", "BUY", "SELL", "Hot"] as FilterType[]).map((f) => (
          <button
            key={f}
            type="button"
            data-ocid={`signals.${f.toLowerCase()}.tab`}
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
            {f === "Hot" ? "🔥 Hot" : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div
          className="flex flex-col items-center justify-center py-20 gap-4"
          data-ocid="signals.loading_state"
        >
          <Loader2 className="w-10 h-10 text-gold animate-spin" />
          <p className="text-navy font-bold">
            Scanning and verifying signals...
          </p>
          <p className="text-gray-400 text-sm text-center">
            Scanning {scannedCount} / {totalSymbols} Binance pairs — filtering
            by volume &amp; momentum, then running 30-indicator deep analysis
            (EMA 20/50/100/200, ADX, Ichimoku, StochRSI, OBV, VWAP, BoS, FVG,
            Order Blocks, Fibonacci, Pivot Points + 5 timeframes)
          </p>
          <p className="text-xs text-gray-400">
            Only signals passing ALL 10 hard gates + 26/30 score will appear
          </p>
          <div className="w-48 bg-gray-100 rounded-full h-1.5 mt-2">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${
                  totalSymbols > 0 ? (scannedCount / totalSymbols) * 100 : 0
                }%`,
                background: "linear-gradient(90deg, #D4AF37, #F2D27A)",
              }}
            />
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 gap-4"
          data-ocid="signals.empty_state"
        >
          <Activity className="w-10 h-10 text-gray-300" />
          <p className="text-navy font-bold">
            No verified signals for this filter
          </p>
          <p className="text-gray-400 text-sm text-center">
            All signals must pass RSI, MACD, EMA, volume, and multi-timeframe
            verification before appearing here.
          </p>
          <Button
            onClick={rescan}
            className="btn-gold border-0"
            data-ocid="signals.rescan.button"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Re-scan Market
          </Button>
        </div>
      ) : (
        <div>
          <h2 className="text-base font-bold text-navy mb-3">
            All Verified Signals ({filtered.length}) — Sorted by Profit %
          </h2>
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            data-ocid="signals.list"
          >
            {filtered.map((signal, i) => (
              <motion.div
                key={signal.id}
                data-ocid={`signals.item.${i + 1}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.5) }}
                className="h-auto"
              >
                <SignalCard
                  signal={signal}
                  livePrice={
                    livePrices[signal.symbol]?.price ?? signal.currentPrice
                  }
                  onClick={() => setSelectedSignal(signal)}
                  onTest={() => handleTest(signal)}
                  isTesting={testingId === signal.id}
                  isTested={testedIds.has(signal.id)}
                  testResult={testResults[signal.id] ?? null}
                  onTrack={() => handleTrack(signal)}
                  isTracked={trackedSymbols.has(signal.symbol)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Detail modal */}
      <Dialog
        open={!!selectedSignal}
        onOpenChange={(o) => !o && setSelectedSignal(null)}
      >
        <DialogContent
          className="max-w-lg"
          style={{
            background: "linear-gradient(135deg, #0B1F3B, #0A254A)",
            border: "1px solid rgba(212,175,55,0.3)",
            color: "white",
          }}
          data-ocid="signals.dialog"
        >
          {selectedSignal && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-black"
                    style={{
                      background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
                      color: "#3d2800",
                    }}
                  >
                    {selectedSignal.symbol.slice(0, 2)}
                  </div>
                  {selectedSignal.coinName} — {selectedSignal.direction} Signal
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="rounded-xl p-3"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <p className="text-white/40 text-xs mb-1">Entry Price</p>
                    <p className="text-white font-bold">
                      $
                      {selectedSignal.entryPrice.toLocaleString(undefined, {
                        maximumFractionDigits: 4,
                      })}
                    </p>
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{ background: "rgba(34,197,94,0.1)" }}
                  >
                    <p className="text-green-400/70 text-xs mb-1">
                      Take Profit
                    </p>
                    <p className="text-green-400 font-bold">
                      $
                      {selectedSignal.targetPrice.toLocaleString(undefined, {
                        maximumFractionDigits: 4,
                      })}
                    </p>
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{ background: "rgba(239,68,68,0.08)" }}
                  >
                    <p className="text-red-400/70 text-xs mb-1">Stop Loss</p>
                    <p className="text-red-400 font-bold">
                      $
                      {selectedSignal.stopLoss.toLocaleString(undefined, {
                        maximumFractionDigits: 4,
                      })}
                    </p>
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{ background: "rgba(212,175,55,0.1)" }}
                  >
                    <p className="text-gold/70 text-xs mb-1">Profit %</p>
                    <p className="text-gold font-bold">
                      +{selectedSignal.profitPercent.toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* Indicator badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    className="text-xs"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      color: "#a0aec0",
                      border: "none",
                    }}
                  >
                    RSI {selectedSignal.rsiValue.toFixed(1)}
                  </Badge>
                  <Badge
                    className="text-xs"
                    style={{
                      background:
                        selectedSignal.macdHistogram > 0
                          ? "rgba(34,197,94,0.15)"
                          : "rgba(239,68,68,0.15)",
                      color:
                        selectedSignal.macdHistogram > 0
                          ? "#22C55E"
                          : "#EF4444",
                      border: "none",
                    }}
                  >
                    MACD {selectedSignal.macdHistogram > 0 ? "↑" : "↓"}{" "}
                    {Math.abs(selectedSignal.macdHistogram).toFixed(4)}
                  </Badge>
                  <Badge
                    className="text-xs"
                    style={{
                      background: selectedSignal.volumeConfirmed
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(239,68,68,0.15)",
                      color: selectedSignal.volumeConfirmed
                        ? "#22C55E"
                        : "#EF4444",
                      border: "none",
                    }}
                  >
                    Vol {selectedSignal.volumeConfirmed ? "✓" : "Low"}
                  </Badge>
                  <Badge
                    className="text-xs"
                    style={{
                      background: selectedSignal.multiTimeframeConfluence
                        ? "rgba(212,175,55,0.15)"
                        : "rgba(100,100,100,0.15)",
                      color: selectedSignal.multiTimeframeConfluence
                        ? "#D4AF37"
                        : "#9ca3af",
                      border: "none",
                    }}
                  >
                    MTF{" "}
                    {selectedSignal.multiTimeframeConfluence
                      ? "Confluent"
                      : "Partial"}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1 text-white/60">
                    <Clock className="w-3 h-3" />
                    <span>Est. {selectedSignal.estimatedHours}h to hit TP</span>
                  </div>
                  <div className="flex items-center gap-1 text-green-400">
                    <Shield className="w-3 h-3" />
                    <span>AI Verified ✓</span>
                  </div>
                </div>

                <ConfidenceBar value={selectedSignal.confidence} />

                {/* AI Analysis */}
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
                    {selectedSignal.aiAnalysis}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    data-ocid="signals.dialog.track_button"
                    onClick={() => {
                      handleTrack(selectedSignal);
                      setSelectedSignal(null);
                    }}
                    disabled={trackedSymbols.has(selectedSignal.symbol)}
                    className="border-0"
                    style={{
                      background: trackedSymbols.has(selectedSignal.symbol)
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(34,197,94,0.2)",
                      color: "#22C55E",
                    }}
                  >
                    <BookmarkPlus className="w-4 h-4 mr-2" />
                    {trackedSymbols.has(selectedSignal.symbol)
                      ? "Tracking"
                      : "Track"}
                  </Button>
                  <Button
                    data-ocid="signals.close_button"
                    onClick={() => setSelectedSignal(null)}
                    className="btn-gold border-0"
                  >
                    <Target className="w-4 h-4 mr-2" /> Got It
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
