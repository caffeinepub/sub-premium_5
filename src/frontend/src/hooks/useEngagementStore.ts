/**
 * useEngagementStore — client-side engagement scoring for Top 3 Chairs
 * Scores are persisted in localStorage keyed by streamId.
 */

import { useCallback, useEffect, useState } from "react";

export interface EngagementEntry {
  username: string;
  score: number;
  tapPoints: number;
  commentPoints: number;
  giftPoints: number;
  avatar: string; // initials fallback
}

type EngagementMap = Record<string, EngagementEntry>;

function storageKey(streamId: bigint) {
  return `engagement_${streamId.toString()}`;
}

function load(streamId: bigint): EngagementMap {
  try {
    const raw = localStorage.getItem(storageKey(streamId));
    return raw ? (JSON.parse(raw) as EngagementMap) : {};
  } catch {
    return {};
  }
}

function save(streamId: bigint, data: EngagementMap) {
  try {
    localStorage.setItem(storageKey(streamId), JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

function initials(username: string) {
  return username.slice(0, 2).toUpperCase();
}

export function useEngagementStore(streamId: bigint) {
  const [data, setData] = useState<EngagementMap>(() => load(streamId));

  // Sync back to storage whenever data changes
  useEffect(() => {
    save(streamId, data);
  }, [streamId, data]);

  const upsert = useCallback(
    (
      username: string,
      delta: Partial<
        Pick<EngagementEntry, "tapPoints" | "commentPoints" | "giftPoints">
      >,
    ) => {
      setData((prev) => {
        const existing: EngagementEntry = prev[username] ?? {
          username,
          score: 0,
          tapPoints: 0,
          commentPoints: 0,
          giftPoints: 0,
          avatar: initials(username),
        };
        const tapPoints = existing.tapPoints + (delta.tapPoints ?? 0);
        const commentPoints =
          existing.commentPoints + (delta.commentPoints ?? 0);
        const giftPoints = existing.giftPoints + (delta.giftPoints ?? 0);
        const score = tapPoints + commentPoints + giftPoints;
        return {
          ...prev,
          [username]: {
            ...existing,
            tapPoints,
            commentPoints,
            giftPoints,
            score,
          },
        };
      });
    },
    [],
  );

  const addTapPoints = useCallback(
    (username: string) => upsert(username, { tapPoints: 1 }),
    [upsert],
  );

  const addCommentPoints = useCallback(
    (username: string) => upsert(username, { commentPoints: 5 }),
    [upsert],
  );

  // giftPoints = coinValue * 10
  const addGiftPoints = useCallback(
    (username: string, coinValue: number) =>
      upsert(username, { giftPoints: coinValue * 10 }),
    [upsert],
  );

  const getTop3 = useCallback((): EngagementEntry[] => {
    return Object.values(data)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [data]);

  return { addTapPoints, addCommentPoints, addGiftPoints, getTop3, data };
}
