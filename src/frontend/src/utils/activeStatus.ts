// ─── Active Status Utilities ──────────────────────────────────────────────────
// Tracks user online/active status using localStorage timestamps.

const ACTIVE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes = online
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

function storageKey(principalId: string): string {
  return `last-active-${principalId}`;
}

export function updateActiveStatus(principalId: string): void {
  if (!principalId) return;
  try {
    localStorage.setItem(storageKey(principalId), Date.now().toString());
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function getActiveStatus(principalId: string): number | null {
  if (!principalId) return null;
  try {
    const raw = localStorage.getItem(storageKey(principalId));
    if (!raw) return null;
    const ts = Number(raw);
    return Number.isNaN(ts) ? null : ts;
  } catch {
    return null;
  }
}

export interface ActiveStatusInfo {
  isOnline: boolean;
  label: string;
}

export function formatActiveStatus(timestamp: number | null): ActiveStatusInfo {
  if (timestamp === null) {
    return { isOnline: false, label: "Offline" };
  }
  const diff = Date.now() - timestamp;
  if (diff < ACTIVE_THRESHOLD_MS) {
    return { isOnline: true, label: "Online" };
  }
  if (diff < HOUR_MS) {
    const mins = Math.floor(diff / MINUTE_MS);
    return { isOnline: false, label: `Active ${mins}m ago` };
  }
  const hours = Math.floor(diff / HOUR_MS);
  return { isOnline: false, label: `Active ${hours}h ago` };
}
