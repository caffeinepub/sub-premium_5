import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { AIAssistant } from "./components/AIAssistant";
import { BottomNav } from "./components/BottomNav";
import type { TabId } from "./components/BottomNav";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "./hooks/useQueries";
import { LanguageProvider } from "./i18n/LanguageContext";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import BattleHistoryPage from "./pages/BattleHistoryPage";
import HistoryPage from "./pages/HistoryPage";
import HomePage from "./pages/HomePage";
import LiveAnalyticsPage from "./pages/LiveAnalyticsPage";
import LiveCountdownPage from "./pages/LiveCountdownPage";
import LivePage from "./pages/LivePage";
import LiveReplayPage from "./pages/LiveReplayPage";
import LiveVerticalSetupPage from "./pages/LiveVerticalSetupPage";
import LiveWatchPage from "./pages/LiveWatchPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import PublicCreatorProfilePage from "./pages/PublicCreatorProfilePage";
import RechargePage from "./pages/RechargePage";
import SetupProfilePage from "./pages/SetupProfilePage";
import ShortsCreatePage from "./pages/ShortsCreatePage";
import ShortsPage from "./pages/ShortsPage";
import UploadPage from "./pages/UploadPage";
import WalletPage from "./pages/WalletPage";
import WeeklyLeaderboardPage from "./pages/WeeklyLeaderboardPage";
import WithdrawPage from "./pages/WithdrawPage";
import { updateActiveStatus } from "./utils/activeStatus";

// ─── Sub-route types ──────────────────────────────────────────────────────────

type LiveSubRoute =
  | { type: "setup" }
  | { type: "vertical-setup"; streamId: bigint }
  | { type: "countdown"; streamId: bigint }
  | {
      type: "watch";
      streamId: bigint;
      isCreator?: boolean;
      streamTitle?: string;
    }
  | { type: "analytics"; streamId: bigint }
  | { type: "replay"; streamId: bigint }
  | { type: "battle-history" }
  | { type: "weekly-leaderboard" }
  | null;

type ShortsSubRoute = { type: "create" } | null;

type WalletSubRoute = "main" | "recharge" | "withdraw" | "admin" | null;

function AppInner() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [liveSubRoute, setLiveSubRoute] = useState<LiveSubRoute>(null);
  const [shortsSubRoute, setShortsSubRoute] = useState<ShortsSubRoute>(null);
  const [walletSubRoute, setWalletSubRoute] = useState<WalletSubRoute>(null);
  const [creatorProfileRoute, setCreatorProfileRoute] = useState<{
    principalId: string;
  } | null>(null);
  const [profileTimedOut, setProfileTimedOut] = useState(false);
  const [initTimedOut, setInitTimedOut] = useState(false);
  const { identity, isInitializing } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const isAuthenticated = !!identity;

  // 8-second timeout: if auth init is still pending, show a Retry button
  useEffect(() => {
    if (!isInitializing) return;
    const t = setTimeout(() => setInitTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [isInitializing]);

  // Track active status
  useEffect(() => {
    const principalId = identity?.getPrincipal().toString();
    if (!principalId) return;
    updateActiveStatus(principalId);
    const interval = setInterval(() => updateActiveStatus(principalId), 60_000);
    return () => clearInterval(interval);
  }, [identity]);

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched: profileFetched,
  } = useGetCallerUserProfile();

  // 5-second timeout: if profile is still loading, unblock the UI
  useEffect(() => {
    if (!profileLoading) return;
    const t = setTimeout(() => setProfileTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, [profileLoading]);

  // Block on initializing only while within the 8-second window.
  if (isInitializing && !initTimedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Restoring session…</p>
        </div>
      </div>
    );
  }

  // After timeout — show retry option so users are never permanently stuck.
  if (isInitializing && initTimedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Taking longer than expected…
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
            data-ocid="app.init.retry_button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  if (profileLoading && !profileFetched && !profileTimedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Setting up…</p>
        </div>
      </div>
    );
  }

  // Show profile setup only when we have a definitive null (no profile exists).
  // Guard against the brief window where actor is still initializing but profileFetched
  // flips to true with null data — that would incorrectly redirect to SetupProfilePage.
  // Only show setup once the actor is ready AND not still fetching.
  const showProfileSetup =
    isAuthenticated &&
    !actorFetching &&
    !profileLoading &&
    profileFetched &&
    !profileTimedOut &&
    userProfile === null;

  if (showProfileSetup) {
    return (
      <>
        <SetupProfilePage />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  // ─── Navigation helpers ───────────────────────────────────────────────────

  const navigateToTab = (tab: TabId) => {
    setActiveTab(tab);
    setLiveSubRoute(null);
    setShortsSubRoute(null);
    setWalletSubRoute(null);
    setCreatorProfileRoute(null);
  };

  // Whether we're in a full-screen sub-route (hide bottom nav)
  const isFullScreenRoute =
    creatorProfileRoute !== null ||
    walletSubRoute !== null ||
    (activeTab === "live" &&
      liveSubRoute !== null &&
      liveSubRoute.type !== "setup") ||
    (activeTab === "shorts" && shortsSubRoute !== null);

  // ─── Page renderer ────────────────────────────────────────────────────────

  const renderPage = () => {
    // CREATOR PROFILE sub-route (full-screen, hide bottom nav)
    if (creatorProfileRoute !== null) {
      return (
        <PublicCreatorProfilePage
          key={`creator-${creatorProfileRoute.principalId}`}
          principalId={creatorProfileRoute.principalId}
          onBack={() => setCreatorProfileRoute(null)}
        />
      );
    }

    // WALLET sub-routes (full-screen, hide bottom nav)
    if (walletSubRoute === "main") {
      return (
        <WalletPage
          key="wallet-main"
          onBack={() => setWalletSubRoute(null)}
          onRecharge={() => setWalletSubRoute("recharge")}
          onWithdraw={() => setWalletSubRoute("withdraw")}
        />
      );
    }
    if (walletSubRoute === "recharge") {
      return (
        <RechargePage
          key="wallet-recharge"
          onBack={() => setWalletSubRoute("main")}
        />
      );
    }
    if (walletSubRoute === "withdraw") {
      return (
        <WithdrawPage
          key="wallet-withdraw"
          onBack={() => setWalletSubRoute("main")}
        />
      );
    }
    if (walletSubRoute === "admin") {
      return (
        <AdminDashboardPage
          key="admin-dashboard"
          onBack={() => setWalletSubRoute(null)}
        />
      );
    }

    // SHORTS sub-routes
    if (activeTab === "shorts" && shortsSubRoute?.type === "create") {
      return (
        <ShortsCreatePage
          key="shorts-create"
          onBack={() => setShortsSubRoute(null)}
          onGoLive={(streamId) => {
            setShortsSubRoute(null);
            setActiveTab("live");
            setLiveSubRoute({ type: "vertical-setup", streamId });
          }}
        />
      );
    }

    // LIVE sub-routes
    if (activeTab === "live" && liveSubRoute !== null) {
      switch (liveSubRoute.type) {
        case "setup":
          return (
            <LivePage
              key="live-setup"
              onNavigateToWatch={(streamId) =>
                setLiveSubRoute({ type: "watch", streamId, isCreator: false })
              }
              onNavigateToSetup={() =>
                setLiveSubRoute({
                  type: "vertical-setup",
                  streamId: BigInt(Date.now()),
                })
              }
            />
          );

        case "vertical-setup":
          return (
            <LiveVerticalSetupPage
              key="live-vertical-setup"
              streamId={liveSubRoute.streamId}
              onBack={() => setLiveSubRoute(null)}
              onGoLive={() =>
                setLiveSubRoute({
                  type: "countdown",
                  streamId: liveSubRoute.streamId,
                })
              }
            />
          );

        case "countdown":
          return (
            <LiveCountdownPage
              key="live-countdown"
              streamId={liveSubRoute.streamId}
              onCancel={() => setLiveSubRoute(null)}
              onLive={() =>
                setLiveSubRoute({
                  type: "watch",
                  streamId: liveSubRoute.streamId,
                  isCreator: true,
                })
              }
            />
          );

        case "watch":
          return (
            <LiveWatchPage
              key={`live-watch-${liveSubRoute.streamId.toString()}`}
              streamId={liveSubRoute.streamId}
              isCreator={liveSubRoute.isCreator ?? false}
              streamTitle={liveSubRoute.streamTitle}
              onBack={() => setLiveSubRoute(null)}
              onEndStream={() =>
                setLiveSubRoute({
                  type: "analytics",
                  streamId: liveSubRoute.streamId,
                })
              }
              onNavigateToWallet={() => {
                setLiveSubRoute(null);
                setWalletSubRoute("main");
              }}
              onBattleHistory={() =>
                setLiveSubRoute({ type: "battle-history" })
              }
              onWeeklyLeaderboard={() =>
                setLiveSubRoute({ type: "weekly-leaderboard" })
              }
            />
          );

        case "analytics":
          return (
            <LiveAnalyticsPage
              key="live-analytics"
              streamId={liveSubRoute.streamId}
              onBack={() => setLiveSubRoute(null)}
              onDelete={() => setLiveSubRoute(null)}
            />
          );

        case "replay":
          return (
            <LiveReplayPage
              key="live-replay"
              streamId={liveSubRoute.streamId}
              onBack={() => setLiveSubRoute(null)}
            />
          );

        case "battle-history":
          return (
            <BattleHistoryPage
              key="battle-history"
              onBack={() => setLiveSubRoute(null)}
            />
          );

        case "weekly-leaderboard":
          return (
            <WeeklyLeaderboardPage
              key="weekly-leaderboard"
              onBack={() => setLiveSubRoute(null)}
            />
          );
      }
    }

    // Default tab pages
    switch (activeTab) {
      case "home":
        return (
          <HomePage
            key="home"
            onCreatorClick={(principalId) =>
              setCreatorProfileRoute({ principalId })
            }
          />
        );
      case "shorts":
        return (
          <ShortsPage
            key="shorts"
            onGoLive={() => setShortsSubRoute({ type: "create" })}
          />
        );
      case "upload":
        return <UploadPage key="upload" />;
      case "live":
        return (
          <LivePage
            key="live"
            onNavigateToWatch={(streamId) =>
              setLiveSubRoute({ type: "watch", streamId, isCreator: false })
            }
            onNavigateToSetup={() => {
              const mockId = BigInt(Date.now());
              setLiveSubRoute({ type: "vertical-setup", streamId: mockId });
            }}
          />
        );
      case "history":
        return <HistoryPage key="history" />;
      case "profile":
        return (
          <ProfilePage
            key="profile"
            onWalletNavigate={() => setWalletSubRoute("main")}
            onAdminDashboard={() => setWalletSubRoute("admin")}
          />
        );
      default:
        return <HomePage key="home" />;
    }
  };

  const isShortsPage = activeTab === "shorts" && !shortsSubRoute;

  return (
    <>
      <div className="flex justify-center min-h-screen bg-[oklch(0.07_0_0)]">
        <div
          className="relative flex flex-col bg-background w-full max-w-[430px] min-h-screen overflow-hidden"
          style={{ boxShadow: "0 0 60px oklch(0 0 0 / 0.5)" }}
        >
          {/* Page content — bottom padding accounts for fixed nav height + safe area */}
          <div
            className={`flex-1 overflow-hidden relative ${isShortsPage ? "bg-black" : ""}`}
            style={
              !isFullScreenRoute
                ? { paddingBottom: "calc(70px + env(safe-area-inset-bottom))" }
                : undefined
            }
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeTab}-${liveSubRoute?.type ?? "null"}-${shortsSubRoute?.type ?? "null"}-${creatorProfileRoute?.principalId ?? "null"}`}
                initial={{
                  opacity: 0,
                  x: isShortsPage || isFullScreenRoute ? 0 : 8,
                }}
                animate={{ opacity: 1, x: 0 }}
                exit={{
                  opacity: 0,
                  x: isShortsPage || isFullScreenRoute ? 0 : -8,
                }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="absolute inset-0 flex flex-col"
              >
                {renderPage()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom navigation — hidden in full-screen sub-routes */}
          {!isFullScreenRoute && (
            <BottomNav activeTab={activeTab} onTabChange={navigateToTab} />
          )}

          {/* Floating AI Assistant — hidden in full-screen sub-routes, on profile tab,
              and when the actor is not yet available (fail silently, no error shown) */}
          {!isFullScreenRoute && activeTab !== "profile" && !!actor && (
            <AIAssistant />
          )}
        </div>
      </div>

      <Toaster position="top-center" richColors />
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  );
}
