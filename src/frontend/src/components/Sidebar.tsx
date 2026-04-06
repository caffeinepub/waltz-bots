import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart2,
  Brain,
  FileText,
  Home,
  LogOut,
  MessageSquare,
  Newspaper,
  Radio,
  Search,
  Shield,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onNavigate: (tab: string) => void;
}

const BASE_NAV = [
  { id: "profile", label: "PROFILE", icon: User },
  { id: "home", label: "HOME", icon: Home },
  { id: "signals", label: "SIGNALS", icon: Radio },
  { id: "search", label: "SEARCH", icon: Search },
  { id: "post", label: "POSTS", icon: FileText },
  { id: "news", label: "NEWS", icon: Newspaper },
  { id: "tracking", label: "TRACKING", icon: TrendingUp },
  { id: "ai-dashboard", label: "AI DASHBOARD", icon: Brain },
  { id: "founder", label: "FOUNDER", icon: Users },
  { id: "feedback", label: "FEEDBACK", icon: MessageSquare },
];

export function Sidebar({
  isOpen,
  onClose,
  activeTab,
  onNavigate,
}: SidebarProps) {
  const { user, isAdmin, isLoggedIn, logout } = useAuth();

  const navItems = isAdmin
    ? [...BASE_NAV, { id: "admin", label: "ADMIN PANEL", icon: Shield }]
    : BASE_NAV;

  const initials = user
    ? (user.displayName ?? user.username)
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "GU";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sidebar panel */}
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 h-full w-72 z-50 flex flex-col"
            style={{
              background:
                "linear-gradient(180deg, #0B1F3B 0%, #0A254A 60%, #071428 100%)",
              boxShadow: "8px 0 40px rgba(0,0,0,0.4)",
            }}
          >
            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Logo */}
            <div className="p-6 pb-0">
              <div className="flex items-center gap-3 mb-1">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-navy-deep"
                  style={{
                    background:
                      "linear-gradient(135deg, #F2D27A, #D4AF37, #B8960C)",
                    boxShadow:
                      "inset 0 1px 1px rgba(255,255,255,0.4), 0 4px 10px rgba(212,175,55,0.5)",
                  }}
                >
                  WB
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight">
                    Waltz Bots
                  </h2>
                  <p className="text-gold/70 text-xs">
                    powered by Trezaria Holdings
                  </p>
                </div>
              </div>
            </div>

            <div className="mx-6 my-4 border-t border-white/10" />

            {/* User profile card */}
            <div className="mx-4 mb-4">
              <div
                className="rounded-2xl p-4"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.08) 100%)",
                  border: "1px solid rgba(212,175,55,0.3)",
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-navy font-bold text-sm"
                    style={{
                      background: "linear-gradient(135deg, #F2D27A, #D4AF37)",
                    }}
                  >
                    {initials}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {isLoggedIn
                        ? (user?.displayName ?? user?.username ?? "User")
                        : "Guest User"}
                    </p>
                    <p className="text-gold/70 text-xs">
                      {isAdmin
                        ? "Administrator"
                        : isLoggedIn
                          ? user?.status === "active"
                            ? "Premium Member"
                            : "Expired"
                          : "Limited Access"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div
                    className="rounded-lg p-2"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <p className="text-white/50 mb-0.5">UID</p>
                    <p className="text-gold font-mono font-semibold truncate">
                      {isLoggedIn ? user?.uid : "GUEST"}
                    </p>
                  </div>
                  <div
                    className="rounded-lg p-2"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <p className="text-white/50 mb-0.5">Status</p>
                    {isAdmin ? (
                      <Badge className="bg-gold/20 text-gold border-gold/30 text-xs px-1.5 py-0">
                        Admin
                      </Badge>
                    ) : isLoggedIn && user?.status === "active" ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs px-1.5 py-0">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs px-1.5 py-0">
                        Guest
                      </Badge>
                    )}
                  </div>
                  {isLoggedIn && !isAdmin && user?.subscriptionExpiry && (
                    <div
                      className="rounded-lg p-2 col-span-2"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <p className="text-white/50 mb-0.5">Expires</p>
                      <p className="text-white font-medium">
                        {new Date(user.subscriptionExpiry).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {!isLoggedIn && (
                    <div
                      className="rounded-lg p-2 col-span-2"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <p className="text-white/50 mb-0.5">Credits</p>
                      <p className="text-yellow-400 font-bold">
                        10 free views left
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 pb-4 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    data-ocid={`sidebar.${item.id}.link`}
                    onClick={() => {
                      onNavigate(item.id);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition-all duration-200 group"
                    style={
                      isActive
                        ? {
                            background:
                              "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))",
                            borderLeft: "3px solid #D4AF37",
                          }
                        : { background: "transparent" }
                    }
                  >
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive
                          ? "text-gold"
                          : item.id === "admin"
                            ? "text-gold/70"
                            : "text-white/40 group-hover:text-white/70"
                      }`}
                    />
                    <span
                      className={`text-xs font-semibold tracking-widest transition-colors ${
                        isActive
                          ? "text-gold"
                          : item.id === "admin"
                            ? "text-gold/70"
                            : "text-white/60 group-hover:text-white/80"
                      }`}
                    >
                      {item.label}
                    </span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-white/10">
              {isLoggedIn && (
                <button
                  type="button"
                  data-ocid="sidebar.logout.button"
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors mb-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-xs font-semibold">LOGOUT</span>
                </button>
              )}
              <p className="text-white/30 text-xs text-center">
                &copy; {new Date().getFullYear()} Waltz Bots
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
