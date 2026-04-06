import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AIDashboardPage } from "./components/AIDashboardPage";
import { AdminPanel } from "./components/AdminPanel";
import { FeedbackPage } from "./components/FeedbackPage";
import { FounderPage } from "./components/FounderPage";
import { HomePage } from "./components/HomePage";
import { NewsPage } from "./components/NewsPage";
import { PostPage } from "./components/PostPage";
import { ProfilePage } from "./components/ProfilePage";
import { SearchPage } from "./components/SearchPage";
import { Sidebar } from "./components/Sidebar";
import { SignalsPage } from "./components/SignalsPage";
import { TickerTape } from "./components/TickerTape";
import { TopNav } from "./components/TopNav";
import { TrackingPage } from "./components/TrackingPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { SignalScanProvider } from "./context/SignalScanContext";

type TabId =
  | "home"
  | "signals"
  | "search"
  | "tracking"
  | "founder"
  | "profile"
  | "post"
  | "news"
  | "ai-dashboard"
  | "admin"
  | "feedback";

const queryClient = new QueryClient();

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAdmin } = useAuth();

  // Dynamically measure the fixed top bar height to avoid overlap
  const topBarRef = useRef<HTMLDivElement>(null);
  const [topBarHeight, setTopBarHeight] = useState(148);

  useEffect(() => {
    const el = topBarRef.current;
    if (!el) return;
    // Set initial height immediately
    setTopBarHeight(el.offsetHeight);
    const obs = new ResizeObserver(() => {
      setTopBarHeight(el.offsetHeight);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleTabChange = (tab: string) => {
    if (tab === "admin" && !isAdmin) return;
    setActiveTab(tab as TabId);
  };

  function renderPage(tab: TabId) {
    switch (tab) {
      case "home":
        return <HomePage onTabChange={handleTabChange} />;
      case "signals":
        return <SignalsPage onTabChange={handleTabChange} />;
      case "search":
        return <SearchPage />;
      case "tracking":
        return <TrackingPage />;
      case "founder":
        return <FounderPage />;
      case "profile":
        return <ProfilePage />;
      case "post":
        return <PostPage />;
      case "news":
        return <NewsPage />;
      case "ai-dashboard":
        return <AIDashboardPage />;
      case "feedback":
        return <FeedbackPage />;
      case "admin":
        return isAdmin ? (
          <AdminPanel onLogout={() => handleTabChange("home")} />
        ) : (
          <HomePage onTabChange={handleTabChange} />
        );
      default:
        return <HomePage onTabChange={handleTabChange} />;
    }
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(135deg, #F6F8FC 0%, #EFF4FB 50%, #F3F6FB 100%)",
      }}
    >
      {/* ─── Fixed Top Region ──────────────────────────────────────────────── */}
      <div
        ref={topBarRef}
        className="fixed top-0 left-0 right-0 z-40 flex flex-col"
      >
        {/* Section 1: Site Header */}
        <div
          className="w-full flex flex-col items-center justify-center py-2 px-4"
          style={{
            background:
              "linear-gradient(135deg, #0B1F3B 0%, #0A254A 60%, #071428 100%)",
            borderBottom: "1px solid rgba(212,175,55,0.18)",
          }}
        >
          <h1
            className="font-black tracking-widest text-base sm:text-lg leading-tight"
            style={{
              background: "linear-gradient(135deg, #F2D27A, #D4AF37, #B8960C)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "0.18em",
            }}
          >
            WALTZ BOTS
          </h1>
          <p
            className="text-xs font-medium tracking-widest mt-0.5"
            style={{ color: "rgba(212,175,55,0.5)", letterSpacing: "0.1em" }}
          >
            powered by Trezaria Holdings
          </p>
        </div>

        {/* Section 2: Ticker Tape */}
        <div
          className="w-full overflow-hidden"
          style={{
            background: "rgba(7,20,40,0.92)",
            borderBottom: "1px solid rgba(212,175,55,0.12)",
          }}
        >
          <TickerTape />
        </div>

        {/* Section 3: Navigation snackbar */}
        <div
          className="w-full px-3 py-1.5"
          style={{
            background: "rgba(246,248,252,0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottom: "1px solid rgba(212,175,55,0.1)",
            boxShadow: "0 4px 24px rgba(11,31,59,0.08)",
          }}
        >
          <div className="max-w-screen-xl mx-auto">
            <TopNav
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onMenuOpen={() => setSidebarOpen(true)}
            />
          </div>
        </div>
      </div>

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onNavigate={handleTabChange}
      />

      {/* Main content — offset dynamically measured from fixed top bar */}
      <main
        className="pb-12"
        style={{
          paddingTop: `${topBarHeight}px`,
          paddingLeft: "max(1rem, 2vw)",
          paddingRight: "max(1rem, 2vw)",
        }}
      >
        <div className="max-w-screen-xl mx-auto">{renderPage(activeTab)}</div>
      </main>

      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <AuthProvider>
          <SignalScanProvider>
            <AppContent />
          </SignalScanProvider>
        </AuthProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
}
