/**
 * useLiveBattle — client-side live battle state management
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type BattleMode = "idle" | "active" | "ended";
export type BattleSide = "left" | "right";

export interface BattleState {
  mode: BattleMode;
  timer: number; // seconds remaining
  timerDuration: number; // 60 | 180 | 300
  leftScore: number;
  rightScore: number;
  leftUsername: string;
  rightUsername: string;
  winner: BattleSide | "tie" | null;
  streak: number;
}

const BATTLE_STREAK_KEY = "battle_streak";

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

interface BattleActions {
  startBattle: (
    leftUser: string,
    rightUser: string,
    durationSecs: number,
  ) => void;
  addScore: (side: BattleSide, points: number) => void;
  endBattle: () => void;
  resetBattle: () => void;
  battleState: BattleState;
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

  // Track last combo time for left side (real user)
  const lastLeftScoreRef = useRef(leftScore);
  const leftScoreTimestampsRef = useRef<number[]>([]);

  // Timer interval ref
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Right side bot simulation ref
  const rightBotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const clearAllIntervals = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (rightBotIntervalRef.current) {
      clearInterval(rightBotIntervalRef.current);
      rightBotIntervalRef.current = null;
    }
  }, []);

  const endBattle = useCallback(() => {
    clearAllIntervals();
    setMode("ended");

    // Determine winner using functional updates for latest values
    setLeftScore((ls) => {
      setRightScore((rs) => {
        let w: BattleSide | "tie";
        if (ls > rs) w = "left";
        else if (rs > ls) w = "right";
        else w = "tie";
        setWinner(w);

        // Update streak
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
      setMode("active");
      setTimer(durationSecs);
      setTimerDuration(durationSecs);
      setLeftScore(0);
      setRightScore(0);
      setLeftUsername(leftUser);
      setRightUsername(rightUser);
      setWinner(null);
      leftScoreTimestampsRef.current = [];
      lastLeftScoreRef.current = 0;

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

      // Right-side bot: random score increments every 2-4 seconds
      const scheduleRightBot = () => {
        const delay = 2000 + Math.random() * 2000;
        rightBotIntervalRef.current = setTimeout(() => {
          setRightScore((prev) => prev + Math.floor(Math.random() * 5) + 1);
          scheduleRightBot();
        }, delay) as unknown as ReturnType<typeof setInterval>;
      };
      scheduleRightBot();
    },
    [clearAllIntervals],
  );

  const addScore = useCallback((side: BattleSide, points: number) => {
    if (side === "left") {
      const now = Date.now();
      leftScoreTimestampsRef.current = leftScoreTimestampsRef.current
        .filter((t) => now - t < 1000)
        .concat(now);
      setLeftScore((prev) => prev + points);
    } else {
      setRightScore((prev) => prev + points);
    }
  }, []);

  const resetBattle = useCallback(() => {
    clearAllIntervals();
    setMode("idle");
    setTimer(60);
    setTimerDuration(60);
    setLeftScore(0);
    setRightScore(0);
    setWinner(null);
    leftScoreTimestampsRef.current = [];
  }, [clearAllIntervals]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllIntervals();
    };
  }, [clearAllIntervals]);

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
  };

  return { startBattle, addScore, endBattle, resetBattle, battleState };
}
