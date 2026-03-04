/**
 * useLiveBattle — client-side live battle state management
 * Production-level: Battle Multiplier + MVP System
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type BattleMode = "idle" | "active" | "ended";
export type BattleSide = "left" | "right";
export type BattleType = "Normal" | "Power" | "Extreme";

export interface BattleStats {
  totalWins: number;
  mvpCount: number;
  currentStreak: number;
  bestStreak: number;
  totalBattles: number;
}

export interface BattleState {
  mode: BattleMode;
  timer: number;
  timerDuration: number;
  leftScore: number;
  rightScore: number;
  leftUsername: string;
  rightUsername: string;
  winner: BattleSide | "tie" | null;
  streak: number;
  battleType: BattleType;
  multiplier: 1 | 2 | 3;
  leftTaps: number;
  rightTaps: number;
  leftComments: number;
  rightComments: number;
  leftGifts: number;
  rightGifts: number;
  leftGiftPoints: number;
  rightGiftPoints: number;
  leftSupporters: Array<{ username: string; points: number }>;
  rightSupporters: Array<{ username: string; points: number }>;
}

const BATTLE_STREAK_KEY = "battle_streak";
const BATTLE_STATS_KEY = "sp_battle_stats";

function loadStreak(): number {
  try {
    const raw = localStorage.getItem(BATTLE_STREAK_KEY);
    return raw ? Number.parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

function saveStreak(n: number) {
  try {
    localStorage.setItem(BATTLE_STREAK_KEY, n.toString());
  } catch {
    // ignore
  }
}

function loadBattleStats(): BattleStats {
  try {
    const raw = localStorage.getItem(BATTLE_STATS_KEY);
    if (raw) return JSON.parse(raw) as BattleStats;
  } catch {
    // ignore
  }
  return {
    totalWins: 0,
    mvpCount: 0,
    currentStreak: 0,
    bestStreak: 0,
    totalBattles: 0,
  };
}

function saveBattleStats(stats: BattleStats) {
  try {
    localStorage.setItem(BATTLE_STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

/** Pick a random battle type: 50% Normal, 30% Power, 20% Extreme */
function pickBattleType(): BattleType {
  const r = Math.random();
  if (r < 0.5) return "Normal";
  if (r < 0.8) return "Power";
  return "Extreme";
}

function battleTypeToMultiplier(type: BattleType): 1 | 2 | 3 {
  if (type === "Power") return 2;
  if (type === "Extreme") return 3;
  return 1;
}

interface BattleActions {
  startBattle: (
    leftUser: string,
    rightUser: string,
    durationSecs: number,
  ) => void;
  addScore: (
    side: BattleSide,
    points: number,
    source: "tap" | "comment" | "gift",
  ) => void;
  addSupporter: (side: BattleSide, username: string, points: number) => void;
  endBattle: () => void;
  resetBattle: () => void;
  recordWin: (isWinner: boolean) => void;
  battleState: BattleState;
  battleStats: BattleStats;
}

function upsertSupporter(
  list: Array<{ username: string; points: number }>,
  username: string,
  points: number,
): Array<{ username: string; points: number }> {
  const existing = list.find((s) => s.username === username);
  if (existing) {
    const updated = list.map((s) =>
      s.username === username ? { ...s, points: s.points + points } : s,
    );
    return updated.sort((a, b) => b.points - a.points);
  }
  return [...list, { username, points }].sort((a, b) => b.points - a.points);
}

export function useLiveBattle(): BattleActions {
  const [mode, setMode] = useState<BattleMode>("idle");
  const [timer, setTimer] = useState(60);
  const [timerDuration, setTimerDuration] = useState(60);
  const [leftScore, setLeftScore] = useState(0);
  const [rightScore, setRightScore] = useState(0);
  const [leftUsername, setLeftUsername] = useState("You");
  const [rightUsername, setRightUsername] = useState("Opponent");
  const [winner, setWinner] = useState<BattleSide | "tie" | null>(null);
  const [streak, setStreak] = useState(loadStreak);

  // Battle type / multiplier
  const [battleType, setBattleType] = useState<BattleType>("Normal");
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);

  // Per-side breakdowns
  const [leftTaps, setLeftTaps] = useState(0);
  const [rightTaps, setRightTaps] = useState(0);
  const [leftComments, setLeftComments] = useState(0);
  const [rightComments, setRightComments] = useState(0);
  const [leftGifts, setLeftGifts] = useState(0);
  const [rightGifts, setRightGifts] = useState(0);
  const [leftGiftPoints, setLeftGiftPoints] = useState(0);
  const [rightGiftPoints, setRightGiftPoints] = useState(0);

  // Supporters
  const [leftSupporters, setLeftSupporters] = useState<
    Array<{ username: string; points: number }>
  >([]);
  const [rightSupporters, setRightSupporters] = useState<
    Array<{ username: string; points: number }>
  >([]);

  // Battle stats
  const [battleStats, setBattleStats] = useState<BattleStats>(loadBattleStats);

  // Refs for current multiplier value (needed in callbacks)
  const multiplierRef = useRef<1 | 2 | 3>(1);

  // Timer interval ref
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Right-side simulation timeout ref
  const rightBotTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllIntervals = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (rightBotTimeoutRef.current) {
      clearTimeout(rightBotTimeoutRef.current);
      rightBotTimeoutRef.current = null;
    }
  }, []);

  const endBattle = useCallback(() => {
    clearAllIntervals();
    setMode("ended");

    setLeftScore((ls) => {
      setRightScore((rs) => {
        let w: BattleSide | "tie";
        if (ls > rs) w = "left";
        else if (rs > ls) w = "right";
        else w = "tie";
        setWinner(w);

        setStreak((prev) => {
          const newStreak = w === "left" ? prev + 1 : 0;
          saveStreak(newStreak);
          return newStreak;
        });

        return rs;
      });
      return ls;
    });
  }, [clearAllIntervals]);

  const startBattle = useCallback(
    (leftUser: string, rightUser: string, durationSecs: number) => {
      clearAllIntervals();

      const type = pickBattleType();
      const mult = battleTypeToMultiplier(type);

      setBattleType(type);
      setMultiplier(mult);
      multiplierRef.current = mult;

      setMode("active");
      setTimer(durationSecs);
      setTimerDuration(durationSecs);
      setLeftScore(0);
      setRightScore(0);
      setLeftUsername(leftUser);
      setRightUsername(rightUser);
      setWinner(null);

      // Reset breakdowns
      setLeftTaps(0);
      setRightTaps(0);
      setLeftComments(0);
      setRightComments(0);
      setLeftGifts(0);
      setRightGifts(0);
      setLeftGiftPoints(0);
      setRightGiftPoints(0);
      setLeftSupporters([]);
      setRightSupporters([]);

      // Countdown timer
      timerIntervalRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearAllIntervals();
            setMode("ended");
            setLeftScore((ls) => {
              setRightScore((rs) => {
                let w: BattleSide | "tie";
                if (ls > rs) w = "left";
                else if (rs > ls) w = "right";
                else w = "tie";
                setWinner(w);
                setStreak((prevStreak) => {
                  const newStreak = w === "left" ? prevStreak + 1 : 0;
                  saveStreak(newStreak);
                  return newStreak;
                });
                return rs;
              });
              return ls;
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Right-side realistic simulation: random taps/small gifts every 3-7 seconds
      const scheduleRightBot = () => {
        const delay = 3000 + Math.random() * 4000;
        rightBotTimeoutRef.current = setTimeout(() => {
          // Randomly pick what the right side does
          const action = Math.random();
          const m = multiplierRef.current;
          if (action < 0.6) {
            // Random taps (1-5)
            const taps = Math.floor(Math.random() * 5) + 1;
            setRightScore((prev) => prev + taps * m);
            setRightTaps((prev) => prev + taps);
          } else if (action < 0.85) {
            // Comment
            setRightScore((prev) => prev + 3 * m);
            setRightComments((prev) => prev + 1);
          } else {
            // Small gift
            const giftCoins = [10, 25, 50, 100][Math.floor(Math.random() * 4)];
            const giftPoints = giftCoins * 1 * m; // small tier = x1
            setRightScore((prev) => prev + giftPoints);
            setRightGifts((prev) => prev + 1);
            setRightGiftPoints((prev) => prev + giftPoints);
            // Add to right supporters
            const botNames = [
              "alex_v",
              "sarah_m",
              "james_k",
              "priya_d",
              "tony_r",
            ];
            const botName =
              botNames[Math.floor(Math.random() * botNames.length)];
            setRightSupporters((prev) =>
              upsertSupporter(prev, botName, giftPoints),
            );
          }
          scheduleRightBot();
        }, delay) as unknown as ReturnType<typeof setTimeout>;
      };
      scheduleRightBot();
    },
    [clearAllIntervals],
  );

  const addScore = useCallback(
    (side: BattleSide, points: number, source: "tap" | "comment" | "gift") => {
      const m = multiplierRef.current;
      const battlePoints = points * m;

      if (side === "left") {
        setLeftScore((prev) => prev + battlePoints);
        if (source === "tap") setLeftTaps((prev) => prev + 1);
        else if (source === "comment") setLeftComments((prev) => prev + 1);
        else if (source === "gift") {
          setLeftGifts((prev) => prev + 1);
          setLeftGiftPoints((prev) => prev + battlePoints);
        }
      } else {
        setRightScore((prev) => prev + battlePoints);
        if (source === "tap") setRightTaps((prev) => prev + 1);
        else if (source === "comment") setRightComments((prev) => prev + 1);
        else if (source === "gift") {
          setRightGifts((prev) => prev + 1);
          setRightGiftPoints((prev) => prev + battlePoints);
        }
      }
    },
    [],
  );

  const addSupporter = useCallback(
    (side: BattleSide, username: string, points: number) => {
      if (side === "left") {
        setLeftSupporters((prev) => upsertSupporter(prev, username, points));
      } else {
        setRightSupporters((prev) => upsertSupporter(prev, username, points));
      }
    },
    [],
  );

  const recordWin = useCallback((isWinner: boolean) => {
    setBattleStats((prev) => {
      const newStats: BattleStats = {
        totalBattles: prev.totalBattles + 1,
        totalWins: isWinner ? prev.totalWins + 1 : prev.totalWins,
        mvpCount: isWinner ? prev.mvpCount + 1 : prev.mvpCount,
        currentStreak: isWinner ? prev.currentStreak + 1 : 0,
        bestStreak: isWinner
          ? Math.max(prev.bestStreak, prev.currentStreak + 1)
          : prev.bestStreak,
      };
      saveBattleStats(newStats);
      return newStats;
    });
  }, []);

  const resetBattle = useCallback(() => {
    clearAllIntervals();
    setMode("idle");
    setTimer(60);
    setTimerDuration(60);
    setLeftScore(0);
    setRightScore(0);
    setWinner(null);
    setLeftTaps(0);
    setRightTaps(0);
    setLeftComments(0);
    setRightComments(0);
    setLeftGifts(0);
    setRightGifts(0);
    setLeftGiftPoints(0);
    setRightGiftPoints(0);
    setLeftSupporters([]);
    setRightSupporters([]);
  }, [clearAllIntervals]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllIntervals();
    };
  }, [clearAllIntervals]);

  // Keep multiplierRef in sync
  useEffect(() => {
    multiplierRef.current = multiplier;
  }, [multiplier]);

  const battleState: BattleState = {
    mode,
    timer,
    timerDuration,
    leftScore,
    rightScore,
    leftUsername,
    rightUsername,
    winner,
    streak,
    battleType,
    multiplier,
    leftTaps,
    rightTaps,
    leftComments,
    rightComments,
    leftGifts,
    rightGifts,
    leftGiftPoints,
    rightGiftPoints,
    leftSupporters,
    rightSupporters,
  };

  return {
    startBattle,
    addScore,
    addSupporter,
    endBattle,
    resetBattle,
    recordWin,
    battleState,
    battleStats,
  };
}
