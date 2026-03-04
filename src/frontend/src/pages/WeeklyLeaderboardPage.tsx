import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

interface WeeklyLeaderboardPageProps {
  onBack: () => void;
}

type LbTab = "battles" | "engagement" | "gifts";

// Deterministic mock data (no random — won't reshuffle on re-render)
const LEADERBOARD_DATA = {
  battles: [
    { rank: 1, name: "luna_s", score: 48, label: "wins" },
    { rank: 2, name: "alex_v", score: 41, label: "wins" },
    { rank: 3, name: "priya_d", score: 37, label: "wins" },
    { rank: 4, name: "james_k", score: 34, label: "wins" },
    { rank: 5, name: "sarah_m", score: 29, label: "wins" },
    { rank: 6, name: "max_c", score: 26, label: "wins" },
    { rank: 7, name: "carlos_g", score: 22, label: "wins" },
    { rank: 8, name: "yuki_t", score: 19, label: "wins" },
    { rank: 9, name: "tony_r", score: 17, label: "wins" },
    { rank: 10, name: "belle_w", score: 15, label: "wins" },
    { rank: 11, name: "mike_f", score: 13, label: "wins" },
    { rank: 12, name: "anna_k", score: 11, label: "wins" },
    { rank: 13, name: "leo_b", score: 9, label: "wins" },
    { rank: 14, name: "sara_p", score: 8, label: "wins" },
    { rank: 15, name: "kai_w", score: 7, label: "wins" },
    { rank: 16, name: "mia_r", score: 6, label: "wins" },
    { rank: 17, name: "ethan_j", score: 5, label: "wins" },
    { rank: 18, name: "zoe_l", score: 4, label: "wins" },
    { rank: 19, name: "noah_c", score: 3, label: "wins" },
    { rank: 20, name: "ella_d", score: 2, label: "wins" },
  ],
  engagement: [
    { rank: 1, name: "alex_v", score: 98450, label: "pts" },
    { rank: 2, name: "luna_s", score: 87320, label: "pts" },
    { rank: 3, name: "james_k", score: 76800, label: "pts" },
    { rank: 4, name: "sarah_m", score: 65400, label: "pts" },
    { rank: 5, name: "priya_d", score: 59200, label: "pts" },
    { rank: 6, name: "yuki_t", score: 48700, label: "pts" },
    { rank: 7, name: "belle_w", score: 42100, label: "pts" },
    { rank: 8, name: "carlos_g", score: 38600, label: "pts" },
    { rank: 9, name: "tony_r", score: 33200, label: "pts" },
    { rank: 10, name: "max_c", score: 29800, label: "pts" },
    { rank: 11, name: "mike_f", score: 25400, label: "pts" },
    { rank: 12, name: "anna_k", score: 22100, label: "pts" },
    { rank: 13, name: "leo_b", score: 18700, label: "pts" },
    { rank: 14, name: "sara_p", score: 15300, label: "pts" },
    { rank: 15, name: "kai_w", score: 12800, label: "pts" },
    { rank: 16, name: "mia_r", score: 10500, label: "pts" },
    { rank: 17, name: "ethan_j", score: 8900, label: "pts" },
    { rank: 18, name: "zoe_l", score: 7200, label: "pts" },
    { rank: 19, name: "noah_c", score: 5600, label: "pts" },
    { rank: 20, name: "ella_d", score: 3800, label: "pts" },
  ],
  gifts: [
    { rank: 1, name: "carlos_g", score: 285000, label: "coins" },
    { rank: 2, name: "belle_w", score: 241000, label: "coins" },
    { rank: 3, name: "tony_r", score: 198500, label: "coins" },
    { rank: 4, name: "yuki_t", score: 165200, label: "coins" },
    { rank: 5, name: "max_c", score: 142800, label: "coins" },
    { rank: 6, name: "luna_s", score: 118600, label: "coins" },
    { rank: 7, name: "alex_v", score: 98300, label: "coins" },
    { rank: 8, name: "priya_d", score: 82700, label: "coins" },
    { rank: 9, name: "james_k", score: 71400, label: "coins" },
    { rank: 10, name: "sarah_m", score: 58900, label: "coins" },
    { rank: 11, name: "mike_f", score: 48200, label: "coins" },
    { rank: 12, name: "anna_k", score: 39700, label: "coins" },
    { rank: 13, name: "leo_b", score: 31500, label: "coins" },
    { rank: 14, name: "sara_p", score: 25800, label: "coins" },
    { rank: 15, name: "kai_w", score: 19200, label: "coins" },
    { rank: 16, name: "mia_r", score: 14700, label: "coins" },
    { rank: 17, name: "ethan_j", score: 10900, label: "coins" },
    { rank: 18, name: "zoe_l", score: 7800, label: "coins" },
    { rank: 19, name: "noah_c", score: 5100, label: "coins" },
    { rank: 20, name: "ella_d", score: 2900, label: "coins" },
  ],
} as const;

const PODIUM_COLORS = [
  {
    bg: "linear-gradient(135deg, #FFD700, #FF6B00)",
    text: "#000",
    border: "#FFD700",
    shadow: "0 0 20px rgba(255,215,0,0.4)",
    height: "h-24",
  },
  {
    bg: "linear-gradient(135deg, #C0C0C0, #888)",
    text: "#000",
    border: "#C0C0C0",
    shadow: "0 0 12px rgba(192,192,192,0.3)",
    height: "h-16",
  },
  {
    bg: "linear-gradient(135deg, #CD7F32, #8B4513)",
    text: "#000",
    border: "#CD7F32",
    shadow: "0 0 10px rgba(205,127,50,0.3)",
    height: "h-12",
  },
];

const RANK_EMOJIS = ["🥇", "🥈", "🥉"];

function formatScore(score: number, label: string): string {
  if (label === "coins" && score >= 1000) {
    return `${(score / 1000).toFixed(1)}K`;
  }
  if (label === "pts" && score >= 1000) {
    return `${(score / 1000).toFixed(1)}K`;
  }
  return score.toString();
}

export default function WeeklyLeaderboardPage({
  onBack,
}: WeeklyLeaderboardPageProps) {
  const [activeTab, setActiveTab] = useState<LbTab>("battles");

  const data = LEADERBOARD_DATA[activeTab];
  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  // Mock: current user is rank 8
  const myRank =
    activeTab === "battles" ? 8 : activeTab === "engagement" ? 10 : 12;
  const myEntry = data[myRank - 1];

  const tabs: { id: LbTab; label: string; emoji: string }[] = [
    { id: "battles", label: "Battle Wins", emoji: "⚔️" },
    { id: "engagement", label: "Engagement", emoji: "❤️" },
    { id: "gifts", label: "Gifts", emoji: "🎁" },
  ];

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: "#0f0f0f" }}
      data-ocid="weekly_lb.page"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-2">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "#1a1a1a" }}
          data-ocid="weekly_lb.back.button"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h1 className="text-white font-black text-xl">Weekly Leaderboard</h1>
          <p className="text-gray-600 text-xs">Top Battle Creators</p>
        </div>
      </div>

      {/* Tab pills */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
            style={{
              background: activeTab === t.id ? "#FF2D2D" : "#1a1a1a",
              color: activeTab === t.id ? "#fff" : "#888",
              border: `1px solid ${activeTab === t.id ? "#FF2D2D" : "#2a2a2a"}`,
            }}
            data-ocid="weekly_lb.tab"
          >
            <span>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {/* Podium top 3 */}
        <div className="flex items-end justify-center gap-3 px-6 mb-6 pt-2">
          {/* Silver #2 */}
          {top3[1] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center gap-2 flex-1"
            >
              <span className="text-lg">{RANK_EMOJIS[1]}</span>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-black font-black text-lg"
                style={{
                  background: PODIUM_COLORS[1]!.bg,
                  boxShadow: PODIUM_COLORS[1]!.shadow,
                }}
              >
                {top3[1].name[0]?.toUpperCase()}
              </div>
              <span className="text-white text-xs font-semibold text-center truncate w-full text-center">
                @{top3[1].name}
              </span>
              <span className="text-gray-400 text-[10px]">
                {formatScore(top3[1].score, top3[1].label)} {top3[1].label}
              </span>
              <div
                className={`w-full ${PODIUM_COLORS[1]!.height} rounded-t-xl flex items-end justify-center pb-1`}
                style={{ background: "rgba(192,192,192,0.12)" }}
              >
                <span className="text-gray-400 font-black text-sm">2</span>
              </div>
            </motion.div>
          )}

          {/* Gold #1 */}
          {top3[0] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              className="flex flex-col items-center gap-2 flex-1"
            >
              <span className="text-2xl">🥇</span>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-black font-black text-xl border-2"
                style={{
                  background: PODIUM_COLORS[0]!.bg,
                  borderColor: "#FFD700",
                  boxShadow: PODIUM_COLORS[0]!.shadow,
                }}
              >
                {top3[0].name[0]?.toUpperCase()}
              </div>
              <span className="text-white text-sm font-bold text-center truncate w-full text-center">
                @{top3[0].name}
              </span>
              <span className="text-yellow-400 text-[10px] font-semibold">
                {formatScore(top3[0].score, top3[0].label)} {top3[0].label}
              </span>
              <div
                className={`w-full ${PODIUM_COLORS[0]!.height} rounded-t-xl flex items-end justify-center pb-1`}
                style={{ background: "rgba(255,215,0,0.12)" }}
              >
                <span className="text-yellow-400 font-black text-sm">1</span>
              </div>
            </motion.div>
          )}

          {/* Bronze #3 */}
          {top3[2] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex flex-col items-center gap-2 flex-1"
            >
              <span className="text-lg">{RANK_EMOJIS[2]}</span>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-black font-black text-lg"
                style={{
                  background: PODIUM_COLORS[2]!.bg,
                  boxShadow: PODIUM_COLORS[2]!.shadow,
                }}
              >
                {top3[2].name[0]?.toUpperCase()}
              </div>
              <span className="text-white text-xs font-semibold text-center truncate w-full text-center">
                @{top3[2].name}
              </span>
              <span className="text-gray-400 text-[10px]">
                {formatScore(top3[2].score, top3[2].label)} {top3[2].label}
              </span>
              <div
                className={`w-full ${PODIUM_COLORS[2]!.height} rounded-t-xl flex items-end justify-center pb-1`}
                style={{ background: "rgba(205,127,50,0.12)" }}
              >
                <span
                  style={{ color: "#CD7F32" }}
                  className="font-black text-sm"
                >
                  3
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Ranks 4-20 */}
        <div className="px-4 flex flex-col gap-2 mb-20">
          {rest.map((entry, i) => (
            <motion.div
              key={entry.rank}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "#111", border: "1px solid #1e1e1e" }}
              data-ocid={`weekly_lb.item.${entry.rank}`}
            >
              <span className="text-gray-500 text-sm font-bold w-6 text-center">
                #{entry.rank}
              </span>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #1a1a1a, #2a2a2a)",
                  border: "1px solid #2a2a2a",
                }}
              >
                <span className="text-white text-xs font-black">
                  {entry.name[0]?.toUpperCase()}
                </span>
              </div>
              <span className="text-white text-sm font-medium flex-1">
                @{entry.name}
              </span>
              <span className="text-gray-400 text-xs font-semibold">
                {formatScore(entry.score, entry.label)} {entry.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* My rank sticky card */}
      {myEntry && (
        <div
          className="absolute bottom-0 left-0 right-0 px-4 py-3"
          style={{
            background: "rgba(15,15,15,0.96)",
            borderTop: "1px solid rgba(255,45,45,0.3)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{
              background: "rgba(255,45,45,0.1)",
              border: "1px solid rgba(255,45,45,0.3)",
            }}
          >
            <span
              className="text-sm font-black tabular-nums"
              style={{ color: "#FF2D2D" }}
            >
              #{myRank}
            </span>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white"
              style={{
                background: "linear-gradient(135deg, #FF2D2D, #FF6B6B)",
              }}
            >
              Y
            </div>
            <span className="text-white text-sm font-semibold flex-1">You</span>
            <span className="text-gray-400 text-sm font-semibold">
              {formatScore(myEntry.score, myEntry.label)} {myEntry.label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
