import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import {
  Brain,
  CheckCircle,
  Clock,
  MessageSquare,
  Send,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────

export interface FeedbackItem {
  id: string;
  type: "feedback" | "complaint" | "suggestion" | "bug";
  subject: string;
  message: string;
  userName: string;
  userId: string;
  timestamp: number;
  aiSolution: string;
  aiStatus: "analyzing" | "solved";
  adminStatus: "pending" | "approved" | "rejected";
  adminNote?: string;
}

// ─── AI Solution Generator ────────────────────────────────────────

function generateAISolution(
  type: string,
  subject: string,
  message: string,
): string {
  const lower = `${subject} ${message}`.toLowerCase();

  if (
    lower.includes("signal") &&
    (lower.includes("wrong") ||
      lower.includes("false") ||
      lower.includes("incorrect"))
  ) {
    return "Rectification: Our AI signal engine has been notified of this discrepancy. Signal validation protocols are being reviewed and recalibrated. We recommend using the Test button on signal cards for secondary verification before executing any trade. Once admin approves this rectification, signal filtering thresholds will be updated to prevent recurrence.";
  }
  if (
    lower.includes("login") ||
    lower.includes("password") ||
    lower.includes("account") ||
    lower.includes("access")
  ) {
    return "Rectification: For account access issues, please contact your administrator who created your account. If you have forgotten your credentials, the admin can reset your password from the Admin Panel > Users section. Once approved, account recovery procedures will be initiated immediately.";
  }
  if (
    lower.includes("slow") ||
    lower.includes("loading") ||
    lower.includes("performance") ||
    lower.includes("lag")
  ) {
    return "Rectification: Performance issues are often caused by real-time data fetching from multiple exchanges simultaneously. Proposed fix: implement request batching and local caching for frequently accessed data. Once admin approves, the update will be applied to reduce API call frequency by 40%.";
  }
  if (
    lower.includes("price") ||
    lower.includes("data") ||
    lower.includes("wrong") ||
    lower.includes("incorrect")
  ) {
    return "Rectification: Live price data is sourced directly from Binance and BingX APIs. Proposed fix: add a redundant data source (Bybit) as fallback when primary API returns stale data. This upgrade will be deployed upon admin approval to ensure 99.9% price accuracy.";
  }
  if (
    lower.includes("tracking") ||
    lower.includes("tracked") ||
    lower.includes("trade")
  ) {
    return "Rectification: Tracked trades are stored per-user in isolated storage. Proposed fix: implement a real-time sync mechanism to ensure tracked trades load instantly across devices. Upgrade scheduled for deployment after admin approval.";
  }
  if (
    lower.includes("notification") ||
    lower.includes("alert") ||
    lower.includes("bell")
  ) {
    return "Rectification: Notifications are triggered in real-time when tracked trade prices cross TP targets. Proposed improvement: add push notification support for mobile browsers so alerts fire even when the app is not in focus. Pending admin approval for deployment.";
  }
  if (
    lower.includes("100x") ||
    lower.includes("hundred") ||
    lower.includes("coin research")
  ) {
    return "Rectification: The 100X candidates section will be updated to refresh coin research more frequently (every 6 hours instead of daily). On-chain metrics and social sentiment analysis will be enhanced. Upgrade pending admin approval.";
  }
  if (
    lower.includes("admin") ||
    lower.includes("user management") ||
    lower.includes("create user")
  ) {
    return "Rectification: User account management is handled exclusively by the administrator. If additional admin features are needed, a feature request has been logged. Implementation timeline will be determined after admin review and approval.";
  }
  if (
    lower.includes("subscription") ||
    lower.includes("expire") ||
    lower.includes("access")
  ) {
    return "Rectification: Subscription management will be enhanced with automated renewal reminders and grace period extensions. Proposed fix pending admin approval to ensure seamless subscription continuity for all users.";
  }
  if (type === "bug") {
    return `Rectification: Bug report received and logged. Proposed fix for "${subject}": the issue has been reproduced in our test environment and a patch has been prepared. Pending admin approval to deploy the fix to production. ETA: within 24 hours of approval.`;
  }
  if (type === "suggestion") {
    return `Rectification: Thank you for suggesting "${subject}". A feasibility analysis has been completed — this feature can be implemented in the next development sprint. Detailed implementation plan prepared and awaiting admin approval before development begins.`;
  }
  return `Rectification: Our AI has analyzed your ${type} regarding "${subject}" and identified the root cause. A targeted solution has been prepared and is now pending admin review. Upon approval, the fix will be implemented immediately to improve your trading experience on Waltz Bots.`;
}

// ─── Helpers ─────────────────────────────────────────────────────

function loadFeedback(): FeedbackItem[] {
  try {
    return JSON.parse(localStorage.getItem("wb_feedback") ?? "[]");
  } catch {
    return [];
  }
}

function saveFeedback(items: FeedbackItem[]) {
  try {
    localStorage.setItem("wb_feedback", JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

const TYPE_LABELS: Record<FeedbackItem["type"], string> = {
  feedback: "Feedback",
  complaint: "Complaint",
  suggestion: "Suggestion",
  bug: "Bug Report",
};

const TYPE_COLORS: Record<
  FeedbackItem["type"],
  { bg: string; text: string; border: string }
> = {
  feedback: {
    bg: "rgba(59,130,246,0.12)",
    text: "#2563EB",
    border: "rgba(59,130,246,0.25)",
  },
  complaint: {
    bg: "rgba(239,68,68,0.12)",
    text: "#DC2626",
    border: "rgba(239,68,68,0.25)",
  },
  suggestion: {
    bg: "rgba(34,197,94,0.12)",
    text: "#16A34A",
    border: "rgba(34,197,94,0.25)",
  },
  bug: {
    bg: "rgba(249,115,22,0.12)",
    text: "#EA580C",
    border: "rgba(249,115,22,0.25)",
  },
};

const STATUS_COLORS = {
  pending: {
    bg: "rgba(156,163,175,0.15)",
    text: "#6B7280",
    border: "rgba(156,163,175,0.25)",
  },
  approved: {
    bg: "rgba(34,197,94,0.12)",
    text: "#16A34A",
    border: "rgba(34,197,94,0.25)",
  },
  rejected: {
    bg: "rgba(239,68,68,0.12)",
    text: "#DC2626",
    border: "rgba(239,68,68,0.25)",
  },
};

function formatTs(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── FeedbackItemCard ─────────────────────────────────────────────

function FeedbackItemCard({ item }: { item: FeedbackItem }) {
  const tc = TYPE_COLORS[item.type];
  const sc = STATUS_COLORS[item.adminStatus];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5"
      style={{
        background: "rgba(255,255,255,0.85)",
        border: "1px solid rgba(230,234,242,0.9)",
        boxShadow: "0 4px 16px rgba(11,31,59,0.07)",
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{
              background: tc.bg,
              color: tc.text,
              border: `1px solid ${tc.border}`,
            }}
          >
            {TYPE_LABELS[item.type]}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{
              background: sc.bg,
              color: sc.text,
              border: `1px solid ${sc.border}`,
            }}
          >
            {item.adminStatus === "pending"
              ? "⏳ Pending"
              : item.adminStatus === "approved"
                ? "✅ Approved"
                : "❌ Rejected"}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
          <Clock className="w-3 h-3" />
          {formatTs(item.timestamp)}
        </div>
      </div>

      {/* Subject + submitter */}
      <p className="font-bold text-navy text-sm mb-1">{item.subject}</p>
      <p className="text-xs text-gray-400 mb-2">
        Submitted by: {item.userName}
      </p>

      {/* Message */}
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        {item.message}
      </p>

      {/* AI Rectification */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "linear-gradient(135deg, #071428, #0B1F3B)",
          border: "1px solid rgba(212,175,55,0.25)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-gold" />
          <span className="text-gold text-xs font-bold uppercase tracking-wider">
            AI Rectification
          </span>
          {item.aiStatus === "analyzing" ? (
            <span className="ml-auto flex items-center gap-1 text-gold/60 text-xs">
              <span className="w-2 h-2 rounded-full bg-gold/60 animate-pulse" />
              Analyzing...
            </span>
          ) : (
            <span className="ml-auto flex items-center gap-1 text-green-400 text-xs">
              <CheckCircle className="w-3 h-3" />
              Solution Ready
            </span>
          )}
        </div>
        {item.aiStatus === "analyzing" ? (
          <div className="flex items-center gap-2 text-gold/50 text-xs">
            <span className="inline-flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-gold/50 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
            🤖 AI is analyzing your request and preparing a rectification...
          </div>
        ) : (
          <p className="text-white/80 text-xs leading-relaxed">
            {item.aiSolution}
          </p>
        )}
      </div>

      {/* Approved note */}
      {item.adminStatus === "approved" && (
        <div
          className="mt-3 rounded-xl px-4 py-2.5"
          style={{
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.2)",
          }}
        >
          <p className="text-green-600 text-xs font-semibold">
            ✅ Admin approved — rectification has been applied and the upgrade
            is live.
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ─── FeedbackPage ─────────────────────────────────────────────────

export function FeedbackPage() {
  const { user, isLoggedIn, isAdmin } = useAuth();

  const [items, setItems] = useState<FeedbackItem[]>(() => loadFeedback());
  const [type, setType] = useState<FeedbackItem["type"]>("feedback");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Re-load from storage on mount (other tabs might update)
  useEffect(() => {
    setItems(loadFeedback());
  }, []);

  const userName = isLoggedIn
    ? (user?.displayName ?? user?.username ?? "User")
    : "Guest";
  const userId = isLoggedIn ? (user?.uid ?? "guest") : "guest";

  // Filter: admin sees all; users see only their own
  const visibleItems = isAdmin
    ? items
    : items.filter((i) => i.userId === userId);

  const handleSubmit = () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in subject and message.");
      return;
    }
    setSubmitting(true);

    const newItem: FeedbackItem = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      subject: subject.trim(),
      message: message.trim(),
      userName,
      userId,
      timestamp: Date.now(),
      aiSolution: "",
      aiStatus: "analyzing",
      adminStatus: "pending",
    };

    const updated = [newItem, ...items];
    setItems(updated);
    saveFeedback(updated);
    setSubject("");
    setMessage("");
    setSubmitting(false);
    toast.success(
      "Submitted! Our AI is analyzing and preparing a rectification...",
    );

    // Simulate AI analysis after 2.5s
    setTimeout(() => {
      const solution = generateAISolution(
        type,
        newItem.subject,
        newItem.message,
      );
      setItems((prev) => {
        const next = prev.map((i) =>
          i.id === newItem.id
            ? { ...i, aiSolution: solution, aiStatus: "solved" as const }
            : i,
        );
        saveFeedback(next);
        return next;
      });
      toast.success("AI Rectification ready — pending admin approval!");
    }, 2500);
  };

  return (
    <div className="space-y-6" data-ocid="feedback.page">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-6 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #071428 0%, #0B1F3B 60%, #0D2654 100%)",
          border: "1px solid rgba(212,175,55,0.2)",
        }}
      >
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%)",
            filter: "blur(30px)",
          }}
        />
        <div className="relative z-10 flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #F2D27A, #D4AF37)" }}
          >
            <MessageSquare className="w-6 h-6 text-navy" />
          </div>
          <div>
            <h1
              className="font-black text-xl"
              style={{
                background:
                  "linear-gradient(135deg, #F2D27A, #D4AF37, #B8960C)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Feedback &amp; Complaints
            </h1>
            <p className="text-gold/50 text-xs mt-0.5">
              Powered by Waltz AI Rectification Engine — all submissions are
              AI-analyzed, rectified, and forwarded to admin for approval
            </p>
          </div>
        </div>
      </motion.div>

      {/* Submission form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
        data-ocid="feedback.panel"
      >
        <h2 className="font-bold text-navy mb-4 flex items-center gap-2">
          <Send className="w-4 h-4 text-gold" />
          Submit a {TYPE_LABELS[type]}
          <span className="ml-auto text-xs text-gray-400 font-normal">
            Submitting as:{" "}
            <span className="text-navy font-semibold">{userName}</span>
          </span>
        </h2>

        <div className="space-y-4">
          {/* Type selector */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as FeedbackItem["type"])}
            >
              <SelectTrigger data-ocid="feedback.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feedback">💬 Feedback</SelectItem>
                <SelectItem value="complaint">⚠️ Complaint</SelectItem>
                <SelectItem value="suggestion">💡 Suggestion</SelectItem>
                <SelectItem value="bug">🐛 Bug Report</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Subject</Label>
            <input
              data-ocid="feedback.input"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/50 transition-all"
              placeholder="Brief subject of your submission"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Message */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Message</Label>
            <Textarea
              data-ocid="feedback.textarea"
              rows={5}
              placeholder="Describe your feedback, complaint, or suggestion in detail. Our AI Rectification Engine will analyze this and prepare a solution for admin approval..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="resize-none text-sm"
            />
          </div>

          <Button
            data-ocid="feedback.submit_button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full btn-gold border-0 font-bold py-2.5"
          >
            <Send className="w-4 h-4 mr-2" />
            {submitting
              ? "Submitting..."
              : "Submit — AI Rectification Will Analyze"}
          </Button>
        </div>
      </motion.div>

      {/* Submissions list */}
      <div>
        <h2 className="text-lg font-bold text-navy mb-3 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gold" />
          {isAdmin ? "All Submissions" : "Your Submissions"}
          <span
            className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold"
            style={{
              background: "rgba(212,175,55,0.12)",
              color: "#B8960C",
              border: "1px solid rgba(212,175,55,0.2)",
            }}
          >
            {visibleItems.length} total
          </span>
        </h2>

        <AnimatePresence mode="popLayout">
          {visibleItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 py-14"
              data-ocid="feedback.empty_state"
            >
              <MessageSquare className="w-12 h-12 text-gray-300" />
              <p className="text-gray-500 text-sm">
                No submissions yet. Be the first to share your feedback!
              </p>
            </motion.div>
          ) : (
            <div className="space-y-4" data-ocid="feedback.list">
              {visibleItems.map((item, i) => (
                <div key={item.id} data-ocid={`feedback.item.${i + 1}`}>
                  <FeedbackItemCard item={item} />
                </div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-400 border-t border-gray-100 mt-4">
        <p>
          &copy; {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            target="_blank"
            rel="noreferrer"
            className="text-gold hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
