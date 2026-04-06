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
import {
  Activity,
  Brain,
  CheckCircle,
  FileText,
  ImageIcon,
  LogOut,
  MessageSquare,
  Plus,
  Shield,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
// Users Tab
// ──────────────────────────────────────────────────────
function UsersTab() {
  const { allUsers, addUser, deleteUser, refreshUsers } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [subType, setSubType] = useState<"1day" | "1week" | "1month" | "1year">(
    "1month",
  );
  const [addError, setAddError] = useState("");

  const handleAdd = () => {
    setAddError("");
    if (!newUsername.trim() || !newPassword.trim()) {
      setAddError("Username and password are required.");
      return;
    }
    const result = addUser(newUsername.trim(), newPassword.trim(), subType);
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-ocid="admin.users.table">
            <thead>
              <tr className="border-b border-gray-100">
                {["Username", "UID", "Status", "Expiry", "Last Login", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left py-2 px-3 text-xs font-semibold text-gray-400"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {allUsers.map((u: WBUser, i: number) => (
                <motion.tr
                  key={u.uid}
                  data-ocid={`admin.users.item.${i + 1}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-gray-50 hover:bg-gray-50/50"
                >
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-navy"
                        style={{
                          background:
                            "linear-gradient(135deg, #F2D27A, #D4AF37)",
                        }}
                      >
                        {u.username[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-navy">
                        {u.username}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 font-mono text-xs text-gray-500">
                    {u.uid}
                  </td>
                  <td className="py-2 px-3">
                    {u.status === "active" ? (
                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-xs">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/15 text-red-500 border-red-500/20 text-xs">
                        Expired
                      </Badge>
                    )}
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-500">
                    {u.subscriptionExpiry
                      ? new Date(u.subscriptionExpiry).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-400">
                    {u.lastLogin
                      ? new Date(u.lastLogin).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="py-2 px-3">
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
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
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

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem("wb_feedback") ?? "[]"));
    } catch {
      setItems([]);
    }
  }, []);

  const saveAndUpdate = (updated: FeedbackItem[]) => {
    try {
      localStorage.setItem("wb_feedback", JSON.stringify(updated));
    } catch {
      /* ignore */
    }
    setItems(updated);
  };

  const handleApprove = (id: string) => {
    const updated = items.map((i) =>
      i.id === id ? { ...i, adminStatus: "approved" as const } : i,
    );
    saveAndUpdate(updated);
    toast.success("Submission approved.");
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

                {/* AI solution */}
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
                      AI Solution
                    </span>
                  </div>
                  <p className="text-white/70 text-xs leading-relaxed">
                    {item.aiStatus === "analyzing"
                      ? "🤖 AI is analyzing..."
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
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
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
