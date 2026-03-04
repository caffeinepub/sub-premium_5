import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { BottomNav } from "./components/BottomNav";
import type { TabId } from "./components/BottomNav";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetCallerUserProfile, useIsCallerAdmin } from "./hooks/useQueries";
import HistoryPage from "./pages/HistoryPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import SetupProfilePage from "./pages/SetupProfilePage";
import ShortsPage from "./pages/ShortsPage";
import UploadPage from "./pages/UploadPage";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const { identity, isInitializing } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched: profileFetched,
  } = useGetCallerUserProfile();

  const { data: isAdmin = false } = useIsCallerAdmin();

  // Show full-screen loading while initializing auth
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  // Not authenticated → show login
  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  // Authenticated but profile still loading → show spinner
  if (profileLoading && !profileFetched) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Setting up…</p>
        </div>
      </div>
    );
  }

  // Authenticated but no profile → profile setup
  const showProfileSetup =
    isAuthenticated &&
    !profileLoading &&
    profileFetched &&
    userProfile === null;

  if (showProfileSetup) {
    return (
      <>
        <SetupProfilePage />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  // Main app
  const renderPage = () => {
    switch (activeTab) {
      case "home":
        return <HomePage key="home" />;
      case "shorts":
        return <ShortsPage key="shorts" />;
      case "upload":
        return <UploadPage key="upload" />;
      case "history":
        return <HistoryPage key="history" />;
      case "profile":
        return <ProfilePage key="profile" />;
      default:
        return <HomePage key="home" />;
    }
  };

  // Shorts page is full-screen — no animation wrapper padding
  const isShortsPage = activeTab === "shorts";

  return (
    <>
      <div className="flex justify-center min-h-screen bg-[oklch(0.07_0_0)]">
        {/* Mobile container */}
        <div
          className="relative flex flex-col bg-background w-full max-w-[430px] min-h-screen overflow-hidden"
          style={{ boxShadow: "0 0 60px oklch(0 0 0 / 0.5)" }}
        >
          {/* Page content */}
          <div
            className={`flex-1 overflow-hidden relative ${isShortsPage ? "bg-black" : ""}`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: isShortsPage ? 0 : 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isShortsPage ? 0 : -8 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="absolute inset-0 flex flex-col"
              >
                {renderPage()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom navigation */}
          <BottomNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isAdmin={isAdmin}
          />
        </div>
      </div>

      <Toaster position="top-center" richColors />
    </>
  );
}
