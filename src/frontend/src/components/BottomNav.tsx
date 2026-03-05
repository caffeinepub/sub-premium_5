import { Clock, Home, Radio, Upload, User, Zap } from "lucide-react";
import { motion } from "motion/react";

export type TabId =
  | "home"
  | "shorts"
  | "upload"
  | "live"
  | "history"
  | "profile";

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const leftTabs = [
  { id: "home" as const, label: "Home", icon: Home, ocid: "nav.home.link" },
  {
    id: "shorts" as const,
    label: "Shorts",
    icon: Zap,
    ocid: "nav.shorts.link",
  },
  {
    id: "upload" as const,
    label: "Upload",
    icon: Upload,
    ocid: "nav.upload.link",
  },
] as const;

const rightTabs = [
  {
    id: "history" as const,
    label: "History",
    icon: Clock,
    ocid: "nav.history.link",
  },
  {
    id: "profile" as const,
    label: "Profile",
    icon: User,
    ocid: "nav.profile.link",
  },
] as const;

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const renderTab = (
    id: TabId,
    label: string,
    Icon: React.ElementType,
    ocid: string,
  ) => {
    const isActive = activeTab === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => onTabChange(id)}
        className="relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2D2D]/50 rounded-lg cursor-pointer"
        aria-label={label}
        aria-current={isActive ? "page" : undefined}
        data-ocid={ocid}
        style={{ pointerEvents: "auto" }}
      >
        {isActive && (
          <motion.div
            layoutId="nav-active-indicator"
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
            style={{ background: "#FF2D2D" }}
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
          />
        )}
        <motion.div
          animate={{ scale: isActive ? 1.15 : 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative"
        >
          <Icon
            className={`w-4 h-4 transition-colors duration-200 ${isActive ? "text-[#FF2D2D]" : "text-gray-500"}`}
            strokeWidth={isActive ? 2.5 : 2}
          />
        </motion.div>
        <motion.span
          animate={{ color: isActive ? "#FF2D2D" : "#6b7280" }}
          transition={{ duration: 0.2 }}
          className="text-[9px] font-semibold tracking-wide"
        >
          {label}
        </motion.span>
      </button>
    );
  };

  const isLiveActive = activeTab === "live";

  return (
    <nav
      className="nav-bar shrink-0"
      aria-label="Main navigation"
      style={{
        background: "#0E0E0E",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.5)",
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 430,
        zIndex: 40,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          minHeight: 70,
        }}
      >
        {/* Left group: Home, Shorts, Upload */}
        <div className="flex flex-1 items-stretch">
          {leftTabs.map(({ id, label, icon: Icon, ocid }) =>
            renderTab(id, label, Icon, ocid),
          )}
        </div>

        {/* Center: Go Live button — true flex center item */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            padding: "0 4px",
          }}
        >
          <motion.button
            type="button"
            onClick={() => onTabChange("live")}
            data-ocid="nav.live.link"
            aria-label="Go Live"
            aria-current={isLiveActive ? "page" : undefined}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2E2E]/60"
            style={{
              position: "relative",
              width: 64,
              height: 64,
              borderRadius: "50%",
              backgroundColor: "#FF2E2E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: "translateY(-20px)",
              boxShadow: isLiveActive
                ? "0 6px 20px rgba(255, 46, 46, 0.7), 0 0 0 3px rgba(255,46,46,0.25)"
                : "0 6px 20px rgba(255, 46, 46, 0.4)",
              cursor: "pointer",
              pointerEvents: "auto",
              zIndex: 10,
              flexShrink: 0,
              transition: "box-shadow 0.2s ease",
            }}
          >
            <Radio className="w-6 h-6 text-white" strokeWidth={2.5} />
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: "white",
                letterSpacing: "0.05em",
                marginTop: 2,
                lineHeight: 1,
              }}
            >
              LIVE
            </span>
            {/* Live indicator dot */}
            <span
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "white",
                opacity: 0.9,
              }}
            />
          </motion.button>
        </div>

        {/* Right group: History, Profile */}
        <div className="flex flex-1 items-stretch justify-end">
          {rightTabs.map(({ id, label, icon: Icon, ocid }) =>
            renderTab(id, label, Icon, ocid),
          )}
        </div>
      </div>
    </nav>
  );
}
