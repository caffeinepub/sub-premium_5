/**
 * videoEngagement.ts
 *
 * Frontend engagement engine for video views and likes.
 * Acts as single source of truth; designed to be wired to a backend actor later.
 *
 * Storage keys (namespaced to avoid collisions):
 *   ve_views_{videoId}           → total view count (number as string)
 *   ve_likes_{videoId}           → total like count (number as string)
 *   ve_vt_{videoId}_{userId}     → timestamp (ms) of last view
 *   ve_lk_{videoId}_{userId}     → "1" if user has liked, absent if not
 */

// ─── Safe localStorage wrappers ───────────────────────────────────────────────

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
    /* quota exceeded or SSR — silently ignore */
  }
}

function lsRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function safeNum(raw: string | null, fallback = 0): number {
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Read the current view and like counts from local storage.
 * Returns safe defaults of 0 if absent or corrupt.
 */
export function getEngagement(videoId: string): {
  views: number;
  likes: number;
} {
  return {
    views: safeNum(lsGet(`ve_views_${videoId}`)),
    likes: safeNum(lsGet(`ve_likes_${videoId}`)),
  };
}

/**
 * Returns true if the given user has liked this video.
 */
export function getUserLiked(videoId: string, userId: string): boolean {
  return lsGet(`ve_lk_${videoId}_${userId}`) === "1";
}

/**
 * "Backend call" — reads engagement data asynchronously.
 * Currently implemented as a fast local read + tiny async delay so the
 * call site can await it and swap to a real actor call later.
 *
 * Respects the AbortSignal: if aborted before the micro-delay resolves,
 * throws an AbortError so the caller can handle it cleanly.
 */
export async function fetchEngagement(
  videoId: string,
  userId: string,
  signal?: AbortSignal,
): Promise<{ views: number; likes: number; userLiked: boolean }> {
  // Tiny async delay — real backend call goes here later
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = setTimeout(resolve, 50);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

  const { views, likes } = getEngagement(videoId);
  const userLiked = getUserLiked(videoId, userId);
  return { views, likes, userLiked };
}

/**
 * Records a view for (videoId, userId).
 * No-ops and returns current count if the user already viewed in the last 24h.
 * Returns the new (or unchanged) view count.
 */
export async function recordView(
  videoId: string,
  userId: string,
): Promise<number> {
  try {
    const tsKey = `ve_vt_${videoId}_${userId}`;
    const last = safeNum(lsGet(tsKey), 0);
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    if (last !== 0 && now - last < TWENTY_FOUR_HOURS) {
      // Already viewed within 24 hours — return current count without incrementing
      return safeNum(lsGet(`ve_views_${videoId}`));
    }

    // Increment view count
    const currentViews = safeNum(lsGet(`ve_views_${videoId}`));
    const newViews = currentViews + 1;
    lsSet(`ve_views_${videoId}`, String(newViews));
    lsSet(tsKey, String(now));
    return newViews;
  } catch {
    return safeNum(lsGet(`ve_views_${videoId}`));
  }
}

/**
 * Atomically toggles like status for (videoId, userId).
 * - If already liked: removes the like record, decrements count (min 0).
 * - If not liked: adds the like record, increments count.
 * Returns the resulting { liked, likeCount }.
 */
export function toggleLike(
  videoId: string,
  userId: string,
): { liked: boolean; likeCount: number } {
  try {
    const likeKey = `ve_lk_${videoId}_${userId}`;
    const countKey = `ve_likes_${videoId}`;
    const currentLikes = safeNum(lsGet(countKey));

    if (lsGet(likeKey) === "1") {
      // Un-like
      lsRemove(likeKey);
      const newCount = Math.max(0, currentLikes - 1);
      lsSet(countKey, String(newCount));
      return { liked: false, likeCount: newCount };
    }
    // Like
    lsSet(likeKey, "1");
    const newCount = currentLikes + 1;
    lsSet(countKey, String(newCount));
    return { liked: true, likeCount: newCount };
  } catch {
    // On any error return safe current state
    const currentLikes = safeNum(lsGet(`ve_likes_${videoId}`));
    const currentLiked = lsGet(`ve_lk_${videoId}_${userId}`) === "1";
    return { liked: currentLiked, likeCount: currentLikes };
  }
}
