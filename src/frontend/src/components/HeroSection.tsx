import { ArrowRight, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const HERO_STATS = [
  { label: "Win Rate", value: "94.7%" },
  { label: "Active Signals", value: "83" },
  { label: "AI Accuracy", value: "96%" },
];

function MiniLiveChart() {
  const [points, setPoints] = useState<number[]>(() =>
    Array.from(
      { length: 20 },
      (_, i) => 50 + Math.sin(i * 0.5) * 15 + Math.random() * 10,
    ),
  );

  useEffect(() => {
    const t = setInterval(() => {
      setPoints((prev) => {
        const next = [...prev.slice(1)];
        const last = prev[prev.length - 1];
        next.push(
          Math.max(10, Math.min(90, last + (Math.random() - 0.45) * 8)),
        );
        return next;
      });
    }, 800);
    return () => clearInterval(t);
  }, []);

  const w = 280;
  const h = 100;
  const step = w / (points.length - 1);

  const pathD = points
    .map((y, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (y / 100) * h}`)
    .join(" ");

  const fillD = `${pathD} L ${(points.length - 1) * step} ${h} L 0 ${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="Live BTC price chart"
    >
      <title>Live BTC price chart</title>
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#chartFill)" />
      <path
        d={pathD}
        fill="none"
        stroke="#D4AF37"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point pulse */}
      <circle
        cx={(points.length - 1) * step}
        cy={h - (points[points.length - 1] / 100) * h}
        r="4"
        fill="#D4AF37"
        opacity="0.9"
      />
    </svg>
  );
}

interface StatBoxProps {
  label: string;
  value: string;
  color: string;
}

function StatBox({ label, value, color }: StatBoxProps) {
  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-1"
      style={{
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <p className="text-white/40 text-xs">{label}</p>
      <p className="font-bold text-lg" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

interface HeroSectionProps {
  onExplore: () => void;
}

export function HeroSection({ onExplore }: HeroSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <section
      ref={containerRef}
      className="relative overflow-hidden rounded-3xl mb-6"
      style={{
        background:
          "linear-gradient(135deg, #071428 0%, #0B1F3B 40%, #0D2654 70%, #0B3070 100%)",
        minHeight: 360,
      }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(212,175,55,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212,175,55,0.3) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glow orbs */}
      <div
        className="absolute top-10 right-10 w-64 h-64 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />
      <div
        className="absolute bottom-5 left-20 w-48 h-48 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(47,111,237,0.2) 0%, transparent 70%)",
          filter: "blur(15px)",
        }}
      />

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 p-8 md:p-10">
        {/* Left content */}
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(212,175,55,0.15)",
              border: "1px solid rgba(212,175,55,0.4)",
            }}
          >
            <span className="live-dot w-2 h-2 rounded-full bg-green-400" />
            <span className="text-gold text-xs font-semibold tracking-widest uppercase">
              Live Signals Active
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-display text-white leading-tight mb-3"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800 }}
          >
            Smart Signals.
            <br />
            <span
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #F2D27A, #D4AF37, #B8960C)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Zero Losses.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/60 text-sm md:text-base mb-6 max-w-md leading-relaxed"
          >
            AI-powered precision trading signals for every crypto market.
            Professional-grade insights delivered in real-time.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-3"
          >
            <button
              type="button"
              data-ocid="hero.explore_signals.button"
              onClick={onExplore}
              className="btn-gold flex items-center gap-2 px-6 py-3 text-sm"
            >
              Explore Signals
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              className="flex items-center gap-2 px-5 py-3 rounded-full text-white/70 text-sm border border-white/20 hover:border-white/40 hover:text-white transition-all"
            >
              <Zap className="w-4 h-4" />
              Learn More
            </button>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex gap-6 mt-8"
          >
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-gold font-bold text-xl">{stat.value}</p>
                <p className="text-white/40 text-xs">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: Animated crypto stats panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="flex-shrink-0 w-full md:w-72"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(212,175,55,0.2)",
            borderRadius: 20,
            padding: 16,
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Chart */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-xs font-medium">
                BTC/USDT Live
              </span>
              <span className="text-green-400 text-xs font-bold">▲ +2.34%</span>
            </div>
            <div className="h-20 w-full">
              <MiniLiveChart />
            </div>
          </div>

          {/* Stat boxes */}
          <div className="grid grid-cols-3 gap-2">
            <StatBox label="Win Rate" value="94.7%" color="#D4AF37" />
            <StatBox label="Signals" value="83" color="#22C55E" />
            <StatBox label="AI Score" value="96%" color="#60A5FA" />
          </div>

          {/* Live indicator */}
          <div
            className="mt-3 flex items-center gap-2 px-2 py-1.5 rounded-lg"
            style={{ background: "rgba(34,197,94,0.1)" }}
          >
            <span className="live-dot w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-green-400 text-xs font-semibold">
              AI Engine Active — Auto-Scanning 1,847 Pairs
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
