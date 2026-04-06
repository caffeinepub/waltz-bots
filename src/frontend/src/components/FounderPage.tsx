import {
  Award,
  BookOpen,
  Briefcase,
  Building2,
  ChevronRight,
  Globe,
  Shield,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";

const COMPANY_CARDS = [
  {
    icon: TrendingUp,
    title: "Trading",
    desc: "Advanced algorithmic trading strategies across global markets.",
  },
  {
    icon: Globe,
    title: "Digital Assets",
    desc: "Comprehensive digital asset management and crypto investment solutions.",
  },
  {
    icon: Award,
    title: "Precious Metals",
    desc: "Physical gold, silver, and platinum investment advisory services.",
  },
  {
    icon: Building2,
    title: "Real Estate",
    desc: "Commercial and residential real estate development and investment.",
  },
  {
    icon: Briefcase,
    title: "Investment Solutions",
    desc: "Tailored portfolio management for institutional and private clients.",
  },
];

export function FounderPage() {
  return (
    <div className="space-y-8" data-ocid="founder.page">
      {/* Hero section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl"
        style={{
          background:
            "linear-gradient(135deg, #071428 0%, #0B1F3B 50%, #0D2654 100%)",
          minHeight: 420,
        }}
      >
        {/* Background decorations */}
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #D4AF37 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, #2F6FED 0%, transparent 70%)",
            filter: "blur(30px)",
          }}
        />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(212,175,55,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.5) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 p-8 md:p-12">
          {/* Portrait */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="flex-shrink-0"
          >
            <div className="relative">
              {/* Gold ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "conic-gradient(#D4AF37, #F2D27A, #B8960C, #D4AF37)",
                  padding: 4,
                  borderRadius: "50%",
                }}
              />
              <div
                className="w-52 h-52 rounded-full overflow-hidden relative z-10"
                style={{
                  border: "4px solid #D4AF37",
                  boxShadow: "0 0 40px rgba(212,175,55,0.4)",
                }}
              >
                <img
                  src="/assets/generated/founder-photo.jpeg"
                  alt="Malverin Stonehart"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).parentElement?.classList.add(
                      "bg-gradient-to-br",
                      "from-gold-light",
                      "to-gold",
                      "flex",
                      "items-center",
                      "justify-center",
                    );
                  }}
                />
              </div>
              {/* CEO badge — z-20 so it renders in front of the photo (z-10) */}
              <div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-black text-navy whitespace-nowrap z-20"
                style={{
                  background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
                  boxShadow: "0 4px 12px rgba(212,175,55,0.4)",
                }}
              >
                FOUNDER &amp; CEO
              </div>
            </div>
          </motion.div>

          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="flex-1"
          >
            <div
              className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full"
              style={{
                background: "rgba(212,175,55,0.15)",
                border: "1px solid rgba(212,175,55,0.35)",
              }}
            >
              <Shield className="w-3.5 h-3.5 text-gold" />
              <span className="text-gold text-xs font-semibold tracking-widest uppercase">
                Trezaria Holdings
              </span>
            </div>

            <h1
              className="font-display text-white mb-1"
              style={{
                fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                fontWeight: 800,
              }}
            >
              Malverin Stonehart
            </h1>
            <p className="text-gold/80 text-lg font-medium mb-4">
              Founder &amp; Chief Executive Officer
            </p>

            <p className="text-white/70 text-sm leading-relaxed mb-3 max-w-xl">
              Malverin Stonehart is the Founder and Chief Executive Officer of
              Trezaria, a diversified international business group operating
              across multiple industries including trading, digital assets,
              precious metals, real estate, and investment solutions.
            </p>
            <p className="text-white/60 text-sm leading-relaxed max-w-xl">
              As a young and forward-thinking entrepreneur, Malverin represents
              a new generation of business leaders driven by innovation,
              strategic vision, and global ambition. His approach to business is
              rooted in adaptability, modern technology, and long-term value
              creation.
            </p>

            {/* Stats row */}
            <div className="flex gap-6 mt-6">
              {[
                { label: "Industries", value: "5+" },
                { label: "AI Accuracy", value: "96%" },
                { label: "Signal Win Rate", value: "94.7%" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p
                    className="font-black text-2xl"
                    style={{
                      backgroundImage:
                        "linear-gradient(135deg, #F2D27A, #D4AF37)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-white/40 text-xs">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Vision & Leadership */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-8"
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #F2D27A, #D4AF37)" }}
          >
            <BookOpen className="w-5 h-5 text-navy" />
          </div>
          <h2 className="text-xl font-bold text-navy">
            Vision &amp; Leadership
          </h2>
        </div>

        <div className="space-y-4 text-gray-600 text-sm leading-relaxed">
          <p>
            From the early stages of his career, Malverin demonstrated a strong
            entrepreneurial mindset and a deep interest in building scalable,
            future-focused ventures. Through Trezaria, he has established a
            platform designed to support business growth, investment
            opportunities, and market expansion on a global scale.
          </p>
          <p>
            His leadership style combines analytical thinking with creative
            execution, enabling the company to identify emerging opportunities
            and respond effectively to dynamic market conditions.
          </p>
          <p>
            The launch of Waltz Bots represents Malverin&rsquo;s commitment to
            democratizing access to institutional-grade trading intelligence. By
            leveraging advanced AI and real-time market scanning, Waltz Bots
            delivers the same precision signals used by professional trading
            desks &mdash; now available to every trader.
          </p>
        </div>

        {/* Quote */}
        <div
          className="mt-6 p-5 rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.03))",
            borderLeft: "3px solid #D4AF37",
          }}
        >
          <p className="text-navy italic font-medium text-sm leading-relaxed">
            &ldquo;The future of trading is not about working harder &mdash;
            it&rsquo;s about working smarter. AI doesn&rsquo;t sleep,
            doesn&rsquo;t panic, and doesn&rsquo;t miss opportunities.
            That&rsquo;s the edge we give every Waltz Bots member.&rdquo;
          </p>
          <p className="text-gold text-xs font-semibold mt-2">
            &mdash; Malverin Stonehart
          </p>
        </div>
      </motion.section>

      {/* Company cards */}
      <div>
        <h2 className="text-xl font-bold text-navy mb-4">
          Trezaria Holdings &mdash; Business Verticals
        </h2>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          data-ocid="founder.list"
        >
          {COMPANY_CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              data-ocid={`founder.item.${i + 1}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.08 }}
              className="group glass-card p-5 cursor-pointer hover:shadow-card-hover transition-all"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all group-hover:scale-110"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.06))",
                }}
              >
                <card.icon className="w-5 h-5 text-gold" />
              </div>
              <h3 className="font-bold text-navy mb-2 flex items-center gap-1">
                {card.title}
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gold transition-colors" />
              </h3>
              <p className="text-gray-500 text-xs leading-relaxed">
                {card.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
