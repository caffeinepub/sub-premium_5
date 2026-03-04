import { Swords } from "lucide-react";
import { motion } from "motion/react";
import type { BattleStats } from "../hooks/useLiveBattle";

interface BattleStatsCardProps {
  battleStats: BattleStats;
}

export function BattleStatsCard({ battleStats }: BattleStatsCardProps) {
  const { totalWins, mvpCount, currentStreak, totalBattles } = battleStats;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="rounded-2xl p-4"
      style={{ background: "#111", border: "1px solid #1e1e1e" }}
      data-ocid="profile.battle_stats.card"
    >
      {/* Title */}
      <div className="flex items-center gap-2 mb-4">
        <Swords className="w-4 h-4" style={{ color: "#FF2D2D" }} />
        <span className="text-white text-sm font-bold">⚔️ Battle Stats</span>
      </div>

      {/* 2x2 stat grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div
          className="px-3 py-3 rounded-xl flex flex-col gap-0.5"
          style={{ background: "#1a1a1a" }}
          data-ocid="profile.battle_wins.panel"
        >
          <span className="text-sm">🏆</span>
          <span className="text-white font-black text-xl tabular-nums">
            {totalWins}
          </span>
          <span className="text-gray-500 text-[10px]">Total Wins</span>
        </div>

        <div
          className="px-3 py-3 rounded-xl flex flex-col gap-0.5"
          style={{ background: "#1a1a1a" }}
          data-ocid="profile.battle_mvp.panel"
        >
          <span className="text-sm">⭐</span>
          <span
            className="font-black text-xl tabular-nums"
            style={{ color: mvpCount > 0 ? "#FFD700" : "white" }}
          >
            {mvpCount}
          </span>
          <span className="text-gray-500 text-[10px]">MVP Count</span>
        </div>

        <div
          className="px-3 py-3 rounded-xl flex flex-col gap-0.5"
          style={{ background: "#1a1a1a" }}
          data-ocid="profile.battle_streak.panel"
        >
          <span className="text-sm">🔥</span>
          <span
            className="font-black text-xl tabular-nums"
            style={{ color: currentStreak >= 5 ? "#FF6B6B" : "white" }}
          >
            {currentStreak}
          </span>
          <span className="text-gray-500 text-[10px]">Win Streak</span>
        </div>

        <div
          className="px-3 py-3 rounded-xl flex flex-col gap-0.5"
          style={{ background: "#1a1a1a" }}
          data-ocid="profile.battle_total.panel"
        >
          <span className="text-sm">📊</span>
          <span className="text-white font-black text-xl tabular-nums">
            {totalBattles}
          </span>
          <span className="text-gray-500 text-[10px]">Battles Played</span>
        </div>
      </div>

      {/* Badge row */}
      <div className="flex flex-wrap gap-2">
        {currentStreak >= 5 && (
          <span
            className="text-[10px] font-black px-2.5 py-1 rounded-full"
            style={{
              background: "rgba(255,45,45,0.15)",
              border: "1px solid rgba(255,45,45,0.4)",
              color: "#FF6B6B",
            }}
          >
            🔥 Hot Streak
          </span>
        )}
        {mvpCount > 50 && (
          <span
            className="text-[10px] font-black px-2.5 py-1 rounded-full"
            style={{
              background: "rgba(255,215,0,0.12)",
              border: "1px solid rgba(255,215,0,0.4)",
              color: "#FFD700",
            }}
          >
            ⭐ Elite Battler
          </span>
        )}
        {totalWins > 0 && (
          <span
            className="text-[10px] font-black px-2.5 py-1 rounded-full"
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              color: "#aaa",
            }}
          >
            🥇 Battle Winner
          </span>
        )}
      </div>
    </motion.div>
  );
}
