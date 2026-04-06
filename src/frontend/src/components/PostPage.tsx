import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, ImageIcon, Star, Tag } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

interface AdminPost {
  id: string;
  heading: string;
  tagline: string;
  description: string;
  photo?: string;
  isPromo: boolean;
  createdAt: string;
}

const MOCK_POSTS: AdminPost[] = [
  {
    id: "mock1",
    heading: "Why Bitcoin Will Hit $100K Before Year End",
    tagline: "The halving cycle is playing out exactly as predicted",
    description:
      "Deep analysis of on-chain metrics, institutional flows, and historical halving patterns all pointing to one inevitable conclusion. Every cycle rhymes, and this one is following the script perfectly.",
    isPromo: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "mock2",
    heading: "Top 5 Altcoins to Watch This Week",
    tagline: "AI-curated picks with 90%+ confidence signals",
    description:
      "Our AI scanner flagged these 5 altcoins with exceptional signal quality and risk-reward ratios above 1:8. Full entry, target, and stop-loss levels inside for each coin.",
    isPromo: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "mock3",
    heading: "Upgrade to Waltz Bots Premium Today",
    tagline: "Unlimited signals, AI analysis, and priority support",
    description:
      "Get full access to all 83+ active signals with confidence scores, AI analysis reports, estimated hit times, and 1-on-1 trade support. Limited spots available.",
    isPromo: true,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "mock4",
    heading: "How to Read Our Trading Signals Like a Pro",
    tagline: "Master the entry, TP, and stop-loss framework",
    description:
      "Understanding signal confidence scores and timing windows. A guide to maximizing your profit potential with every Waltz Bots signal, including risk management strategies.",
    isPromo: false,
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function PostCard({ post }: { post: AdminPost }) {
  if (post.isPromo) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(135deg, #071428, #0B1F3B, #0D2654)",
          border: "2px solid #D4AF37",
          boxShadow:
            "0 0 24px rgba(212,175,55,0.25), 0 0 48px rgba(212,175,55,0.08)",
        }}
      >
        {/* Shimmer overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(105deg, transparent 40%, rgba(212,175,55,0.06) 50%, transparent 60%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 3s linear infinite",
          }}
        />
        {/* Gold glow corners */}
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(212,175,55,0.2), transparent 70%)",
            filter: "blur(16px)",
          }}
        />

        <div className="relative z-10 p-6">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-black"
              style={{
                background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
                color: "#3d2800",
              }}
            >
              ⭐ SPONSORED
            </span>
            <Star className="w-4 h-4 text-gold" />
          </div>
          <h3
            className="font-bold text-xl mb-1"
            style={{
              backgroundImage: "linear-gradient(135deg, #F2D27A, #D4AF37)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {post.heading}
          </h3>
          <p className="text-gold/60 text-sm italic mb-3">{post.tagline}</p>
          {post.photo && (
            <img
              src={post.photo}
              alt={post.heading}
              className="w-full h-40 object-cover rounded-xl mb-3"
            />
          )}
          <p className="text-white/65 text-sm leading-relaxed mb-4">
            {post.description}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-gold/40 text-xs">
              <Calendar className="w-3 h-3" />
              <span>{timeAgo(post.createdAt)}</span>
            </div>
            <button
              type="button"
              className="px-4 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
                color: "#3d2800",
              }}
            >
              Learn More
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 hover:-translate-y-0.5 transition-transform"
    >
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-navy" />
        <span className="text-navy text-xs font-semibold tracking-widest uppercase">
          Post
        </span>
      </div>
      <h3 className="font-bold text-navy text-lg mb-1">{post.heading}</h3>
      <p className="text-gray-500 text-sm italic mb-3">{post.tagline}</p>
      {post.photo && (
        <img
          src={post.photo}
          alt={post.heading}
          className="w-full h-36 object-cover rounded-xl mb-3"
        />
      )}
      <p className="text-gray-500 text-sm leading-relaxed mb-4">
        {post.description}
      </p>
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {timeAgo(post.createdAt)}
        </span>
        <Badge className="bg-gray-100 text-gray-500 border-gray-200">
          Community
        </Badge>
      </div>
    </motion.div>
  );
}

export function PostPage() {
  const [adminPosts, setAdminPosts] = useState<AdminPost[]>([]);
  const [filter, setFilter] = useState<"all" | "promo" | "posts">("all");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wb_posts");
      if (raw) setAdminPosts(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const allPosts = [...adminPosts, ...MOCK_POSTS];
  const filtered =
    filter === "all"
      ? allPosts
      : filter === "promo"
        ? allPosts.filter((p) => p.isPromo)
        : allPosts.filter((p) => !p.isPromo);

  return (
    <div className="space-y-6" data-ocid="post.page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy font-display flex items-center gap-3">
            <FileText className="w-6 h-6 text-gold" />
            Community Posts
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Latest posts from the Waltz Bots team and community
          </p>
        </div>
        <Badge className="bg-navy/10 text-navy border-navy/20">
          {allPosts.length} posts
        </Badge>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2" data-ocid="post.tab">
        {(["all", "posts", "promo"] as const).map((f) => (
          <button
            key={f}
            type="button"
            data-ocid={`post.${f}.tab`}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all"
            style={
              filter === f
                ? {
                    background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
                    color: "#3d2800",
                  }
                : { background: "rgba(11,31,59,0.07)", color: "#4B5563" }
            }
          >
            {f === "all" ? "All" : f === "promo" ? "⭐ Promoted" : "Posts"}
          </button>
        ))}
      </div>

      {/* Posts grid */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 py-16"
          data-ocid="post.empty_state"
        >
          <ImageIcon className="w-12 h-12 text-gray-300" />
          <p className="text-gray-500">No posts in this category yet.</p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-5"
          data-ocid="post.list"
        >
          {filtered.map((post, i) => (
            <div key={post.id} data-ocid={`post.item.${i + 1}`}>
              <PostCard post={post} />
            </div>
          ))}
        </div>
      )}

      {/* Promo label */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Tag className="w-3 h-3" />
        <span>
          Promoted posts are marked with ⭐ SPONSORED and support the Waltz Bots
          platform.
        </span>
      </div>
    </div>
  );
}
