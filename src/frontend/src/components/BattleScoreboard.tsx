import { Swords } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { BattleState } from "../hooks/useLiveBattle";

interface BattleScoreboardProps {
  battleState: BattleState;
  onEnd: () => void;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function AnimatedScore({ score }: { score: number }) {
  const prevRef = useRef(score);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (score !== prevRef.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 300);
      prevRef.current = score;
      return () => clearTimeout(t);
    }
  }, [score]);

  return (
    <motion.span
      animate={bump ? { scale: [1, 1.35, 1] } : {}}
      transition={{ duration: 0.25 }}
      className="font-black text-xl text-white tabular-nums"
    >
      {score.toLocaleString()}
    </motion.span>
  );
}

export function BattleScoreboard({
  battleState,
  onEnd,
}: BattleScoreboardProps) {
  const {
    mode,
    timer,
    timerDuration,
    leftScore,
    rightScore,
    leftUsername,
    rightUsername,
    winner,
  } = battleState;

  const isEnded = mode === "ended";
  const totalScore = leftScore + rightScore || 1;
  const leftPct = Math.round((leftScore / totalScore) * 100);
  const rightPct = 100 - leftPct;

  const isLowTime = timer <= 10 && mode === "active";
  const progress = timerDuration > 0 ? (timer / timerDuration) * 100 : 0;

  if (mode === "idle") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full px-3 py-2 z-30"
      style={{
        background: "rgba(0,0,0,0.88)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
      data-ocid="battle.scoreboard.panel"
    >
      {/* Battle badge */}
      <div className="flex items-center justify-center gap-1.5 mb-1.5">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
          className="flex items-center gap-1.5 px-3 py-0.5 rounded-full"
          style={{
            background: "#FF2D2D",
            boxShadow: "0 0 12px rgba(255,45,45,0.5)",
          }}
        >
          <Swords className="w-3 h-3 text-white" />
          <span className="text-white text-[11px] font-black tracking-widest">
            BATTLE
          </span>
        </motion.div>
      </div>

      <div className="flex items-center gap-2">
        {/* Left side */}
        <div
          className="flex-1 flex flex-col items-start gap-1"
          style={{ opacity: isEnded && winner === "right" ? 0.5 : 1 }}
          data-ocid="battle.left_score.panel"
        >
          <div className="flex items-center gap-1.5 w-full">
            {isEnded && winner === "left" && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 10 }}
                className="text-yellow-400 text-sm"
              >
                👑
              </motion.span>
            )}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #FF2D2D, #FF6B6B)",
              }}
            >
              <span className="text-white text-xs font-black">
                {leftUsername[0]?.toUpperCase()}
              </span>
            </div>
            <span className="text-white text-xs font-semibold truncate">
              @{leftUsername}
            </span>
          </div>
          <AnimatedScore score={leftScore} />

          {/* Left progress bar */}
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: "#1a1a1a" }}
          >
            <motion.div
              className="h-full rounded-full"
              animate={{ width: `${leftPct}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{
                background:
                  winner === "left"
                    ? "linear-gradient(90deg, #FFD700, #FF6B00)"
                    : "linear-gradient(90deg, #FF2D2D, #FF6B6B)",
                boxShadow:
                  leftScore > rightScore
                    ? "0 0 8px rgba(255,45,45,0.6)"
                    : "none",
              }}
            />
          </div>
          {/* Top supporter stub */}
          <span className="text-[9px] text-gray-600">🏆 luna_s</span>
        </div>

        {/* Center: timer */}
        <div
          className="flex flex-col items-center gap-1 flex-shrink-0"
          data-ocid="battle.timer.panel"
        >
          <motion.span
            animate={isLowTime ? { color: ["#FF2D2D", "#fff", "#FF2D2D"] } : {}}
            transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY }}
            className="font-black text-2xl tabular-nums"
            style={{ color: isEnded ? "#888" : isLowTime ? "#FF2D2D" : "#fff" }}
          >
            {isEnded ? "END" : formatTime(timer)}
          </motion.span>

          {/* Timer progress ring */}
          {!isEnded && (
            <svg width="32" height="4" aria-hidden="true">
              <rect x="0" y="0" width="32" height="4" rx="2" fill="#1a1a1a" />
              <rect
                x="0"
                y="0"
                width={`${progress * 0.32}`}
                height="4"
                rx="2"
                fill={isLowTime ? "#FF2D2D" : "#888"}
                style={{ transition: "width 0.5s linear" }}
              />
            </svg>
          )}

          {isEnded && (
            <button
              type="button"
              onClick={onEnd}
              className="text-[10px] text-white/50 hover:text-white transition-colors"
              data-ocid="battle.end.button"
            >
              Results →
            </button>
          )}
        </div>

        {/* Right side */}
        <div
          className="flex-1 flex flex-col items-end gap-1"
          style={{ opacity: isEnded && winner === "left" ? 0.5 : 1 }}
          data-ocid="battle.right_score.panel"
        >
          <div className="flex items-center gap-1.5 w-full justify-end">
            <span className="text-white text-xs font-semibold truncate">
              @{rightUsername}
            </span>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #7B2FFF, #4FACFE)",
              }}
            >
              <span className="text-white text-xs font-black">
                {rightUsername[0]?.toUpperCase()}
              </span>
            </div>
            {isEnded && winner === "right" && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 10 }}
                className="text-yellow-400 text-sm"
              >
                👑
              </motion.span>
            )}
          </div>
          <AnimatedScore score={rightScore} />

          {/* Right progress bar */}
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: "#1a1a1a" }}
          >
            <div className="flex justify-end h-full">
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${rightPct}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                style={{
                  background:
                    winner === "right"
                      ? "linear-gradient(90deg, #FFD700, #FF6B00)"
                      : "linear-gradient(90deg, #4FACFE, #7B2FFF)",
                  boxShadow:
                    rightScore > leftScore
                      ? "0 0 8px rgba(79,172,254,0.6)"
                      : "none",
                }}
              />
            </div>
          </div>
          <span className="text-[9px] text-gray-600">🏆 alex_v</span>
        </div>
      </div>
    </motion.div>
  );
}

export function BattleScoreboardWrapper({
  battleState,
  onEnd,
}: BattleScoreboardProps) {
  return (
    <AnimatePresence>
      {battleState.mode !== "idle" && (
        <BattleScoreboard battleState={battleState} onEnd={onEnd} />
      )}
    </AnimatePresence>
  );
}
