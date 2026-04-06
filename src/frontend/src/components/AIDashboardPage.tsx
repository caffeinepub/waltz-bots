import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Cpu,
  Database,
  Power,
  RefreshCw,
  TrendingUp,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

interface HistoryEntry {
  id: string;
  time: string;
  type: "learn" | "update" | "correct" | "scan";
  message: string;
}

interface FailureEntry {
  id: string;
  coin: string;
  date: string;
  reason: string;
  correction: string;
}

const INITIAL_HISTORY: HistoryEntry[] = [
  {
    id: "h1",
    time: "2 min ago",
    type: "scan",
    message: "Scanned 1,847 pairs on BingX. Identified 23 new setups.",
  },
  {
    id: "h2",
    time: "7 min ago",
    type: "learn",
    message: "Learned 12 new BTC/USDT price patterns from past 48h data.",
  },
  {
    id: "h3",
    time: "15 min ago",
    type: "update",
    message: "Updated ETH prediction model: improved accuracy +0.3%.",
  },
  {
    id: "h4",
    time: "32 min ago",
    type: "correct",
    message: "Corrected SOL signal threshold after minor timing deviation.",
  },
  {
    id: "h5",
    time: "1h ago",
    type: "scan",
    message: "Full market re-scan complete. 1,847 assets analyzed.",
  },
  {
    id: "h6",
    time: "1.5h ago",
    type: "learn",
    message: "Ingested 340 new candlestick sequences for AVAX model.",
  },
  {
    id: "h7",
    time: "2h ago",
    type: "update",
    message: "Rebalanced confidence weights for SELL signals (+0.5% accuracy).",
  },
  {
    id: "h8",
    time: "3h ago",
    type: "correct",
    message: "Adjusted entry tolerance for LINK after market gap analysis.",
  },
];

const FAILURES: FailureEntry[] = [
  {
    id: "f1",
    coin: "MATIC",
    date: "2026-04-04",
    reason: "Sudden whale sell-off bypassed RSI filter.",
    correction: "Added whale wallet monitoring to signal validation layer.",
  },
  {
    id: "f2",
    coin: "DOGE",
    date: "2026-03-28",
    reason: "Social sentiment spike caused abnormal volatility.",
    correction: "Integrated Twitter/X sentiment score as secondary filter.",
  },
  {
    id: "f3",
    coin: "XRP",
    date: "2026-03-15",
    reason: "Unexpected regulatory news during signal window.",
    correction:
      "News feed monitoring now runs in parallel with signal generation.",
  },
];

const HISTORY_ICON: Record<
  HistoryEntry["type"],
  React.ComponentType<{ className?: string }>
> = {
  learn: Brain,
  update: RefreshCw,
  correct: CheckCircle2,
  scan: Cpu,
};

const HISTORY_COLOR: Record<HistoryEntry["type"], string> = {
  learn: "#D4AF37",
  update: "#2F6FED",
  correct: "#22C55E",
  scan: "#8B5CF6",
};

interface AIDashboardProps {
  isAdminView?: boolean;
  onToggleAutoLearn?: (v: boolean) => void;
  onToggleAutoSignal?: (v: boolean) => void;
  onToggleAutoUpdate?: (v: boolean) => void;
}

export function AIDashboardPage({
  isAdminView = false,
  onToggleAutoLearn,
  onToggleAutoSignal,
  onToggleAutoUpdate,
}: AIDashboardProps) {
  const [autoLearn, setAutoLearn] = useState(true);
  const [autoSignal, setAutoSignal] = useState(true);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(INITIAL_HISTORY);
  const [accuracy, setAccuracy] = useState(96.3);
  const [trainCycles, setTrainCycles] = useState(1247);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [failures, setFailures] = useState<FailureEntry[]>(FAILURES);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setPulse((p) => !p);
      if (Math.random() < 0.3) {
        setTrainCycles((c) => c + 1);
        setAccuracy((a) => Math.min(99.9, a + (Math.random() - 0.3) * 0.05));
        const types: HistoryEntry["type"][] = ["scan", "learn", "update"];
        const messages = {
          scan: `Scanned ${Math.floor(1800 + Math.random() * 50)} pairs. Found ${Math.floor(5 + Math.random() * 20)} new setups.`,
          learn: `Learned ${Math.floor(5 + Math.random() * 15)} new patterns from latest market data.`,
          update: `Updated model weights. Accuracy improved +${(Math.random() * 0.2).toFixed(2)}%.`,
        };
        const t2 = types[Math.floor(Math.random() * types.length)];
        const newEntry: HistoryEntry = {
          id: `h-${Date.now()}`,
          time: "just now",
          type: t2,
          message: messages[t2],
        };
        setHistory((prev) => [newEntry, ...prev].slice(0, 20));
      }
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const visibleHistory = showAllHistory ? history : history.slice(0, 5);

  return (
    <div className="space-y-6" data-ocid="ai_dashboard.page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy font-display flex items-center gap-3">
            <Brain className="w-6 h-6 text-gold" />
            AI System Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Real-time AI engine monitoring and control
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: autoLearn
              ? "rgba(34,197,94,0.12)"
              : "rgba(239,68,68,0.1)",
            border: `1px solid ${autoLearn ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.2)"}`,
          }}
        >
          <Circle
            className="w-3 h-3"
            style={{
              fill: autoLearn ? "#22C55E" : "#EF4444",
              color: autoLearn ? "#22C55E" : "#EF4444",
              animation: pulse ? "none" : "live-pulse 1.4s infinite",
            }}
          />
          <span
            className="text-xs font-bold"
            style={{ color: autoLearn ? "#16A34A" : "#EF4444" }}
          >
            {autoLearn ? "ACTIVE — Auto-learning" : "PAUSED"}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Model Size",
            value: "2.4 GB",
            icon: Database,
            color: "#2F6FED",
          },
          {
            label: "Training Cycles",
            value: trainCycles.toLocaleString(),
            icon: RefreshCw,
            color: "#D4AF37",
          },
          {
            label: "Accuracy",
            value: `${accuracy.toFixed(1)}%`,
            icon: TrendingUp,
            color: "#22C55E",
          },
          { label: "Uptime", value: "99.7%", icon: Activity, color: "#8B5CF6" },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="stat-card p-4"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
              style={{ background: `${stat.color}15` }}
            >
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
            <p className="font-bold text-2xl text-navy">{stat.value}</p>
            <p className="text-xs text-gray-400">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Breaker Controls */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Power className="w-5 h-5 text-gold" />
          <h2 className="font-bold text-navy">Breaker Controls</h2>
          {!isAdminView && (
            <Badge className="ml-auto bg-gray-100 text-gray-500 border-gray-200 text-xs">
              View Only
            </Badge>
          )}
        </div>
        <div className="space-y-4">
          {[
            {
              label: "Auto-Learn",
              desc: "AI continuously learns from new market data and signal outcomes",
              value: autoLearn,
              onChange: (v: boolean) => {
                setAutoLearn(v);
                onToggleAutoLearn?.(v);
              },
              ocid: "ai_dashboard.auto_learn.switch",
            },
            {
              label: "Auto-Signal",
              desc: "AI automatically generates new signals when patterns are detected",
              value: autoSignal,
              onChange: (v: boolean) => {
                setAutoSignal(v);
                onToggleAutoSignal?.(v);
              },
              ocid: "ai_dashboard.auto_signal.switch",
            },
            {
              label: "Auto-Update",
              desc: "AI can push model updates and parameter adjustments automatically",
              value: autoUpdate,
              onChange: (v: boolean) => {
                setAutoUpdate(v);
                onToggleAutoUpdate?.(v);
              },
              ocid: "ai_dashboard.auto_update.switch",
            },
          ].map((control) => (
            <div
              key={control.label}
              className="flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-navy text-sm">
                  {control.label}
                </p>
                <p className="text-gray-400 text-xs">{control.desc}</p>
              </div>
              <Switch
                data-ocid={control.ocid}
                checked={control.value}
                onCheckedChange={isAdminView ? control.onChange : undefined}
                disabled={!isAdminView}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Learning History */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold" />
            <h2 className="font-bold text-navy">Learning History</h2>
            <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-xs">
              LIVE
            </Badge>
          </div>
          <Button
            data-ocid="ai_dashboard.toggle.button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAllHistory((v) => !v)}
            className="text-xs text-gray-500"
          >
            {showAllHistory ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            {showAllHistory ? "Show Less" : "Show All"}
          </Button>
        </div>
        <div className="space-y-3" data-ocid="ai_dashboard.list">
          {visibleHistory.map((entry, i) => {
            const Icon = HISTORY_ICON[entry.type];
            const color = HISTORY_COLOR[entry.type];
            return (
              <motion.div
                key={entry.id}
                data-ocid={`ai_dashboard.item.${i + 1}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-start gap-3"
              >
                <div
                  className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: `${color}15` }}
                >
                  <span style={{ color }}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-navy text-xs font-medium">
                    {entry.message}
                  </p>
                  <p className="text-gray-400 text-xs">{entry.time}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Failure Log */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <h2 className="font-bold text-navy">Failure Log</h2>
            <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 text-xs">
              {failures.length} total
            </Badge>
          </div>
          {isAdminView && (
            <Button
              data-ocid="ai_dashboard.delete_button"
              variant="ghost"
              size="sm"
              onClick={() => setFailures([])}
              className="text-xs text-red-500 hover:text-red-600"
            >
              Reset Log
            </Button>
          )}
        </div>
        {failures.length === 0 ? (
          <div
            className="flex items-center gap-2 text-green-600 py-4"
            data-ocid="ai_dashboard.empty_state"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">
              No failures recorded — clean slate!
            </span>
          </div>
        ) : (
          <div className="space-y-3" data-ocid="failures.list">
            {failures.map((f, i) => (
              <div
                key={f.id}
                data-ocid={`failures.item.${i + 1}`}
                className="rounded-xl p-4"
                style={{
                  background: "rgba(239,68,68,0.05)",
                  border: "1px solid rgba(239,68,68,0.1)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-navy text-sm">
                      {f.coin}
                    </span>
                    <Badge className="bg-red-500/15 text-red-500 border-red-500/20 text-xs">
                      MISS
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-400">{f.date}</span>
                </div>
                <p className="text-gray-600 text-xs mb-1">
                  <span className="font-semibold">Reason:</span> {f.reason}
                </p>
                <p className="text-gray-600 text-xs">
                  <span className="font-semibold text-green-600">
                    Fix applied:
                  </span>{" "}
                  {f.correction}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Changes summary */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-gold" />
          <h2 className="font-bold text-navy">AI Model Changes</h2>
        </div>
        <div className="space-y-2 text-xs text-gray-600">
          {[
            {
              date: "2026-04-05",
              change:
                "Increased SOL signal sensitivity by 8% after market structure analysis",
            },
            {
              date: "2026-04-03",
              change:
                "Added news sentiment layer to pre-filter signals before technical analysis",
            },
            {
              date: "2026-03-30",
              change:
                "Retrained BTC model on 6-month dataset. Accuracy improved +1.2%",
            },
            {
              date: "2026-03-25",
              change:
                "Whale wallet tracking integrated into confirmation layer",
            },
            {
              date: "2026-03-20",
              change:
                "New pattern recognition model deployed for small-cap coins",
            },
          ].map((item) => (
            <div
              key={item.date}
              className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0"
            >
              <span className="text-gray-400 font-mono flex-shrink-0">
                {item.date}
              </span>
              <span>{item.change}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
