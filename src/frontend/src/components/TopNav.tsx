import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import {
  type WBNotification,
  useNotifications,
} from "@/context/NotificationContext";
import {
  Bell,
  Home,
  LogOut,
  Menu,
  Radio,
  Search,
  Shield,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface TopNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onMenuOpen: () => void;
}

const BASE_TABS = [
  { id: "home", label: "HOME", icon: Home },
  { id: "signals", label: "SIGNALS", icon: Radio },
  { id: "search", label: "SEARCH", icon: Search },
  { id: "tracking", label: "TRACKING", icon: TrendingUp },
  { id: "founder", label: "FOUNDER", icon: Users },
];

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getNotifColor(type: WBNotification["type"]): string {
  if (type === "tp_hit") return "#22C55E";
  if (type === "new_signal") return "#3B82F6";
  return "#8A94A6";
}

function getNotifBg(type: WBNotification["type"]): string {
  if (type === "tp_hit") return "rgba(34,197,94,0.08)";
  if (type === "new_signal") return "rgba(59,130,246,0.08)";
  return "rgba(138,148,166,0.08)";
}

export function TopNav({ activeTab, onTabChange, onMenuOpen }: TopNavProps) {
  const { user, isAdmin, isLoggedIn, login, logout } = useAuth();
  const { notifications, unreadCount, markAllRead, clearAll } =
    useNotifications();
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const tabs = isAdmin
    ? [...BASE_TABS, { id: "admin", label: "ADMIN", icon: Shield }]
    : BASE_TABS;

  // Click-outside to close notification dropdown
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        notifRef.current &&
        !notifRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setShowNotifs(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogin = async () => {
    setLoginError("");
    setLoggingIn(true);
    await new Promise((r) => setTimeout(r, 400));
    const result = await login(username, password);
    setLoggingIn(false);
    if (result.success) {
      setShowLogin(false);
      setUsername("");
      setPassword("");
      toast.success("Logged in successfully!");
    } else {
      setLoginError(result.error ?? "Login failed.");
    }
  };

  const initials = user
    ? (user.displayName ?? user.username)
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  return (
    <>
      {/* Nav bar — no fixed positioning; App.tsx handles the sticky container */}
      <div className="flex items-center gap-2">
        {/* Hamburger */}
        <button
          type="button"
          data-ocid="nav.menu.button"
          onClick={onMenuOpen}
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #0B1F3B, #0A254A)",
            boxShadow: "0 3px 10px rgba(11,31,59,0.3)",
          }}
        >
          <Menu className="w-4 h-4" style={{ color: "#D4AF37" }} />
        </button>

        {/* Tabs pill */}
        <div
          className="flex-1 flex items-center min-w-0 rounded-2xl px-1.5 py-1"
          style={{
            background: "rgba(255,255,255,0.9)",
            border: "1px solid rgba(212,175,55,0.15)",
            boxShadow:
              "0 2px 12px rgba(11,31,59,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
          }}
        >
          <div
            className="flex items-center gap-0.5 overflow-x-auto no-scrollbar flex-1"
            data-ocid="nav.tabs"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isAdminTab = tab.id === "admin";
              return (
                <button
                  type="button"
                  key={tab.id}
                  data-ocid={`nav.${tab.id}.tab`}
                  onClick={() => onTabChange(tab.id)}
                  className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold tracking-wider transition-all duration-200 whitespace-nowrap flex-shrink-0"
                  style={{
                    color: isActive
                      ? isAdminTab
                        ? "#D4AF37"
                        : "#0B1F3B"
                      : "#8A94A6",
                    background: isActive
                      ? isAdminTab
                        ? "rgba(212,175,55,0.12)"
                        : "rgba(11,31,59,0.07)"
                      : "transparent",
                    borderBottom: isActive
                      ? `2px solid ${isAdminTab ? "#D4AF37" : "#0B1F3B"}`
                      : "2px solid transparent",
                  }}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right side: bell + user */}
          <div className="flex items-center gap-1 pl-1 flex-shrink-0 border-l border-gray-100 ml-1 relative">
            {/* Notification Bell */}
            <button
              ref={bellRef}
              type="button"
              data-ocid="nav.notifications.button"
              onClick={() => {
                setShowNotifs((v) => !v);
                if (!showNotifs && unreadCount > 0) markAllRead();
              }}
              className="relative w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-navy hover:bg-gray-100 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span
                  className="absolute top-0.5 right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-white font-black"
                  style={{
                    background: "#EF4444",
                    fontSize: "9px",
                    padding: "0 3px",
                    boxShadow: "0 0 4px rgba(239,68,68,0.6)",
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              {unreadCount === 0 && (
                <span
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"
                  style={{ boxShadow: "0 0 4px rgba(239,68,68,0.6)" }}
                />
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifs && (
              <div
                ref={notifRef}
                data-ocid="nav.notifications.popover"
                className="absolute top-10 right-0 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden"
                style={{
                  background: "white",
                  border: "1px solid rgba(11,31,59,0.12)",
                  boxShadow: "0 8px 32px rgba(11,31,59,0.18)",
                }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{
                    background: "linear-gradient(135deg, #0B1F3B, #0A254A)",
                    borderBottom: "1px solid rgba(212,175,55,0.2)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4" style={{ color: "#D4AF37" }} />
                    <span className="text-white font-bold text-sm">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span
                        className="px-1.5 py-0.5 rounded-full text-xs font-black"
                        style={{
                          background: "rgba(239,68,68,0.9)",
                          color: "white",
                        }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        data-ocid="nav.notifications.clear_button"
                        onClick={clearAll}
                        className="text-white/50 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      data-ocid="nav.notifications.close_button"
                      onClick={() => setShowNotifs(false)}
                      className="text-white/50 hover:text-white transition-colors w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Notification list */}
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div
                      className="flex flex-col items-center justify-center py-8 gap-2"
                      data-ocid="nav.notifications.empty_state"
                    >
                      <Bell className="w-8 h-8 text-gray-200" />
                      <p className="text-gray-400 text-xs">
                        No notifications yet
                      </p>
                      <p className="text-gray-300 text-xs">
                        TP hits and new signals will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className="px-4 py-3 flex gap-3 items-start"
                          style={{
                            background: notif.read
                              ? "white"
                              : getNotifBg(notif.type),
                          }}
                        >
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                            style={{ background: getNotifColor(notif.type) }}
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-xs font-bold"
                              style={{ color: getNotifColor(notif.type) }}
                            >
                              {notif.title}
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                              {notif.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatRelativeTime(notif.timestamp)}
                            </p>
                          </div>
                          {!notif.read && (
                            <div
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                              style={{ background: getNotifColor(notif.type) }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer actions */}
                {notifications.length > 0 && (
                  <div
                    className="px-4 py-2 flex gap-2"
                    style={{ borderTop: "1px solid rgba(11,31,59,0.08)" }}
                  >
                    <button
                      type="button"
                      data-ocid="nav.notifications.mark_read_button"
                      onClick={markAllRead}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-gray-50"
                      style={{
                        color: "#0B1F3B",
                        border: "1px solid rgba(11,31,59,0.12)",
                      }}
                    >
                      Mark all read
                    </button>
                  </div>
                )}
              </div>
            )}

            {isLoggedIn ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  data-ocid="nav.profile.button"
                  onClick={() => onTabChange("profile")}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-bold transition-colors hover:bg-gray-50"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                    style={{
                      background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
                      color: "#3d2800",
                    }}
                  >
                    {initials}
                  </div>
                  <span className="hidden sm:block text-navy text-xs">
                    {user?.username}
                  </span>
                </button>
                <button
                  type="button"
                  data-ocid="nav.logout.button"
                  onClick={() => {
                    logout();
                    toast.success("Logged out.");
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-ocid="nav.login.button"
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all hover:shadow-sm"
                style={{
                  borderColor: "rgba(212,175,55,0.5)",
                  color: "#B8960C",
                  background: "rgba(212,175,55,0.06)",
                }}
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Login Dialog */}
      <Dialog
        open={showLogin}
        onOpenChange={(o) => {
          setShowLogin(o);
          setLoginError("");
        }}
      >
        <DialogContent
          data-ocid="nav.login.dialog"
          className="bg-white"
          style={{ background: "white", backgroundColor: "white" }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
                style={{
                  background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
                  color: "#3d2800",
                }}
              >
                WB
              </div>
              Login to Waltz Bots
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Username</Label>
              <Input
                data-ocid="nav.login.input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Password</Label>
              <Input
                data-ocid="nav.login.input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>
            {loginError && (
              <p
                className="text-red-500 text-xs"
                data-ocid="nav.login.error_state"
              >
                {loginError}
              </p>
            )}
            <Button
              data-ocid="nav.login.submit_button"
              onClick={handleLogin}
              disabled={loggingIn}
              className="w-full btn-gold border-0"
            >
              {loggingIn ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                  Logging in...
                </span>
              ) : (
                "Login"
              )}
            </Button>
            <p className="text-xs text-gray-400 text-center">
              Accounts are created by the admin only.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
