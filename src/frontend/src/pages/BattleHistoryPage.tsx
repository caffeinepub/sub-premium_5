import { ArrowLeft, RefreshCw, Trophy } from "lucide-react";
import { motion } from "motion/react";

interface BattleHistoryPageProps {
  onBack: () => void;
}

const MOCK_BATTLE_HISTORY = [
  {
    id: 1,
    opponent: "luna_s",
    myScore: 12450,
    theirScore: 8930,
    won: true,
    date: "Mar 3, 2026",
    duration: "5 min",
  },
  {
    id: 2,
    opponent: "alex_v",
    myScore: 7280,
    theirScore: 9150,
    won: false,
    date: "Mar 2, 2026",
    duration: "3 min",
  },
  {
    id: 3,
    opponent: "priya_d",
    myScore: 15600,
    theirScore: 11200,
    won: true,
    date: "Mar 1, 2026",
    duration: "5 min",
  },
  {
    id: 4,
    opponent: "max_c",
    myScore: 6800,
    theirScore: 4200,
    won: true,
    date: "Feb 29, 2026",
    duration: "1 min",
  },
  {
    id: 5,
    opponent: "sarah_m",
    myScore: 4100,
    theirScore: 7800,
    won: false,
    date: "Feb 28, 2026",
    duration: "3 min",
  },
  {
    id: 6,
    opponent: "james_k",
    myScore: 22000,
    theirScore: 18500,
    won: true,
    date: "Feb 27, 2026",
    duration: "5 min",
  },
  {
    id: 7,
    opponent: "tony_r",
    myScore: 9300,
    theirScore: 11600,
    won: false,
    date: "Feb 26, 2026",
    duration: "3 min",
  },
  {
    id: 8,
    opponent: "belle_w",
    myScore: 8750,
    theirScore: 6200,
    won: true,
    date: "Feb 25, 2026",
    duration: "1 min",
  },
  {
    id: 9,
    opponent: "carlos_g",
    myScore: 14200,
    theirScore: 12800,
    won: true,
    date: "Feb 24, 2026",
    duration: "5 min",
  },
  {
    id: 10,
    opponent: "yuki_t",
    myScore: 5400,
    theirScore: 7100,
    won: false,
    date: "Feb 23, 2026",
    duration: "3 min",
  },
] as const;

function loadStreak(): number {
  try {
    const raw = localStorage.getItem("battle_streak");
    return raw ? Number.parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export default function BattleHistoryPage({ onBack }: BattleHistoryPageProps) {
  const totalBattles = MOCK_BATTLE_HISTORY.length;
  const wins = MOCK_BATTLE_HISTORY.filter((b) => b.won).length;
  const losses = totalBattles - wins;
  const winRate = Math.round((wins / totalBattles) * 100);
  const currentStreak = loadStreak();

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: "#0f0f0f" }}
      data-ocid="battle_history.page"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "#1a1a1a" }}
          data-ocid="battle_history.back.button"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h1 className="text-white font-black text-xl">Battle History</h1>
          <p className="text-gray-600 text-xs">Your past live battles</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {/* Summary stats */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-4 gap-2 mb-5"
        >
          {[
            { label: "Battles", value: totalBattles, color: "#fff" },
            { label: "Wins", value: wins, color: "#4ade80" },
            { label: "Win Rate", value: `${winRate}%`, color: "#FFD700" },
            {
              label: "Streak 🔥",
              value: currentStreak,
              color: "#FF6B6B",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-3 rounded-2xl flex flex-col items-center gap-1"
              style={{ background: "#111", border: "1px solid #1e1e1e" }}
            >
              <span
                className="text-xl font-black tabular-nums"
                style={{ color: stat.color }}
              >
                {stat.value}
              </span>
              <span className="text-gray-500 text-[9px] font-medium text-center">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Win/Loss bar */}
        <div
          className="flex h-2 rounded-full overflow-hidden mb-5"
          style={{ background: "#1a1a1a" }}
        >
          <div
            className="h-full"
            style={{
              width: `${winRate}%`,
              background: "linear-gradient(90deg, #4ade80, #22c55e)",
              transition: "width 0.8s ease",
            }}
          />
          <div className="h-full flex-1" style={{ background: "#FF2D2D44" }} />
        </div>
        <div className="flex justify-between text-[10px] mb-5">
          <span className="text-green-400 font-semibold">{wins} W</span>
          <span className="text-red-400 font-semibold">{losses} L</span>
        </div>

        {/* Battle list */}
        <div className="flex flex-col gap-3">
          {MOCK_BATTLE_HISTORY.map((battle, idx) => (
            <motion.div
              key={battle.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
              style={{
                background: "#111",
                border: `1px solid ${battle.won ? "rgba(74,222,128,0.15)" : "rgba(255,45,45,0.12)"}`,
              }}
              data-ocid={`battle_history.item.${idx + 1}`}
            >
              {/* W/L badge */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: battle.won
                    ? "rgba(74,222,128,0.15)"
                    : "rgba(255,45,45,0.15)",
                }}
              >
                <span
                  className="text-xs font-black"
                  style={{ color: battle.won ? "#4ade80" : "#FF2D2D" }}
                >
                  {battle.won ? "W" : "L"}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-white text-sm font-semibold">
                    vs @{battle.opponent}
                  </span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{
                      background: battle.won
                        ? "rgba(74,222,128,0.1)"
                        : "rgba(255,45,45,0.1)",
                      color: battle.won ? "#4ade80" : "#FF2D2D",
                    }}
                  >
                    {battle.duration}
                  </span>
                </div>
                <p className="text-gray-600 text-xs">
                  {battle.date} · Score {battle.myScore.toLocaleString()} —{" "}
                  {battle.theirScore.toLocaleString()}
                </p>
              </div>

              {/* Trophy or replay */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {battle.won && <Trophy className="w-4 h-4 text-yellow-400" />}
                <button
                  type="button"
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "#1a1a1a" }}
                  title="Watch replay"
                >
                  <RefreshCw className="w-3 h-3 text-gray-500" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
