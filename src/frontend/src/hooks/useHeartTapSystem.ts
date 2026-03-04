import { useCallback, useEffect, useRef, useState } from "react";

interface TapRecord {
  timestamp: number;
}

interface UseHeartTapSystemOptions {
  streamId: bigint;
  actor: {
    likeLiveStream: (id: bigint) => Promise<void>;
    getLiveStream: (id: bigint) => Promise<{ totalLikes: bigint } | null>;
  } | null;
  onTapAnimated?: (x: number, y: number) => void;
}

interface UseHeartTapSystemReturn {
  localCount: number;
  serverCount: number;
  comboMultiplier: number;
  showCombo: boolean;
  recordTap: (x: number, y: number) => void;
  resetSession: () => void;
}

// Anti-bot: detect unnatural intervals (all taps within ±5ms of each other)
function isBotPattern(timestamps: number[]): boolean {
  if (timestamps.length < 5) return false;
  const diffs = timestamps.slice(1).map((t, i) => t - timestamps[i]);
  const avg = diffs.reduce((s, d) => s + d, 0) / diffs.length;
  const maxDev = Math.max(...diffs.map((d) => Math.abs(d - avg)));
  return maxDev < 5 && avg > 0;
}

// Get damping weight based on session duration (ms)
function getDampingWeight(sessionDurationMs: number): number {
  const mins = sessionDurationMs / 60000;
  if (mins < 2) return 1.0;
  if (mins < 4) return 0.8;
  if (mins < 6) return 0.5;
  return 0.2;
}

export function useHeartTapSystem({
  streamId,
  actor,
  onTapAnimated,
}: UseHeartTapSystemOptions): UseHeartTapSystemReturn {
  // Seed with a realistic starting count
  const seedCount = useRef(Math.floor(Math.random() * 4000) + 1000);

  const [localCount, setLocalCount] = useState(seedCount.current);
  const [serverCount, setServerCount] = useState(seedCount.current);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [showCombo, setShowCombo] = useState(false);

  // Refs for session tracking (no re-render needed)
  const tapBufferRef = useRef<TapRecord[]>([]);
  const sessionStartRef = useRef<number | null>(null);
  const lastTapTimestampRef = useRef<number>(0);
  const comboTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboRef = useRef(1);
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const serverSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const prevLevelRef = useRef(0);

  // Sync local count from server on mount
  useEffect(() => {
    if (!actor) return;
    actor
      .getLiveStream(streamId)
      .then((stream) => {
        if (stream && stream.totalLikes > 0n) {
          const sCount = Number(stream.totalLikes);
          setServerCount(sCount);
          setLocalCount(sCount);
          seedCount.current = sCount;
        }
      })
      .catch(() => {});
  }, [actor, streamId]);

  // Flush tap buffer to server every 500ms with shadow throttling
  useEffect(() => {
    flushIntervalRef.current = setInterval(() => {
      const buffer = tapBufferRef.current;
      if (buffer.length === 0) return;

      // Anti-bot: cap at 20 taps/sec
      const now = Date.now();
      const recentWindow = buffer.filter((t) => now - t.timestamp < 1000);
      let countToFlush = Math.min(buffer.length, recentWindow.length);
      countToFlush = Math.min(countToFlush, 10); // batch cap

      // Apply anti-bot cap: max 20/sec
      if (recentWindow.length > 20) {
        countToFlush = Math.floor(countToFlush * (20 / recentWindow.length));
      }

      // Apply session damping
      const sessionDuration =
        sessionStartRef.current !== null ? now - sessionStartRef.current : 0;
      let weight = getDampingWeight(sessionDuration);

      // Bot pattern detection: apply extra 50% decay
      const recentTimestamps = buffer.slice(-10).map((t) => t.timestamp);
      if (isBotPattern(recentTimestamps)) {
        weight *= 0.5;
      }

      // Weighted count to send
      const weightedCount = Math.max(1, Math.floor(countToFlush * weight));

      // Clear processed taps
      tapBufferRef.current = buffer.slice(countToFlush);

      // Fire silently — one call with weighted count
      if (actor && weightedCount > 0) {
        // We call likeLiveStream multiple times (weighted) in one batch
        const calls = Array.from({ length: weightedCount }, () =>
          actor.likeLiveStream(streamId).catch(() => {}),
        );
        Promise.all(calls).catch(() => {});
      }
    }, 500);

    return () => {
      if (flushIntervalRef.current) clearInterval(flushIntervalRef.current);
    };
  }, [actor, streamId]);

  // Sync server count every 10 seconds
  useEffect(() => {
    if (!actor) return;

    const sync = () => {
      actor
        .getLiveStream(streamId)
        .then((stream) => {
          if (stream) {
            const sCount = Number(stream.totalLikes);
            setServerCount((prev) => {
              // Detect level up
              const prevLevel = Math.floor(prev / 10000);
              const newLevel = Math.floor(sCount / 10000);
              if (newLevel > prevLevel && prevLevel >= 0) {
                prevLevelRef.current = newLevel;
              }
              return sCount;
            });
          }
        })
        .catch(() => {});
    };

    serverSyncIntervalRef.current = setInterval(sync, 10000);
    return () => {
      if (serverSyncIntervalRef.current)
        clearInterval(serverSyncIntervalRef.current);
    };
  }, [actor, streamId]);

  // Reset session if idle > 30s
  useEffect(() => {
    const idleCheckInterval = setInterval(() => {
      if (
        sessionStartRef.current !== null &&
        Date.now() - lastTapTimestampRef.current > 30000
      ) {
        sessionStartRef.current = null;
      }
    }, 5000);
    return () => clearInterval(idleCheckInterval);
  }, []);

  const recordTap = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      lastTapTimestampRef.current = now;

      // Start/continue session
      if (sessionStartRef.current === null) {
        sessionStartRef.current = now;
      }

      // Add to tap buffer
      tapBufferRef.current.push({ timestamp: now });

      // Update combo multiplier
      const timeSinceLast = now - lastTapTimestampRef.current;
      let newCombo = comboRef.current;

      if (timeSinceLast < 400) {
        // Rapid tap — increase combo
        newCombo = Math.min(10, newCombo + 1);
      } else {
        newCombo = 1;
      }
      comboRef.current = newCombo;
      setComboMultiplier(newCombo);
      setShowCombo(newCombo > 1);

      // Reset combo after 1.2s idle
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = setTimeout(() => {
        comboRef.current = 1;
        setComboMultiplier(1);
        setShowCombo(false);
      }, 1200);

      // Always increment local count immediately — no limits visible
      setLocalCount((prev) => prev + newCombo);

      // Trigger animation callback
      onTapAnimated?.(x, y);
    },
    [onTapAnimated],
  );

  const resetSession = useCallback(() => {
    sessionStartRef.current = null;
    tapBufferRef.current = [];
    comboRef.current = 1;
    setComboMultiplier(1);
    setShowCombo(false);
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetSession();
      if (flushIntervalRef.current) clearInterval(flushIntervalRef.current);
      if (serverSyncIntervalRef.current)
        clearInterval(serverSyncIntervalRef.current);
    };
  }, [resetSession]);

  return {
    localCount,
    serverCount,
    comboMultiplier,
    showCombo,
    recordTap,
    resetSession,
  };
}
