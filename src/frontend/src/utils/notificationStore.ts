/**
 * notificationStore.ts
 *
 * localStorage-based notification store for SUB PREMIUM.
 * Storage key per user: `sp_notifications_${userId}`
 * Max 100 notifications per user.
 *
 * Follow count store key: `sp_follow_counts`
 * Shape: Record<creatorPrincipalId, number>
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  type: "follow" | "upload" | "like" | "comment" | "live" | "system";
  title: string;
  message: string;
  timestamp: number; // Date.now()
  read: boolean;
  videoId?: string;
  actorUsername?: string; // who triggered it
}

// ─── Safe localStorage helpers ────────────────────────────────────────────────

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // quota or SSR — silently ignore
  }
}

function parseJSON<T>(raw: string | null, fallback: T): T {
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ─── Notification store ───────────────────────────────────────────────────────

const MAX_NOTIFICATIONS = 100;

function storageKey(userId: string): string {
  return `sp_notifications_${userId}`;
}

/**
 * Get all notifications for a user, newest first.
 */
export function getNotifications(userId: string): AppNotification[] {
  if (!userId) return [];
  const raw = lsGet(storageKey(userId));
  return parseJSON<AppNotification[]>(raw, []);
}

/**
 * Add a new notification for a user.
 * Prepends to the list and trims to MAX_NOTIFICATIONS.
 */
export function addNotification(
  userId: string,
  notif: Omit<AppNotification, "id" | "timestamp" | "read">,
): void {
  if (!userId) return;
  const key = storageKey(userId);
  const existing = parseJSON<AppNotification[]>(lsGet(key), []);

  const newNotif: AppNotification = {
    ...notif,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    read: false,
  };

  // Prepend and keep latest 100
  const updated = [newNotif, ...existing].slice(0, MAX_NOTIFICATIONS);
  lsSet(key, JSON.stringify(updated));
}

/**
 * Mark a single notification as read.
 */
export function markNotificationRead(userId: string, notifId: string): void {
  if (!userId) return;
  const key = storageKey(userId);
  const existing = parseJSON<AppNotification[]>(lsGet(key), []);
  const updated = existing.map((n) =>
    n.id === notifId ? { ...n, read: true } : n,
  );
  lsSet(key, JSON.stringify(updated));
}

/**
 * Mark all notifications as read for a user.
 */
export function markAllRead(userId: string): void {
  if (!userId) return;
  const key = storageKey(userId);
  const existing = parseJSON<AppNotification[]>(lsGet(key), []);
  const updated = existing.map((n) => ({ ...n, read: true }));
  lsSet(key, JSON.stringify(updated));
}

/**
 * Clear all notifications for a user.
 */
export function clearNotifications(userId: string): void {
  if (!userId) return;
  lsSet(storageKey(userId), JSON.stringify([]));
}

/**
 * Get the count of unread notifications for a user.
 */
export function getUnreadCount(userId: string): number {
  if (!userId) return 0;
  const notifications = getNotifications(userId);
  return notifications.filter((n) => !n.read).length;
}

// ─── Follow count store ───────────────────────────────────────────────────────

const FOLLOW_COUNTS_KEY = "sp_follow_counts";

function getFollowCounts(): Record<string, number> {
  return parseJSON<Record<string, number>>(lsGet(FOLLOW_COUNTS_KEY), {});
}

function saveFollowCounts(counts: Record<string, number>): void {
  lsSet(FOLLOW_COUNTS_KEY, JSON.stringify(counts));
}

/**
 * Get follower count for a creator.
 */
export function getFollowerCount(creatorPrincipalId: string): number {
  if (!creatorPrincipalId) return 0;
  const counts = getFollowCounts();
  return counts[creatorPrincipalId] ?? 0;
}

/**
 * Increment follower count for a creator (call on follow).
 */
export function incrementFollowerCount(creatorPrincipalId: string): void {
  if (!creatorPrincipalId) return;
  const counts = getFollowCounts();
  counts[creatorPrincipalId] = (counts[creatorPrincipalId] ?? 0) + 1;
  saveFollowCounts(counts);
}

/**
 * Decrement follower count for a creator (call on unfollow).
 */
export function decrementFollowerCount(creatorPrincipalId: string): void {
  if (!creatorPrincipalId) return;
  const counts = getFollowCounts();
  const current = counts[creatorPrincipalId] ?? 0;
  counts[creatorPrincipalId] = Math.max(0, current - 1);
  saveFollowCounts(counts);
}

// ─── Time-ago helper ──────────────────────────────────────────────────────────

/**
 * Format a timestamp as a human-readable time-ago string.
 */
export function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}
