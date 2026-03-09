import { Bell, BookOpen, LogOut, Settings, User, Video } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";

interface AccountMenuDropdownProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (item: string) => void;
  unreadCount?: number;
}

interface MenuItem {
  id: string;
  label: string;
  icon: typeof Bell;
  ocid: string;
  accent: boolean;
  showBadge?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: "profile",
    label: "My Profile",
    icon: User,
    ocid: "account_menu.profile.button",
    accent: false,
  },
  {
    id: "myVideos",
    label: "My Videos",
    icon: Video,
    ocid: "account_menu.my_videos.button",
    accent: false,
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    icon: BookOpen,
    ocid: "account_menu.subscriptions.button",
    accent: false,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    ocid: "account_menu.notifications.button",
    accent: false,
    showBadge: true,
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    ocid: "account_menu.settings.button",
    accent: false,
  },
  {
    id: "logout",
    label: "Logout",
    icon: LogOut,
    ocid: "account_menu.logout.button",
    accent: true,
  },
];

export function AccountMenuDropdown({
  open,
  onClose,
  onNavigate,
  unreadCount = 0,
}: AccountMenuDropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="account-menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/40"
            aria-hidden="true"
            onClick={onClose}
          />

          {/* Dropdown card */}
          <motion.div
            key="account-menu-dropdown"
            ref={menuRef}
            data-ocid="account_menu.dropdown_menu"
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed top-[60px] right-3 z-50 w-52 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: "#111111",
              border: "1px solid #222222",
              transformOrigin: "top right",
            }}
          >
            {MENU_ITEMS.map((item, i) => {
              const Icon = item.icon;
              const isLogout = item.id === "logout";
              const showBadge = item.showBadge && unreadCount > 0;

              return (
                <motion.button
                  key={item.id}
                  type="button"
                  data-ocid={item.ocid}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: i * 0.04 }}
                  onClick={() => {
                    onNavigate(item.id);
                    onClose();
                  }}
                  className={[
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF0000]",
                    isLogout
                      ? "hover:bg-red-500/10 text-red-400"
                      : "hover:bg-white/5 text-white",
                    i > 0 ? "border-t border-white/5" : "",
                  ].join(" ")}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isLogout ? "bg-red-500/10" : "bg-white/6"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${isLogout ? "text-red-400" : "text-white/70"}`}
                    />
                  </div>
                  <span
                    className={`text-sm font-semibold flex-1 ${isLogout ? "text-red-400" : "text-white"}`}
                  >
                    {item.label}
                  </span>
                  {showBadge && (
                    <span className="text-[10px] font-bold bg-[#FF0000] text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
