import { Bell, Star, User, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";

export type NotificationType = "upload" | "subscription" | "premium";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  videoId?: string;
}

export const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "upload",
    title: "New Upload",
    message: "TechReviewer uploaded 'iPhone 16 Review'",
    time: "2m ago",
    read: false,
  },
  {
    id: "2",
    type: "subscription",
    title: "New Subscriber",
    message: "You have 3 new subscribers",
    time: "15m ago",
    read: false,
  },
  {
    id: "3",
    type: "premium",
    title: "Premium Content",
    message: "5 new premium videos available",
    time: "1h ago",
    read: false,
  },
  {
    id: "4",
    type: "upload",
    title: "Trending Now",
    message: "'The Dark Knight 4K' is trending",
    time: "2h ago",
    read: true,
  },
  {
    id: "5",
    type: "subscription",
    title: "Subscription Update",
    message: "Creator StreamVault posted new content",
    time: "3h ago",
    read: true,
  },
];

const TYPE_STYLES: Record<
  NotificationType,
  { bg: string; text: string; Icon: typeof Bell }
> = {
  upload: { bg: "bg-[#FF2D2D]/15", text: "text-[#FF2D2D]", Icon: Bell },
  subscription: { bg: "bg-blue-500/15", text: "text-blue-400", Icon: User },
  premium: { bg: "bg-yellow-500/15", text: "text-yellow-400", Icon: Star },
};

interface NotificationsPanelProps {
  open: boolean;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
  onVideoOpen?: (videoId: string) => void;
}

export function NotificationsPanel({
  open,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClose,
  onVideoOpen,
}: NotificationsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    // Delay to avoid the same click that opened the panel from closing it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, onClose]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const NOTIFICATION_OCIDS = [
    "notifications.item.1",
    "notifications.item.2",
    "notifications.item.3",
    "notifications.item.4",
    "notifications.item.5",
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="notifications-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-20 bg-black/50"
            aria-hidden="true"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="notifications-panel"
            ref={panelRef}
            data-ocid="notifications.panel"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-[112px] left-0 right-0 z-30 mx-2 rounded-2xl bg-[#111111] border border-white/8 shadow-2xl overflow-hidden"
            style={{ maxHeight: "70vh" }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#FF2D2D] text-white font-semibold leading-none">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    data-ocid="notifications.mark_all.button"
                    onClick={onMarkAllRead}
                    className="text-xs text-[#FF2D2D] font-semibold hover:text-[#ff5555] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Close notifications"
                  data-ocid="notifications.close_button"
                  onClick={onClose}
                  className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/12 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div
              className="overflow-y-auto"
              style={{ maxHeight: "calc(70vh - 53px)" }}
            >
              {notifications.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-12 px-6 text-center"
                  data-ocid="notifications.empty_state"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/6 flex items-center justify-center mb-3">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No notifications yet
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/6">
                  {notifications.map((notification, index) => {
                    const style = TYPE_STYLES[notification.type];
                    const Icon = style.Icon;
                    const ocid =
                      NOTIFICATION_OCIDS[index] ??
                      `notifications.item.${index + 1}`;
                    return (
                      <motion.button
                        key={notification.id}
                        type="button"
                        data-ocid={ocid}
                        onClick={() => {
                          onMarkRead(notification.id);
                          if (
                            notification.type === "upload" &&
                            notification.videoId &&
                            onVideoOpen
                          ) {
                            onVideoOpen(notification.videoId);
                            onClose();
                          }
                        }}
                        whileTap={{ scale: 0.99 }}
                        className={[
                          "w-full flex items-start gap-3 px-4 py-3 text-left",
                          "hover:bg-white/4 transition-colors duration-150",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                          !notification.read ? "bg-white/2" : "",
                        ].join(" ")}
                      >
                        {/* Icon circle */}
                        <div
                          className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${style.bg}`}
                        >
                          <Icon className={`w-4 h-4 ${style.text}`} />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-[11px] text-muted-foreground/60 mt-1">
                            {notification.time}
                          </p>
                        </div>

                        {/* Unread dot */}
                        {!notification.read && (
                          <div className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-[#FF2D2D]" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
