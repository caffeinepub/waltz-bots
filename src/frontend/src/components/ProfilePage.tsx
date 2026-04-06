import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Camera,
  CheckCircle,
  Mail,
  Phone,
  Save,
  Target,
  TrendingUp,
  Trophy,
  User,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function ProfilePage() {
  const { user, updateProfile, isAdmin } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [timezone, setTimezone] = useState(user?.timezone ?? "UTC");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [currency, setCurrency] = useState(user?.currency ?? "USD");
  const [saving, setSaving] = useState(false);

  // Auto-sync stats every 30 seconds
  useEffect(() => {
    if (!user) return;
    const history = user.tradeHistory ?? { total: 0, wins: 0, losses: 0 };
    const doSync = () => {
      const key = `wb_user_stats_${user.uid}`;
      localStorage.setItem(
        key,
        JSON.stringify({
          tradeHistory: history,
          winRatio:
            history.total > 0
              ? ((history.wins / history.total) * 100).toFixed(1)
              : "0.0",
          lastSynced: Date.now(),
        }),
      );
    };
    // Sync on mount
    doSync();
    const interval = setInterval(doSync, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-96 gap-4"
        data-ocid="profile.empty_state"
      >
        <User className="w-16 h-16 text-gray-300" />
        <h2 className="text-xl font-bold text-navy">Not Logged In</h2>
        <p className="text-gray-500 text-sm">
          Please log in to view your profile.
        </p>
      </div>
    );
  }

  const initials = (user.displayName ?? user.username)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    updateProfile({ displayName, email, bio, timezone, phone, currency });
    setSaving(false);
    toast.success("Profile updated successfully");
  };

  const history = user.tradeHistory ?? { total: 0, wins: 0, losses: 0 };
  const winRate =
    history.total > 0
      ? ((history.wins / history.total) * 100).toFixed(1)
      : "0.0";
  const lossRate =
    history.total > 0
      ? ((history.losses / history.total) * 100).toFixed(1)
      : "0.0";
  const successRate = winRate;
  const failureRate = lossRate;

  return (
    <div className="space-y-6 max-w-2xl mx-auto" data-ocid="profile.page">
      <div className="flex items-center gap-3 mb-6">
        <User className="w-6 h-6 text-gold" />
        <h1 className="text-2xl font-bold text-navy font-display">
          My Profile
        </h1>
      </div>

      {/* Avatar + Identity card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-5">
          <div className="relative">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black text-navy"
              style={{
                background:
                  "linear-gradient(135deg, #F2D27A, #D4AF37, #B8960C)",
              }}
            >
              {initials}
            </div>
            <button
              type="button"
              data-ocid="profile.upload_button"
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center bg-navy text-white shadow-lg hover:bg-navy-deep transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1">
            <h2 className="text-xl font-bold text-navy">
              {user.displayName ?? user.username}
            </h2>
            <p className="text-gray-500 text-sm">@{user.username}</p>
            <div className="flex items-center gap-2 mt-2">
              {isAdmin ? (
                <Badge className="bg-gold/20 text-gold border-gold/30 text-xs">
                  ADMIN
                </Badge>
              ) : user.status === "active" ? (
                <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" /> Active
                </Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-500 border-red-500/30 text-xs">
                  Expired
                </Badge>
              )}
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-400">User ID</p>
            <p className="font-mono text-xs text-navy font-bold">{user.uid}</p>
            {user.subscriptionExpiry && (
              <>
                <p className="text-xs text-gray-400 mt-2">Expires</p>
                <p className="text-xs text-navy font-medium">
                  {new Date(user.subscriptionExpiry).toLocaleDateString()}
                </p>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Trade history stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
        data-ocid="profile.section"
      >
        {/* Main stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card p-4 text-center">
            <TrendingUp className="w-5 h-5 text-gold mx-auto mb-1" />
            <p className="text-xl font-bold text-navy">{history.total}</p>
            <p className="text-xs text-gray-400">Total Trades</p>
          </div>
          <div className="stat-card p-4 text-center">
            <Trophy className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-green-600">{history.wins}</p>
            <p className="text-xs text-gray-400">Wins</p>
          </div>
          <div className="stat-card p-4 text-center">
            <Target className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-red-500">{history.losses}</p>
            <p className="text-xs text-gray-400">Losses</p>
          </div>
        </div>

        {/* Detailed ratio stats */}
        <div className="grid grid-cols-2 gap-3">
          {/* Win Ratio */}
          <div
            className="stat-card p-4 relative overflow-hidden"
            style={{ borderLeft: "3px solid #22C55E" }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-400 font-medium">Win Ratio</p>
              {/* Live pulsing dot */}
              <span className="flex items-center gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block"
                  title="Live"
                />
                <span className="text-xs text-green-500 font-semibold">
                  LIVE
                </span>
              </span>
            </div>
            <p className="text-2xl font-black text-green-600">{winRate}%</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {history.wins} wins / {history.total} trades
            </p>
          </div>

          {/* Success Rate */}
          <div
            className="stat-card p-4"
            style={{ borderLeft: "3px solid #3B82F6" }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-400 font-medium">Success Rate</p>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />
                <span className="text-xs text-blue-500 font-semibold">
                  LIVE
                </span>
              </span>
            </div>
            <p className="text-2xl font-black text-blue-600">{successRate}%</p>
            <p className="text-xs text-gray-400 mt-0.5">Trades hit TP</p>
          </div>

          {/* Failure Rate */}
          <div
            className="stat-card p-4"
            style={{ borderLeft: "3px solid #EF4444" }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-400 font-medium">Failure Rate</p>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                <span className="text-xs text-red-500 font-semibold">LIVE</span>
              </span>
            </div>
            <p className="text-2xl font-black text-red-500">{failureRate}%</p>
            <p className="text-xs text-gray-400 mt-0.5">Trades hit SL</p>
          </div>

          {/* Net P&L */}
          <div
            className="stat-card p-4"
            style={{ borderLeft: "3px solid #D4AF37" }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-400 font-medium">Net P&L</p>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse inline-block" />
                <span className="text-xs text-gold font-semibold">LIVE</span>
              </span>
            </div>
            <p
              className="text-2xl font-black"
              style={{
                color: history.wins >= history.losses ? "#22C55E" : "#EF4444",
              }}
            >
              {history.wins >= history.losses ? "+" : "-"}
              {Math.abs(history.wins - history.losses)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Wins minus losses</p>
          </div>
        </div>

        {/* Win/Loss progress bar */}
        {history.total > 0 && (
          <div className="glass-card p-4">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span className="text-green-600 font-semibold">
                Wins: {history.wins}
              </span>
              <span className="text-gray-400">Total: {history.total}</span>
              <span className="text-red-500 font-semibold">
                Losses: {history.losses}
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${winRate}%`,
                  background: "linear-gradient(90deg, #16A34A, #22C55E)",
                  transition: "width 0.7s ease",
                }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5 text-center">
              Auto-synced every 30s • Stored permanently per user
            </p>
          </div>
        )}
      </motion.div>

      {/* Editable fields */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-6 space-y-4"
      >
        <h3 className="font-bold text-navy flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #F2D27A, #D4AF37)" }}
          >
            <User className="w-3.5 h-3.5 text-navy" />
          </span>
          Edit Profile
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-600">
              Display Name
            </Label>
            <Input
              data-ocid="profile.input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your full name"
              className="border-gray-200 focus:border-gold"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email
            </Label>
            <Input
              data-ocid="profile.input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="border-gray-200 focus:border-gold"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
              <Phone className="w-3 h-3" /> Phone Number
            </Label>
            <Input
              data-ocid="profile.input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
              className="border-gray-200 focus:border-gold"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-600">
              Timezone
            </Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger
                data-ocid="profile.select"
                className="border-gray-200"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[
                  "UTC",
                  "UTC+5:30",
                  "UTC+8",
                  "UTC-5",
                  "UTC-8",
                  "UTC+1",
                  "UTC+3",
                ].map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-600">
              Preferred Currency
            </Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger
                data-ocid="profile.select"
                className="border-gray-200"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["USD", "EUR", "GBP", "JPY", "INR", "SGD", "MYR", "AED"].map(
                  (c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-gray-600">Bio</Label>
          <Textarea
            data-ocid="profile.textarea"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself and your trading style..."
            rows={3}
            className="border-gray-200 focus:border-gold resize-none"
          />
        </div>

        <Button
          data-ocid="profile.save_button"
          onClick={handleSave}
          disabled={saving}
          className="btn-gold border-0 px-6"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Changes
            </span>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
