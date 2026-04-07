import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import type { WBUser } from "@/context/AuthContext";
import { useActor } from "@/hooks/useActor";
import {
  Activity,
  ArrowRight,
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  ImageIcon,
  LogOut,
  MessageSquare,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { TrackedTradeRecord } from "../backend";
import { AIDashboardPage } from "./AIDashboardPage";
import type { FeedbackItem } from "./FeedbackPage";

interface AdminPost {
  id: string;
  heading: string;
  tagline: string;
  description: string;
  photo?: string;
  isPromo: boolean;
  createdAt: string;
}

interface ImprovementLogEntry {
  id: string;
  subject: string;
  aiRectification: string;
  type: string;
  approvedAt: string;
  userId: string;
  userName: string;
}

// Parsed trade for display
interface ParsedTrade {
  id: string;
  symbol: string;
  coinName: string;
  direction: string;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  outcome?: string;
  profitPercent?: number;
  addedAt?: string;
}

function loadPosts(): AdminPost[] {
  try {
    return JSON.parse(localStorage.getItem("wb_posts") ?? "[]");
  } catch {
    return [];
  }
}

function savePosts(posts: AdminPost[]) {
  localStorage.setItem("wb_posts", JSON.stringify(posts));
}

function subTypeLabel(type: string | null | undefined): string {
  if (type === "1day") return "1 Day";
  if (type === "1week") return "1 Week";
  if (type === "1month") return "1 Month";
  if (type === "1year") return "1 Year";
  return type ?? "—";
}

// ──────────────────────────────────────────────────────
// Bento tile
// ──────────────────────────────────────────────────────
function BentoTile({
  icon: Icon,
  label,
  value,
  color,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="stat-card p-5 flex flex-col gap-3 text-left cursor-pointer"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${color}18` }}
      >
        <span style={{ color }}>
          <Icon className="w-5 h-5" />
        </span>
      </div>
      <p className="text-3xl font-black text-navy">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </motion.button>
  );
}

// ──────────────────────────────────────────────────────
// Users Tab — with cloud-loaded tracked trades
// ──────────────────────────────────────────────────────
function UsersTab() {
  const { allUsers, addUser, deleteUser, refreshUsers } = useAuth();
  const { actor } = useActor();
  const [showAdd, setShowAdd] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [subType, setSubType] = useState<"1day" | "1week" | "1month" | "1year">(
    "1month",
  );
  const [addError, setAddError] = useState("");

  // All tracked trades from cloud, keyed by uid
  const [allTrackedTrades, setAllTrackedTrades] = useState<
    TrackedTradeRecord[]
  >([]);
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [loadingTrades, setLoadingTrades] = useState(false);

  // Load all tracked trades from backend when actor is available
  useEffect(() => {
    if (!actor) return;
    setLoadingTrades(true);
    actor
      .getAllTrackedTrades()
      .then((records) => {
        setAllTrackedTrades(records);
      })
      .catch(() => {})
      .finally(() => setLoadingTrades(false));
  }, [actor]);

  // Group trades by uid
  const tradesByUid = allTrackedTrades.reduce<
    Record<string, TrackedTradeRecord[]>
  >((acc, t) => {
    if (!acc[t.uid]) acc[t.uid] = [];
    acc[t.uid].push(t);
    return acc;
  }, {});

  // Parse a TrackedTradeRecord into display fields
  function parseTrade(record: TrackedTradeRecord): ParsedTrade | null {
    try {
      const t = JSON.parse(record.tradeJson);
      return {
        id: record.tradeId,
        symbol: t.symbol ?? "?",
        coinName: t.coinName ?? t.symbol ?? "?",
        direction: t.direction ?? "BUY",
        entryPrice: t.entryPrice ?? 0,
        targetPrice: t.targetPrice ?? 0,
        stopLoss: t.stopLoss ?? 0,
        outcome: t.outcome,
        profitPercent: t.profitPercent,
        addedAt: t.addedAt,
      };
    } catch {
      return null;
    }
  }

  const handleAdd = async () => {
    setAddError("");
    if (!newUsername.trim() || !newPassword.trim()) {
      setAddError("Username and password are required.");
      return;
    }
    const result = await addUser(
      newUsername.trim(),
      newPassword.trim(),
      subType,
    );
    if (!result.success) {
      setAddError(result.error ?? "Error creating user.");
      return;
    }
    setNewUsername("");
    setNewPassword("");
    setShowAdd(false);
    refreshUsers();
    toast.success(`User "${newUsername}" created successfully.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-navy">All Users ({allUsers.length})</h3>
        <Button
          data-ocid="admin.users.open_modal_button"
          onClick={() => setShowAdd(true)}
          size="sm"
          className="btn-gold border-0"
        >
          <Plus className="w-4 h-4 mr-1" /> Add User
        </Button>
      </div>

      {allUsers.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 py-12"
          data-ocid="admin.users.empty_state"
        >
          <Users className="w-12 h-12 text-gray-300" />
          <p className="text-gray-500 text-sm">
            No users yet. Create the first user.
          </p>
        </div>
      ) : (
        <div className="space-y-2" data-ocid="admin.users.table">
          {/* Table header */}
          <div
            className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-gray-400"
            style={{ background: "rgba(11,31,59,0.04)" }}
          >
            <span>Username</span>
            <span>UID</span>
            <span>Subscription</span>
            <span>Status</span>
            <span>Expiry</span>
            <span>Trades</span>
            <span />
          </div>

          {allUsers.map((u: WBUser, i: number) => {
            const userTrades = tradesByUid[u.uid] ?? [];
            const isExpanded = expandedUid === u.uid;
            const openTrades = userTrades.filter((t) => {
              try {
                const p = JSON.parse(t.tradeJson);
                return !p.outcome || p.outcome === "open";
              } catch {
                return false;
              }
            });
            const wins = userTrades.filter((t) => {
              try {
                return JSON.parse(t.tradeJson).outcome === "win";
              } catch {
                return false;
              }
            });
            const losses = userTrades.filter((t) => {
              try {
                return JSON.parse(t.tradeJson).outcome === "loss";
              } catch {
                return false;
              }
            });

            return (
              <motion.div
                key={u.uid}
                data-ocid={`admin.users.item.${i + 1}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(11,31,59,0.08)",
                }}
              >
                {/* Main row */}
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-2 items-center px-3 py-2.5">
                  {/* Username */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-navy flex-shrink-0"
                      style={{
                        background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
                      }}
                    >
                      {u.username[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-navy text-sm truncate">
                      {u.username}
                    </span>
                  </div>

                  {/* UID — truncated, full on hover */}
                  <span
                    className="font-mono text-xs text-gray-400 cursor-default"
                    title={u.uid}
                  >
                    {u.uid.length > 14
                      ? `${u.uid.slice(0, 7)}…${u.uid.slice(-4)}`
                      : u.uid}
                  </span>

                  {/* Subscription type badge */}
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap"
                    style={{
                      background: "rgba(212,175,55,0.12)",
                      color: "#D4AF37",
                      border: "1px solid rgba(212,175,55,0.3)",
                    }}
                  >
                    {subTypeLabel(u.subscriptionType)}
                  </span>

                  {/* Active / Expired */}
                  <span className="whitespace-nowrap">
                    {u.status === "active" ? (
                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-xs">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/15 text-red-500 border-red-500/20 text-xs">
                        Expired
                      </Badge>
                    )}
                  </span>

                  {/* Expiry date */}
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {u.subscriptionExpiry
                      ? new Date(u.subscriptionExpiry).toLocaleDateString(
                          "en-GB",
                        )
                      : "—"}
                  </span>

                  {/* Trades badge + expand toggle */}
                  <button
                    type="button"
                    data-ocid={`admin.users.toggle.${i + 1}`}
                    onClick={() => setExpandedUid(isExpanded ? null : u.uid)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                    style={{
                      background:
                        userTrades.length > 0
                          ? "rgba(47,111,237,0.1)"
                          : "rgba(156,163,175,0.1)",
                      color: userTrades.length > 0 ? "#2F6FED" : "#9CA3AF",
                      border: `1px solid ${userTrades.length > 0 ? "rgba(47,111,237,0.2)" : "rgba(156,163,175,0.2)"}`,
                    }}
                  >
                    {loadingTrades
                      ? "…"
                      : `${userTrades.length} trade${userTrades.length !== 1 ? "s" : ""}`}
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>

                  {/* Delete */}
                  <Button
                    data-ocid={`admin.users.delete_button.${i + 1}`}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      deleteUser(u.uid);
                      toast.success(`User "${u.username}" deleted.`);
                    }}
                    className="text-red-400 hover:text-red-600 h-7 w-7 p-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Expanded detail panel */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t"
                      style={{ borderColor: "rgba(11,31,59,0.08)" }}
                    >
                      <div
                        className="px-4 py-3 space-y-3"
                        style={{ background: "rgba(11,31,59,0.02)" }}
                      >
                        {/* User detail row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div
                            className="rounded-xl p-3"
                            style={{
                              background: "rgba(255,255,255,0.8)",
                              border: "1px solid rgba(11,31,59,0.06)",
                            }}
                          >
                            <p className="text-xs text-gray-400 mb-0.5">
                              Full UID
                            </p>
                            <p className="font-mono text-xs text-navy break-all">
                              {u.uid}
                            </p>
                          </div>
                          <div
                            className="rounded-xl p-3"
                            style={{
                              background: "rgba(255,255,255,0.8)",
                              border: "1px solid rgba(11,31,59,0.06)",
                            }}
                          >
                            <p className="text-xs text-gray-400 mb-0.5">
                              Subscription
                            </p>
                            <p className="font-bold text-navy text-sm">
                              {subTypeLabel(u.subscriptionType)}
                            </p>
                            <p className="text-xs text-gray-400">
                              Expires:{" "}
                              {u.subscriptionExpiry
                                ? new Date(
                                    u.subscriptionExpiry,
                                  ).toLocaleDateString("en-GB")
                                : "—"}
                            </p>
                          </div>
                          <div
                            className="rounded-xl p-3"
                            style={{
                              background: "rgba(255,255,255,0.8)",
                              border: "1px solid rgba(11,31,59,0.06)",
                            }}
                          >
                            <p className="text-xs text-gray-400 mb-0.5">
                              Trade Record
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-green-600 text-sm">
                                {wins.length}W
                              </span>
                              <span className="text-gray-300">/</span>
                              <span className="font-bold text-red-500 text-sm">
                                {losses.length}L
                              </span>
                              {wins.length + losses.length > 0 && (
                                <span className="text-xs text-gray-400">
                                  (
                                  {Math.round(
                                    (wins.length /
                                      (wins.length + losses.length)) *
                                      100,
                                  )}
                                  % WR)
                                </span>
                              )}
                            </div>
                          </div>
                          <div
                            className="rounded-xl p-3"
                            style={{
                              background: "rgba(255,255,255,0.8)",
                              border: "1px solid rgba(11,31,59,0.06)",
                            }}
                          >
                            <p className="text-xs text-gray-400 mb-0.5">
                              Last Login
                            </p>
                            <p className="font-medium text-navy text-sm">
                              {u.lastLogin
                                ? new Date(u.lastLogin).toLocaleDateString(
                                    "en-GB",
                                  )
                                : "Never"}
                            </p>
                          </div>
                        </div>

                        {/* Tracked trades list */}
                        {userTrades.length === 0 ? (
                          <div
                            className="flex items-center gap-2 py-3 px-3 rounded-xl text-sm text-gray-400"
                            style={{
                              background: "rgba(156,163,175,0.06)",
                              border: "1px dashed rgba(156,163,175,0.2)",
                            }}
                          >
                            <TrendingUp className="w-4 h-4" />
                            No tracked trades for this user yet.
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="w-3.5 h-3.5 text-navy" />
                              <p className="text-xs font-bold text-navy">
                                Tracked Trades ({userTrades.length})
                              </p>
                              <span
                                className="ml-auto text-xs"
                                style={{
                                  color:
                                    openTrades.length > 0
                                      ? "#22C55E"
                                      : "#9CA3AF",
                                }}
                              >
                                {openTrades.length} open
                              </span>
                            </div>
                            {userTrades.slice(0, 6).map((record, j) => {
                              const trade = parseTrade(record);
                              if (!trade) return null;
                              return (
                                <div
                                  key={record.tradeId}
                                  data-ocid={`admin.users.trade.${j + 1}`}
                                  className="flex items-center gap-3 px-3 py-2 rounded-lg"
                                  style={{
                                    background: "rgba(255,255,255,0.7)",
                                    border: "1px solid rgba(11,31,59,0.06)",
                                  }}
                                >
                                  <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-navy flex-shrink-0"
                                    style={{
                                      background:
                                        "linear-gradient(135deg, #F2D27A, #D4AF37)",
                                    }}
                                  >
                                    {trade.symbol.slice(0, 2)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-bold text-navy text-xs">
                                        {trade.coinName}
                                      </p>
                                      <span
                                        className="px-1.5 py-0.5 rounded text-xs font-bold"
                                        style={{
                                          background:
                                            trade.direction === "BUY"
                                              ? "rgba(34,197,94,0.12)"
                                              : "rgba(239,68,68,0.12)",
                                          color:
                                            trade.direction === "BUY"
                                              ? "#16A34A"
                                              : "#DC2626",
                                        }}
                                      >
                                        {trade.direction}
                                      </span>
                                      {trade.outcome === "win" && (
                                        <span className="text-xs text-green-600 font-bold">
                                          ✅ WIN
                                        </span>
                                      )}
                                      {trade.outcome === "loss" && (
                                        <span className="text-xs text-red-500 font-bold">
                                          ❌ LOSS
                                        </span>
                                      )}
                                      {(!trade.outcome ||
                                        trade.outcome === "open") && (
                                        <span className="text-xs text-blue-500 font-bold">
                                          ⏳ OPEN
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-400">
                                      Entry $
                                      {trade.entryPrice.toLocaleString(
                                        undefined,
                                        { maximumFractionDigits: 4 },
                                      )}{" "}
                                      • TP $
                                      {trade.targetPrice.toLocaleString(
                                        undefined,
                                        { maximumFractionDigits: 4 },
                                      )}{" "}
                                      • SL $
                                      {trade.stopLoss.toLocaleString(
                                        undefined,
                                        { maximumFractionDigits: 4 },
                                      )}
                                    </p>
                                  </div>
                                  {trade.profitPercent !== undefined && (
                                    <span
                                      className="text-xs font-bold whitespace-nowrap"
                                      style={{
                                        color:
                                          trade.profitPercent >= 0
                                            ? "#22C55E"
                                            : "#EF4444",
                                      }}
                                    >
                                      {trade.profitPercent >= 0 ? "+" : ""}
                                      {trade.profitPercent.toFixed(2)}%
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                            {userTrades.length > 6 && (
                              <p className="text-xs text-gray-400 text-center py-1">
                                +{userTrades.length - 6} more trades
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add User modal */}
      <Dialog
        open={showAdd}
        onOpenChange={(o) => {
          setShowAdd(o);
          setAddError("");
        }}
      >
        <DialogContent
          data-ocid="admin.users.dialog"
          className="bg-white"
          style={{ background: "white", backgroundColor: "white" }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-gold" /> Create New User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Username</Label>
              <Input
                data-ocid="admin.users.input"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Password</Label>
              <Input
                data-ocid="admin.users.input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                Subscription Duration
              </Label>
              <Select
                value={subType}
                onValueChange={(v) => setSubType(v as typeof subType)}
              >
                <SelectTrigger data-ocid="admin.users.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1day">1 Day</SelectItem>
                  <SelectItem value="1week">1 Week</SelectItem>
                  <SelectItem value="1month">1 Month</SelectItem>
                  <SelectItem value="1year">1 Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {addError && (
              <p
                className="text-red-500 text-xs"
                data-ocid="admin.users.error_state"
              >
                {addError}
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                data-ocid="admin.users.confirm_button"
                onClick={handleAdd}
                className="flex-1 btn-gold border-0"
              >
                Create User
              </Button>
              <Button
                data-ocid="admin.users.cancel_button"
                variant="outline"
                onClick={() => setShowAdd(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Posts Tab
// ──────────────────────────────────────────────────────
function PostsTab() {
  const [posts, setPosts] = useState<AdminPost[]>(loadPosts);
  const [showForm, setShowForm] = useState(false);
  const [heading, setHeading] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [isPromo, setIsPromo] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = () => {
    if (!heading.trim()) {
      toast.error("Heading is required.");
      return;
    }
    const newPost: AdminPost = {
      id: `post-${Date.now()}`,
      heading: heading.trim(),
      tagline: tagline.trim(),
      description: description.trim(),
      photo: photoPreview,
      isPromo,
      createdAt: new Date().toISOString(),
    };
    const updated = [newPost, ...posts];
    setPosts(updated);
    savePosts(updated);
    setHeading("");
    setTagline("");
    setDescription("");
    setIsPromo(false);
    setPhotoPreview(undefined);
    setShowForm(false);
    toast.success("Post published successfully!");
  };

  const handleDelete = (id: string) => {
    const updated = posts.filter((p) => p.id !== id);
    setPosts(updated);
    savePosts(updated);
    toast.success("Post deleted.");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-navy">Posts ({posts.length})</h3>
        <Button
          data-ocid="admin.posts.open_modal_button"
          onClick={() => setShowForm(true)}
          size="sm"
          className="btn-gold border-0"
        >
          <Plus className="w-4 h-4 mr-1" /> New Post
        </Button>
      </div>

      {posts.length === 0 && (
        <div
          className="flex flex-col items-center gap-3 py-10"
          data-ocid="admin.posts.empty_state"
        >
          <FileText className="w-12 h-12 text-gray-300" />
          <p className="text-gray-500 text-sm">No posts yet.</p>
        </div>
      )}

      <div className="space-y-3" data-ocid="admin.posts.list">
        {posts.map((post, i) => (
          <div
            key={post.id}
            data-ocid={`admin.posts.item.${i + 1}`}
            className="flex items-center gap-4 p-3 rounded-xl"
            style={{
              background: "rgba(11,31,59,0.04)",
              border: "1px solid rgba(11,31,59,0.08)",
            }}
          >
            {post.photo && (
              <img
                src={post.photo}
                alt={post.heading}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
              />
            )}
            {!post.photo && (
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(212,175,55,0.1)" }}
              >
                <ImageIcon className="w-5 h-5 text-gold" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-navy text-sm truncate">
                {post.heading}
              </p>
              <p className="text-gray-500 text-xs truncate">{post.tagline}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400">
                  {new Date(post.createdAt).toLocaleDateString()}
                </span>
                {post.isPromo && (
                  <Badge className="bg-gold/20 text-gold border-gold/30 text-xs">
                    ⭐ Promo
                  </Badge>
                )}
              </div>
            </div>
            <Button
              data-ocid={`admin.posts.delete_button.${i + 1}`}
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(post.id)}
              className="text-red-400 hover:text-red-600 h-8 w-8 p-0 flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* New Post modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent
          className="max-w-lg bg-white"
          style={{ background: "white", backgroundColor: "white" }}
          data-ocid="admin.posts.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gold" /> Create New Post
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Heading *</Label>
              <Input
                data-ocid="admin.posts.input"
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                placeholder="Post heading"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Tagline</Label>
              <Input
                data-ocid="admin.posts.input"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Short tagline"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                data-ocid="admin.posts.textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Post content..."
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Photo</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <Button
                data-ocid="admin.posts.upload_button"
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="w-full"
              >
                <ImageIcon className="w-4 h-4 mr-2" />{" "}
                {photoPreview ? "Change Photo" : "Upload Photo"}
              </Button>
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-28 object-cover rounded-lg mt-1"
                />
              )}
            </div>
            <div className="flex items-center justify-between py-1">
              <div>
                <Label className="text-xs font-semibold">
                  Promotional Post
                </Label>
                <p className="text-xs text-gray-400">
                  Promo posts get gold border and SPONSORED badge
                </p>
              </div>
              <Switch
                data-ocid="admin.posts.switch"
                checked={isPromo}
                onCheckedChange={setIsPromo}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                data-ocid="admin.posts.confirm_button"
                onClick={handleCreate}
                className="flex-1 btn-gold border-0"
              >
                Publish Post
              </Button>
              <Button
                data-ocid="admin.posts.cancel_button"
                variant="outline"
                onClick={() => setShowForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Feedback Admin Tab
// ──────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  feedback: "Feedback",
  complaint: "Complaint",
  suggestion: "Suggestion",
  bug: "Bug Report",
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  feedback: { bg: "rgba(59,130,246,0.12)", text: "#2563EB" },
  complaint: { bg: "rgba(239,68,68,0.12)", text: "#DC2626" },
  suggestion: { bg: "rgba(34,197,94,0.12)", text: "#16A34A" },
  bug: { bg: "rgba(249,115,22,0.12)", text: "#EA580C" },
};

function FeedbackAdminTab() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [improvementLog, setImprovementLog] = useState<ImprovementLogEntry[]>(
    [],
  );

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem("wb_feedback") ?? "[]"));
    } catch {
      setItems([]);
    }
  }, []);

  // Refresh improvement log when items change
  // biome-ignore lint/correctness/useExhaustiveDependencies: items is intentionally used as a trigger
  useEffect(() => {
    try {
      setImprovementLog(
        JSON.parse(localStorage.getItem("wb_improvement_log") ?? "[]"),
      );
    } catch {
      setImprovementLog([]);
    }
  }, [items]);

  const saveAndUpdate = (updated: FeedbackItem[]) => {
    try {
      localStorage.setItem("wb_feedback", JSON.stringify(updated));
    } catch {
      /* ignore */
    }
    setItems(updated);
  };

  const handleApprove = (id: string) => {
    const item = items.find((i) => i.id === id);
    const updated = items.map((i) =>
      i.id === id ? { ...i, adminStatus: "approved" as const } : i,
    );
    saveAndUpdate(updated);

    // Log improvement when admin approves
    if (item) {
      const log: ImprovementLogEntry[] = JSON.parse(
        localStorage.getItem("wb_improvement_log") ?? "[]",
      );
      log.unshift({
        id: `imp-${Date.now()}`,
        subject: item.subject,
        aiRectification: item.aiSolution,
        type: item.type,
        approvedAt: new Date().toISOString(),
        userId: item.userId,
        userName: item.userName,
      });
      localStorage.setItem("wb_improvement_log", JSON.stringify(log));
      setImprovementLog(log);
    }

    toast.success("Submission approved and improvement logged.");
  };

  const handleReject = (id: string) => {
    const updated = items.map((i) =>
      i.id === id ? { ...i, adminStatus: "rejected" as const } : i,
    );
    saveAndUpdate(updated);
    toast.success("Submission rejected.");
  };

  const handleClearResolved = () => {
    const updated = items.filter((i) => i.adminStatus === "pending");
    saveAndUpdate(updated);
    toast.success("Cleared all resolved submissions.");
  };

  const pending = items.filter((i) => i.adminStatus === "pending");
  const approved = items.filter((i) => i.adminStatus === "approved");
  const rejected = items.filter((i) => i.adminStatus === "rejected");

  return (
    <div className="space-y-4" data-ocid="admin.feedback.panel">
      {/* Stats row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ background: "rgba(11,31,59,0.08)", color: "#0B1F3B" }}
          >
            Total: {items.length}
          </span>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              background: "rgba(156,163,175,0.15)",
              color: "#6B7280",
            }}
          >
            ⏳ Pending: {pending.length}
          </span>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              background: "rgba(34,197,94,0.12)",
              color: "#16A34A",
            }}
          >
            ✅ Approved: {approved.length}
          </span>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              background: "rgba(239,68,68,0.12)",
              color: "#DC2626",
            }}
          >
            ❌ Rejected: {rejected.length}
          </span>
        </div>
        {(approved.length > 0 || rejected.length > 0) && (
          <Button
            data-ocid="admin.feedback.delete_button"
            variant="outline"
            size="sm"
            onClick={handleClearResolved}
            className="text-xs"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear Resolved
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 py-12"
          data-ocid="admin.feedback.empty_state"
        >
          <MessageSquare className="w-12 h-12 text-gray-300" />
          <p className="text-gray-500 text-sm">No feedback submissions yet.</p>
        </div>
      ) : (
        <div className="space-y-3" data-ocid="admin.feedback.list">
          {items.map((item, i) => {
            const tc = TYPE_COLORS[item.type] ?? TYPE_COLORS.feedback;
            return (
              <motion.div
                key={item.id}
                data-ocid={`admin.feedback.item.${i + 1}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(255,255,255,0.8)",
                  border: "1px solid rgba(230,234,242,0.9)",
                  boxShadow: "0 2px 8px rgba(11,31,59,0.06)",
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        background: tc.bg,
                        color: tc.text,
                      }}
                    >
                      {TYPE_LABELS[item.type] ?? item.type}
                    </span>
                    {item.adminStatus === "pending" ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                        ⏳ Pending Review
                      </span>
                    ) : item.adminStatus === "approved" ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        ✅ Approved
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                        ❌ Rejected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(item.timestamp).toLocaleDateString("en-GB")}
                  </p>
                </div>

                {/* Content */}
                <p className="font-semibold text-navy text-sm">
                  {item.subject}
                </p>
                <p className="text-xs text-gray-400 mb-1">
                  By: {item.userName} ({item.userId})
                </p>
                <p className="text-gray-600 text-xs leading-relaxed mb-3">
                  {item.message}
                </p>

                {/* AI Rectification */}
                <div
                  className="rounded-xl p-3 mb-3"
                  style={{
                    background: "linear-gradient(135deg, #071428, #0B1F3B)",
                    border: "1px solid rgba(212,175,55,0.2)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className="w-3.5 h-3.5 text-gold" />
                    <span className="text-gold text-xs font-bold">
                      AI Rectification
                    </span>
                  </div>
                  <p className="text-white/70 text-xs leading-relaxed">
                    {item.aiStatus === "analyzing"
                      ? "🤖 AI is analyzing and preparing rectification..."
                      : item.aiSolution || "No solution generated."}
                  </p>
                </div>

                {/* Action buttons — only for pending */}
                {item.adminStatus === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      data-ocid={`admin.feedback.confirm_button.${i + 1}`}
                      size="sm"
                      onClick={() => handleApprove(item.id)}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white border-0"
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve &
                      Apply
                    </Button>
                    <Button
                      data-ocid={`admin.feedback.delete_button.${i + 1}`}
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(item.id)}
                      className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Approved Improvements Log */}
      {improvementLog.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-green-600" />
            <h4 className="font-bold text-navy text-sm">
              Approved Improvements ({improvementLog.length})
            </h4>
            <span
              className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: "rgba(34,197,94,0.1)",
                color: "#16A34A",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              ✅ Applied &amp; Live
            </span>
          </div>
          <div
            className="space-y-2"
            data-ocid="admin.feedback.improvements.list"
          >
            {improvementLog.map((entry, i) => {
              const tc = TYPE_COLORS[entry.type] ?? TYPE_COLORS.feedback;
              return (
                <div
                  key={entry.id}
                  data-ocid={`admin.feedback.improvements.item.${i + 1}`}
                  className="rounded-xl p-3"
                  style={{
                    background: "rgba(255,255,255,0.9)",
                    border: "1px solid rgba(34,197,94,0.25)",
                    borderLeft: "4px solid #22C55E",
                    boxShadow: "0 2px 6px rgba(34,197,94,0.08)",
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-bold"
                        style={{
                          background: tc.bg,
                          color: tc.text,
                        }}
                      >
                        {TYPE_LABELS[entry.type] ?? entry.type}
                      </span>
                      <p className="font-semibold text-navy text-xs">
                        {entry.subject}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(entry.approvedAt).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mb-1.5 leading-relaxed">
                    {entry.aiRectification.length > 180
                      ? `${entry.aiRectification.slice(0, 180)}...`
                      : entry.aiRectification}
                  </p>
                  <p className="text-xs text-gray-400">
                    Submitted by:{" "}
                    <span className="font-medium text-navy">
                      {entry.userName}
                    </span>{" "}
                    • Approved &amp; applied{" "}
                    {new Date(entry.approvedAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────
// AdminPanel main
// ──────────────────────────────────────────────────────
export function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const { allUsers, isAdmin, logout } = useAuth();

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
        <Shield className="w-16 h-16 text-gray-300" />
        <h2 className="text-xl font-bold text-navy">Access Denied</h2>
        <p className="text-gray-500">This page is for admins only.</p>
      </div>
    );
  }

  const loggedIn = allUsers.filter((u) => u.lastLogin).length;
  const guests = 3; // simulated
  const aiSettings = JSON.parse(localStorage.getItem("wb_ai_settings") ?? "{}");
  const aiAutoLearn = aiSettings.autoLearn ?? true;

  const handleLogout = () => {
    logout();
    onLogout();
  };

  return (
    <div className="space-y-6" data-ocid="admin.page">
      {/* Header */}
      <div
        className="flex items-center justify-between p-5 rounded-2xl"
        style={{
          background: "linear-gradient(135deg, #071428, #0B1F3B)",
          border: "1px solid rgba(212,175,55,0.3)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #F2D27A, #D4AF37)" }}
          >
            <Shield className="w-5 h-5 text-navy" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg">Admin Panel</h1>
            <p className="text-gold/60 text-xs">
              Waltz Bots — Malverin Stonehart
            </p>
          </div>
        </div>
        <Button
          data-ocid="admin.logout.button"
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-white/50 hover:text-white"
        >
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
      </div>

      {/* Bento grid home section */}
      <div>
        <h2 className="text-lg font-bold text-navy mb-3">Overview</h2>
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
          data-ocid="admin.section"
        >
          <BentoTile
            icon={Users}
            label="Total Users"
            value={allUsers.length}
            color="#2F6FED"
          />
          <BentoTile
            icon={UserCheck}
            label="Logged In"
            value={loggedIn}
            color="#22C55E"
          />
          <BentoTile
            icon={Activity}
            label="Guest Sessions"
            value={guests}
            color="#8B5CF6"
          />
          <BentoTile
            icon={Brain}
            label="AI Status"
            value={aiAutoLearn ? "Active" : "Paused"}
            color={aiAutoLearn ? "#22C55E" : "#EF4444"}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" data-ocid="admin.tab">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger
            data-ocid="admin.users.tab"
            value="users"
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" /> Users
          </TabsTrigger>
          <TabsTrigger
            data-ocid="admin.posts.tab"
            value="posts"
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" /> Posts
          </TabsTrigger>
          <TabsTrigger
            data-ocid="admin.ai.tab"
            value="ai"
            className="flex items-center gap-2"
          >
            <Brain className="w-4 h-4" /> AI
          </TabsTrigger>
          <TabsTrigger
            data-ocid="admin.feedback.tab"
            value="feedback"
            className="flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" /> Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <div className="glass-card p-5">
            <UsersTab />
          </div>
        </TabsContent>

        <TabsContent value="posts" className="mt-4">
          <div className="glass-card p-5">
            <PostsTab />
          </div>
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <AIDashboardPage
            isAdminView
            onToggleAutoLearn={(v) => {
              const s = JSON.parse(
                localStorage.getItem("wb_ai_settings") ?? "{}",
              );
              s.autoLearn = v;
              localStorage.setItem("wb_ai_settings", JSON.stringify(s));
            }}
          />
        </TabsContent>

        <TabsContent value="feedback" className="mt-4">
          <div className="glass-card p-5">
            <FeedbackAdminTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
