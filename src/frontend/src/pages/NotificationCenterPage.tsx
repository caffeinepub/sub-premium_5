import {
  ArrowLeft,
  Bell,
  Heart,
  Star,
  Trash2,
  User,
  Video,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  clearNotifications,
  formatTimeAgo,
  getNotifications,
  markAllRead,
  markNotificationRead,
} from "../utils/notificationStore";
import type { AppNotification } from "../utils/notificationStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationCenterPageProps {
  userId: string;
  onBack: () => void;
  onVideoOpen?: (videoId: string) => void;
}

// ─── Icon + style map ─────────────────────────────────────────────────────────

type NotifType = AppNotification["type"];

const TYPE_CONFIG: Record<
  NotifType,
  { bg: string; iconColor: string; Icon: typeof Bell }
> = {
  follow: { bg: "#1A2535", iconColor: "#60A5FA", Icon: User },
  upload: { bg: "#2A1515", iconColor: "#FF2D2D", Icon: Video },
  like: { bg: "#2A1525", iconColor: "#F472B6", Icon: Heart },
  comment: { bg: "#152A1A", iconColor: "#4ADE80", Icon: Bell },
  live: { bg: "#2A1515", iconColor: "#FF2D2D", Icon: Zap },
  system: { bg: "#1A1A1A", iconColor: "#9CA3AF", Icon: Bell },
};

// ─── Fallback helper ──────────────────────────────────────────────────────────
function getTypeConfig(type: string) {
  return TYPE_CONFIG[type as NotifType] ?? TYPE_CONFIG.system;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationCenterPage({
  userId,
  onBack,
  onVideoOpen,
}: NotificationCenterPageProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!userId) return;
    setNotifications(getNotifications(userId));
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = (notifId: string) => {
    if (!userId) return;
    markNotificationRead(userId, notifId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)),
    );
  };

  const handleMarkAllRead = () => {
    if (!userId) return;
    markAllRead(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    if (!userId) return;
    clearNotifications(userId);
    setNotifications([]);
  };

  const handleNotifClick = (notif: AppNotification) => {
    handleMarkRead(notif.id);
    if (notif.videoId && onVideoOpen) {
      onVideoOpen(notif.videoId);
    }
  };

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: "#0f0f0f" }}
      data-ocid="notifications.page"
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: "#0f0f0f", borderBottom: "1px solid #1a1a1a" }}
      >
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ background: "#1a1a1a" }}
          data-ocid="notifications.back.button"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>

        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold text-white">Notifications</h1>
          {unreadCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#FF0000] text-white font-bold leading-none">
              {unreadCount}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleClearAll}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ background: "#1a1a1a" }}
          data-ocid="notifications.clear_all.button"
          aria-label="Clear all notifications"
          title="Clear all"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>

      {/* Actions row */}
      {notifications.length > 0 && unreadCount > 0 && (
        <div className="px-4 py-2 border-b border-white/5">
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-xs text-[#FF0000] font-semibold hover:text-[#ff5555] transition-colors"
            data-ocid="notifications.mark_all.button"
          >
            Mark all as read
          </button>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center h-full min-h-[50vh] px-6 text-center"
            data-ocid="notifications.empty_state"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "#1a1a1a" }}
            >
              <Bell className="w-7 h-7" style={{ color: "#444" }} />
            </div>
            <p className="text-white font-semibold text-base mb-1">
              No notifications yet
            </p>
            <p className="text-sm" style={{ color: "#666" }}>
              You'll see likes, follows, and uploads here.
            </p>
          </motion.div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#1a1a1a" }}>
            <AnimatePresence initial={false}>
              {notifications.map((notif, index) => {
                const config = getTypeConfig(notif.type);
                const Icon = config.Icon;
                const isUnread = !notif.read;

                return (
                  <motion.button
                    key={notif.id}
                    type="button"
                    data-ocid={`notifications.item.${index + 1}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, height: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    onClick={() => handleNotifClick(notif)}
                    className="w-full flex items-start gap-3 px-4 py-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF0000]"
                    style={{
                      background: isUnread
                        ? "rgba(255,45,45,0.04)"
                        : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.03)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isUnread
                        ? "rgba(255,45,45,0.04)"
                        : "transparent";
                    }}
                  >
                    {/* Icon circle */}
                    <div
                      className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5"
                      style={{ background: config.bg }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: config.iconColor }}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-bold leading-tight"
                        style={{ color: isUnread ? "#ffffff" : "#cccccc" }}
                      >
                        {notif.title}
                      </p>
                      <p
                        className="text-xs mt-0.5 line-clamp-2 leading-relaxed"
                        style={{ color: "#888888" }}
                      >
                        {notif.message}
                      </p>
                      <p
                        className="text-[11px] mt-1"
                        style={{ color: "#555555" }}
                      >
                        {formatTimeAgo(notif.timestamp)}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {isUnread && (
                      <div
                        className="shrink-0 mt-2 w-2 h-2 rounded-full"
                        style={{ background: "#FF0000" }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
