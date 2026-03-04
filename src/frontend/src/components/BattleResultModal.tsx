import { RefreshCw, Share2, X } from "lucide-react";
import { motion } from "motion/react";
import { useCallback } from "react";
import { toast } from "sonner";
import type { BattleState, BattleStats } from "../hooks/useLiveBattle";
import { BattleMultiplierBadge } from "./BattleMultiplierBadge";
import { ConfettiBurst } from "./ConfettiBurst";

interface BattleResultModalProps {
  battleState: BattleState;
  battleStats: BattleStats;
  onRematch: () => void;
  onEnd: () => void;
}

const RANK_ICONS = ["🥇", "🥈", "🥉"];

function SupporterRow({
  rank,
  username,
  points,
}: {
  rank: number;
  username: string;
  points: number;
}) {
  return (
    <div
      className="flex items-center justify-between py-1.5 px-2 rounded-xl"
      style={{ background: "#1a1a1a" }}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">{RANK_ICONS[rank] ?? `#${rank + 1}`}</span>
        <span className="text-white text-xs font-medium truncate max-w-[80px]">
          @{username}
        </span>
      </div>
      <span className="text-yellow-400 text-[10px] font-bold">
        {points.toLocaleString()} pts
      </span>
    </div>
  );
}

export function BattleResultModal({
  battleState,
  battleStats,
  onRematch,
  onEnd,
}: BattleResultModalProps) {
  const {
    leftScore,
    rightScore,
    leftUsername,
    rightUsername,
    winner,
    timerDuration,
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
  } = battleState;

  const isTie = winner === "tie";
  const leftIsWinner = winner === "left";
  const rightIsWinner = winner === "right";
  const winnerUsername = leftIsWinner
    ? leftUsername
    : rightIsWinner
      ? rightUsername
      : null;

  const leftTop3 = leftSupporters.slice(0, 3);
  const rightTop3 = rightSupporters.slice(0, 3);

  const handleShare = useCallback(async () => {
    const resultText = isTie
      ? `🤝 Battle Tie on SUB PREMIUM!\n${leftUsername}: ${leftScore.toLocaleString()} pts vs ${rightUsername}: ${rightScore.toLocaleString()} pts\nBattle Type: ${battleType} x${multiplier}`
      : `🏆 ${winnerUsername} won the Battle on SUB PREMIUM!\nScore: ${Math.max(leftScore, rightScore).toLocaleString()} pts\nBattle Type: ${battleType} x${multiplier}\n#SUBPremium #BattleWinner`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "SUB PREMIUM Battle Result",
          text: resultText,
        });
      } catch {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(resultText);
        toast.success("Result copied!", {
          style: {
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            color: "#fff",
          },
        });
      } catch {
        toast.error("Could not copy result");
      }
    }
  }, [
    isTie,
    leftUsername,
    leftScore,
    rightUsername,
    rightScore,
    battleType,
    multiplier,
    winnerUsername,
  ]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.95)" }}
      data-ocid="battle_result.modal"
    >
      <ConfettiBurst active={!isTie} />

      <div className="min-h-full flex flex-col items-center justify-start px-4 py-6 pb-28">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 16, stiffness: 200 }}
          className="w-full max-w-sm flex flex-col gap-4"
        >
          {/* ── WINNER SECTION ── */}
          <div className="text-center">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-5xl mb-2"
            >
              {isTie ? "🤝" : "👑"}
            </motion.div>
            {isTie ? (
              <>
                <h2 className="text-white font-black text-2xl">It's a Tie!</h2>
                <p className="text-gray-500 text-sm mt-1">
                  {Math.floor(timerDuration / 60)} min battle completed
                </p>
              </>
            ) : (
              <>
                {/* Gold glow winner card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", damping: 12, delay: 0.2 }}
                  className="inline-flex flex-col items-center gap-2 px-6 py-4 rounded-3xl mb-1"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,107,0,0.1))",
                    border: "1.5px solid #FFD700",
                    boxShadow: "0 0 32px rgba(255,215,0,0.25)",
                  }}
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white"
                    style={{
                      background: "linear-gradient(135deg, #FFD700, #FF6B00)",
                    }}
                  >
                    {winnerUsername?.[0]?.toUpperCase()}
                  </div>
                  <p className="text-white font-bold text-base">
                    @{winnerUsername}
                  </p>
                  <p
                    className="font-black text-2xl tabular-nums"
                    style={{ color: "#FFD700" }}
                  >
                    {Math.max(leftScore, rightScore).toLocaleString()} pts
                  </p>
                  <span
                    className="text-xs font-black px-3 py-1 rounded-full"
                    style={{ background: "#FFD700", color: "#000" }}
                  >
                    🥇 MVP
                  </span>
                </motion.div>
                <p className="text-gray-500 text-sm">
                  {Math.floor(timerDuration / 60)} min battle completed
                </p>
              </>
            )}
          </div>

          {/* ── MULTIPLIER BADGE ── */}
          <div className="flex flex-col items-center gap-1">
            <p className="text-gray-600 text-[10px] font-semibold uppercase tracking-wider">
              Battle Type
            </p>
            <BattleMultiplierBadge
              battleType={battleType}
              multiplier={multiplier}
            />
          </div>

          {/* ── SCORE BREAKDOWN TABLE ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: "#111", border: "1px solid #1e1e1e" }}
            data-ocid="battle_result.breakdown.panel"
          >
            {/* Header row */}
            <div
              className="grid grid-cols-3 px-4 py-2.5"
              style={{ background: "#1a1a1a", borderBottom: "1px solid #222" }}
            >
              <span className="text-[11px] font-bold text-gray-400">Stat</span>
              <span
                className="text-[11px] font-bold text-center"
                style={{ color: leftIsWinner ? "#FFD700" : "#FF6B6B" }}
              >
                @{leftUsername}
              </span>
              <span
                className="text-[11px] font-bold text-right"
                style={{ color: rightIsWinner ? "#FFD700" : "#4FACFE" }}
              >
                @{rightUsername}
              </span>
            </div>

            {[
              {
                label: "Taps",
                left: leftTaps.toLocaleString(),
                right: rightTaps.toLocaleString(),
              },
              {
                label: "Comments",
                left: leftComments.toLocaleString(),
                right: rightComments.toLocaleString(),
              },
              {
                label: "Gifts",
                left: leftGifts.toLocaleString(),
                right: rightGifts.toLocaleString(),
              },
              {
                label: "Gift Pts",
                left: leftGiftPoints.toLocaleString(),
                right: rightGiftPoints.toLocaleString(),
              },
            ].map((row, i) => (
              <div
                key={row.label}
                className="grid grid-cols-3 px-4 py-2"
                style={{
                  borderBottom: i < 3 ? "1px solid #1a1a1a" : "none",
                }}
              >
                <span className="text-[11px] text-gray-500">{row.label}</span>
                <span className="text-[11px] text-white text-center tabular-nums">
                  {row.left}
                </span>
                <span className="text-[11px] text-white text-right tabular-nums">
                  {row.right}
                </span>
              </div>
            ))}

            {/* Total row */}
            <div
              className="grid grid-cols-3 px-4 py-3"
              style={{ background: "#161616", borderTop: "1px solid #222" }}
            >
              <span className="text-[11px] font-black text-white">TOTAL</span>
              <span
                className="text-[12px] font-black text-center tabular-nums"
                style={{ color: leftIsWinner ? "#FFD700" : "#fff" }}
              >
                {leftScore.toLocaleString()}
              </span>
              <span
                className="text-[12px] font-black text-right tabular-nums"
                style={{ color: rightIsWinner ? "#FFD700" : "#fff" }}
              >
                {rightScore.toLocaleString()}
              </span>
            </div>
          </motion.div>

          {/* ── TOP 3 SUPPORTERS ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            data-ocid="battle_result.supporters.panel"
          >
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">
              Top Supporters
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* Left supporters */}
              <div>
                <p
                  className="text-[10px] font-semibold mb-1.5"
                  style={{ color: "#FF6B6B" }}
                >
                  @{leftUsername}
                </p>
                <div className="flex flex-col gap-1">
                  {leftTop3.length > 0 ? (
                    leftTop3.map((s, i) => (
                      <SupporterRow
                        key={s.username}
                        rank={i}
                        username={s.username}
                        points={s.points}
                      />
                    ))
                  ) : (
                    <p className="text-gray-600 text-[10px] italic px-2">
                      No supporters yet
                    </p>
                  )}
                </div>
              </div>

              {/* Right supporters */}
              <div>
                <p
                  className="text-[10px] font-semibold mb-1.5"
                  style={{ color: "#4FACFE" }}
                >
                  @{rightUsername}
                </p>
                <div className="flex flex-col gap-1">
                  {rightTop3.length > 0 ? (
                    rightTop3.map((s, i) => (
                      <SupporterRow
                        key={s.username}
                        rank={i}
                        username={s.username}
                        points={s.points}
                      />
                    ))
                  ) : (
                    <p className="text-gray-600 text-[10px] italic px-2">
                      No supporters yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── BATTLE STATS CARD ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="rounded-2xl p-4"
            style={{ background: "#111", border: "1px solid #1e1e1e" }}
            data-ocid="battle_result.stats.panel"
          >
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-3">
              Your Battle Stats
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  icon: "🏆",
                  label: "Total Wins",
                  value: battleStats.totalWins,
                },
                { icon: "⭐", label: "MVP Count", value: battleStats.mvpCount },
                {
                  icon: "🔥",
                  label: "Win Streak",
                  value: battleStats.currentStreak,
                },
                {
                  icon: "📊",
                  label: "Total Battles",
                  value: battleStats.totalBattles,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="px-3 py-2.5 rounded-xl flex flex-col gap-0.5"
                  style={{ background: "#1a1a1a" }}
                >
                  <span className="text-sm">{stat.icon}</span>
                  <span className="text-white font-black text-lg tabular-nums">
                    {stat.value}
                  </span>
                  <span className="text-gray-500 text-[10px]">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Earned badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              {!isTie && winner === "left" && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 10, delay: 0.6 }}
                  className="text-[10px] font-black px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(255,215,0,0.15)",
                    border: "1px solid #FFD700",
                    color: "#FFD700",
                    boxShadow: "0 0 8px rgba(255,215,0,0.3)",
                  }}
                >
                  🥇 MVP Badge Earned!
                </motion.span>
              )}
              {battleStats.currentStreak >= 5 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 10, delay: 0.7 }}
                  className="text-[10px] font-black px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(255,45,45,0.15)",
                    border: "1px solid #FF2D2D",
                    color: "#FF6B6B",
                    boxShadow: "0 0 8px rgba(255,45,45,0.3)",
                  }}
                >
                  🔥 Hot Streak Earned!
                </motion.span>
              )}
              {battleStats.mvpCount > 50 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 10, delay: 0.8 }}
                  className="text-[10px] font-black px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(255,215,0,0.12)",
                    border: "1px solid rgba(255,215,0,0.5)",
                    color: "#FFD700",
                    boxShadow: "0 0 8px rgba(255,215,0,0.2)",
                  }}
                >
                  ⭐ Elite Battler
                </motion.span>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* ── STICKY BOTTOM ACTIONS ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-10 px-4 py-4 flex gap-2"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.98) 70%, transparent)",
        }}
        data-ocid="battle_result.actions.panel"
      >
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
          onClick={() => void handleShare()}
          className="h-12 px-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2"
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          data-ocid="battle_result.share.button"
        >
          <Share2 className="w-4 h-4 text-gray-400" />
          Share
        </button>
        <button
          type="button"
          onClick={onEnd}
          className="h-12 w-12 rounded-2xl flex items-center justify-center"
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          data-ocid="battle_result.end.button"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>
  );
}
