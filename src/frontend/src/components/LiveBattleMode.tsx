import { RefreshCw, Trophy, X } from "lucide-react";
import { motion } from "motion/react";
import type { BattleState } from "../hooks/useLiveBattle";
import { ConfettiBurst } from "./ConfettiBurst";

interface LiveBattleModeProps {
  battleState: BattleState;
  onRematch: () => void;
  onEnd: () => void;
}

export function LiveBattleMode({
  battleState,
  onRematch,
  onEnd,
}: LiveBattleModeProps) {
  const {
    leftScore,
    rightScore,
    leftUsername,
    rightUsername,
    winner,
    timerDuration,
  } = battleState;

  const leftIsWinner = winner === "left";
  const rightIsWinner = winner === "right";
  const isTie = winner === "tie";

  const mvp = leftScore >= rightScore ? leftUsername : rightUsername;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-5"
      style={{ background: "rgba(0,0,0,0.92)" }}
      data-ocid="battle_result.modal"
    >
      <ConfettiBurst active={!isTie} />

      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 16, stiffness: 200 }}
        className="w-full max-w-sm"
      >
        {/* Title */}
        <div className="text-center mb-6">
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-5xl mb-2"
          >
            {isTie ? "🤝" : "🏆"}
          </motion.div>
          <h2 className="text-white font-black text-2xl">
            {isTie ? "It's a Tie!" : "Battle Over!"}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {Math.floor(timerDuration / 60)} min battle completed
          </p>
        </div>

        {/* Score cards */}
        <div className="flex gap-3 mb-5">
          {/* Left card */}
          <motion.div
            animate={leftIsWinner ? { scale: 1.05 } : { opacity: 0.55 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex-1 p-4 rounded-2xl flex flex-col items-center gap-2"
            style={{
              background: leftIsWinner
                ? "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,107,0,0.1))"
                : "#111",
              border: `1.5px solid ${leftIsWinner ? "#FFD700" : "#1e1e1e"}`,
              boxShadow: leftIsWinner
                ? "0 0 24px rgba(255,215,0,0.25)"
                : "none",
            }}
          >
            {leftIsWinner && (
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 10, delay: 0.4 }}
                className="text-2xl"
              >
                👑
              </motion.div>
            )}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: leftIsWinner
                  ? "linear-gradient(135deg, #FFD700, #FF6B00)"
                  : "linear-gradient(135deg, #FF2D2D, #FF6B6B)",
              }}
            >
              <span className="text-white font-black text-lg">
                {leftUsername[0]?.toUpperCase()}
              </span>
            </div>
            <span className="text-white text-xs font-semibold">
              @{leftUsername}
            </span>
            <span
              className="text-2xl font-black tabular-nums"
              style={{ color: leftIsWinner ? "#FFD700" : "#fff" }}
            >
              {leftScore.toLocaleString()}
            </span>
            {leftIsWinner && (
              <span
                className="text-xs font-black px-2 py-0.5 rounded-full"
                style={{ background: "#FFD700", color: "#000" }}
              >
                WINNER
              </span>
            )}
            {!leftIsWinner && !isTie && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: "#1a1a1a", color: "#888" }}
              >
                🥈 Runner-up
              </span>
            )}
          </motion.div>

          {/* Right card */}
          <motion.div
            animate={rightIsWinner ? { scale: 1.05 } : { opacity: 0.55 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex-1 p-4 rounded-2xl flex flex-col items-center gap-2"
            style={{
              background: rightIsWinner
                ? "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,107,0,0.1))"
                : "#111",
              border: `1.5px solid ${rightIsWinner ? "#FFD700" : "#1e1e1e"}`,
              boxShadow: rightIsWinner
                ? "0 0 24px rgba(255,215,0,0.25)"
                : "none",
            }}
          >
            {rightIsWinner && (
              <motion.div
                initial={{ scale: 0, rotate: 30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 10, delay: 0.4 }}
                className="text-2xl"
              >
                👑
              </motion.div>
            )}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: rightIsWinner
                  ? "linear-gradient(135deg, #FFD700, #FF6B00)"
                  : "linear-gradient(135deg, #7B2FFF, #4FACFE)",
              }}
            >
              <span className="text-white font-black text-lg">
                {rightUsername[0]?.toUpperCase()}
              </span>
            </div>
            <span className="text-white text-xs font-semibold">
              @{rightUsername}
            </span>
            <span
              className="text-2xl font-black tabular-nums"
              style={{ color: rightIsWinner ? "#FFD700" : "#fff" }}
            >
              {rightScore.toLocaleString()}
            </span>
            {rightIsWinner && (
              <span
                className="text-xs font-black px-2 py-0.5 rounded-full"
                style={{ background: "#FFD700", color: "#000" }}
              >
                WINNER
              </span>
            )}
            {!rightIsWinner && !isTie && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: "#1a1a1a", color: "#888" }}
              >
                🥈 Runner-up
              </span>
            )}
          </motion.div>
        </div>

        {/* Stats row */}
        <div
          className="flex justify-around px-4 py-3 rounded-2xl mb-5"
          style={{ background: "#111", border: "1px solid #1e1e1e" }}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-gray-500 text-[10px] font-semibold uppercase">
              Total Taps
            </span>
            <span className="text-white font-bold text-sm">
              {(leftScore + rightScore).toLocaleString()}
            </span>
          </div>
          <div
            className="w-px self-stretch"
            style={{ background: "#2a2a2a" }}
          />
          <div className="flex flex-col items-center gap-1">
            <span className="text-gray-500 text-[10px] font-semibold uppercase">
              Total Gifts
            </span>
            <span className="text-white font-bold text-sm">—</span>
          </div>
          <div
            className="w-px self-stretch"
            style={{ background: "#2a2a2a" }}
          />
          <div className="flex flex-col items-center gap-1">
            <span className="text-gray-500 text-[10px] font-semibold uppercase">
              MVP
            </span>
            <div className="flex items-center gap-1">
              <Trophy className="w-3 h-3 text-yellow-400" />
              <span className="text-yellow-400 font-bold text-sm">@{mvp}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onRematch}
            className="flex-1 h-12 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #FF2D2D, #FF6B6B)",
              boxShadow: "0 0 20px rgba(255,45,45,0.4)",
            }}
            data-ocid="battle_result.rematch.button"
          >
            <RefreshCw className="w-4 h-4" />
            Rematch
          </button>
          <button
            type="button"
            onClick={onEnd}
            className="flex-1 h-12 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2"
            style={{
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
            }}
            data-ocid="battle_result.end.button"
          >
            <X className="w-4 h-4 text-gray-400" />
            End Battle
          </button>
        </div>
      </motion.div>
    </div>
  );
}
