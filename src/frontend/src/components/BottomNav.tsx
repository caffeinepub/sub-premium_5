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

const regularTabs = [
  { id: "home" as const, label: "Home", icon: Home, ocid: "nav.home.link" },
  {
    id: "shorts" as const,
    label: "Shorts",
    icon: Zap,
    ocid: "nav.shorts.link",
  },
] as const;

const rightTabs = [
  {
    id: "live" as const,
    label: "Live",
    icon: Radio,
    ocid: "nav.live.link",
    hasLiveBadge: true,
  },
  {
    id: "history" as const,
    label: "History",
    icon: Clock,
    ocid: "nav.history.link",
    hasLiveBadge: false,
  },
  {
    id: "profile" as const,
    label: "Profile",
    icon: User,
    ocid: "nav.profile.link",
    hasLiveBadge: false,
  },
] as const;

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const handleUploadClick = () => {
    onTabChange("upload");
  };

  const renderTab = (
    id: TabId,
    label: string,
    Icon: React.ElementType,
    ocid: string,
    hasLiveBadge?: boolean,
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
          {hasLiveBadge && (
            <span
              className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
              style={{ background: "#FF2D2D" }}
            />
          )}
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

  return (
    <nav
      className="nav-bar shrink-0"
      aria-label="Main navigation"
      style={{
        background: "#0E0E0E",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.5)",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div className="flex items-stretch h-16 pb-safe">
        {/* Left tabs */}
        {regularTabs.map(({ id, label, icon: Icon, ocid }) =>
          renderTab(id, label, Icon, ocid, false),
        )}

        {/* Center Upload button */}
        <div
          className="relative flex-1 flex items-center justify-center"
          style={{ position: "relative", zIndex: 10 }}
        >
          <motion.button
            type="button"
            onClick={handleUploadClick}
            data-ocid="nav.upload.link"
            aria-label="Upload"
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2D2D]/50"
            style={{
              width: 56,
              height: 56,
              minWidth: 48,
              minHeight: 48,
              background: "#FF2D2D",
              boxShadow:
                "0 0 18px rgba(255,45,45,0.6), 0 4px 12px rgba(0,0,0,0.4)",
              position: "relative",
              bottom: 10,
              cursor: "pointer",
              pointerEvents: "auto",
              zIndex: 10,
            }}
          >
            <Upload className="w-6 h-6 text-white" strokeWidth={2.5} />
          </motion.button>
        </div>

        {/* Right tabs */}
        {rightTabs.map(({ id, label, icon: Icon, ocid, hasLiveBadge }) =>
          renderTab(id, label, Icon, ocid, hasLiveBadge),
        )}
      </div>
    </nav>
  );
}
