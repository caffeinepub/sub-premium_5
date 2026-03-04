/**
 * TopEngagementChairs — top 3 engaged viewers displayed as glowing chairs
 * on the right side of the live watch screen.
 */

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Gift, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { EngagementEntry } from "../hooks/useEngagementStore";

const BADGE_CONFIGS = [
  {
    rank: 1,
    label: "👑",
    glow: "0 0 12px rgba(255,215,0,0.8)",
    border: "#FFD700",
    bg: "rgba(255,215,0,0.12)",
  },
  {
    rank: 2,
    label: "🥈",
    glow: "0 0 10px rgba(192,192,192,0.7)",
    border: "#C0C0C0",
    bg: "rgba(192,192,192,0.1)",
  },
  {
    rank: 3,
    label: "🥉",
    glow: "0 0 10px rgba(205,127,50,0.6)",
    border: "#CD7F32",
    bg: "rgba(205,127,50,0.1)",
  },
];

interface TopEngagementChairsProps {
  top3: EngagementEntry[];
  streamId?: bigint;
  onOpenProfile?: (
    userId: string,
    username: string,
    viewType: "viewer" | "creator",
  ) => void;
}

interface ViewerProfile {
  entry: EngagementEntry;
  rank: number;
}

export function TopEngagementChairs({
  top3,
  onOpenProfile,
}: TopEngagementChairsProps) {
  const [selectedViewer, setSelectedViewer] = useState<ViewerProfile | null>(
    null,
  );
  const [viewersOpen, setViewersOpen] = useState(false);

  return (
    <>
      <div
        className="flex flex-col gap-1.5 items-center"
        data-ocid="live_watch.chairs.panel"
      >
        {BADGE_CONFIGS.map((cfg, idx) => {
          const entry = top3[idx];
          const isOccupied = Boolean(entry);

          return (
            <motion.button
              key={cfg.rank}
              type="button"
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: idx * 0.08,
                type: "spring",
                stiffness: 260,
                damping: 22,
              }}
              onClick={() => {
                if (!isOccupied || !entry) return;
                if (onOpenProfile) {
                  onOpenProfile(entry.username, entry.username, "viewer");
                } else {
                  setSelectedViewer({ entry, rank: cfg.rank });
                }
              }}
              data-ocid={`live_watch.chair.item.${cfg.rank}`}
              className="relative flex flex-col items-center gap-0.5 w-11"
              style={{ cursor: isOccupied ? "pointer" : "default" }}
            >
              {/* Avatar circle */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black relative overflow-hidden"
                style={{
                  background: isOccupied ? cfg.bg : "rgba(255,255,255,0.05)",
                  border: `1.5px solid ${isOccupied ? cfg.border : "rgba(255,255,255,0.1)"}`,
                  boxShadow: isOccupied ? cfg.glow : "none",
                  transition: "all 0.3s ease",
                }}
              >
                {isOccupied && entry ? (
                  <motion.span
                    key={entry.username}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-white text-[11px] font-black"
                  >
                    {entry.avatar}
                  </motion.span>
                ) : (
                  <span className="text-white/20 text-xs">{cfg.label}</span>
                )}

                {/* Sparkle on new entry */}
                {isOccupied && (
                  <motion.div
                    key={`spark-${entry?.username ?? idx}`}
                    initial={{ opacity: 1, scale: 0 }}
                    animate={{ opacity: 0, scale: 2.5 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      background: `radial-gradient(circle, ${cfg.border}44 0%, transparent 70%)`,
                    }}
                  />
                )}
              </div>

              {/* Rank badge */}
              <span className="text-[9px] leading-none">{cfg.label}</span>

              {/* Username */}
              {isOccupied && entry && (
                <motion.span
                  key={entry.username}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-white/70 font-semibold leading-none"
                  style={{
                    fontSize: "7px",
                    maxWidth: "40px",
                    textAlign: "center",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entry.username.slice(0, 6)}
                </motion.span>
              )}
            </motion.button>
          );
        })}

        {/* All Viewers button */}
        <button
          type="button"
          onClick={() => setViewersOpen(true)}
          data-ocid="live_watch.all_viewers.button"
          className="flex flex-col items-center gap-0.5 mt-1"
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <Users className="w-4 h-4 text-white/50" />
          </div>
          <span
            style={{ fontSize: "7px" }}
            className="text-white/40 font-medium leading-none"
          >
            All
          </span>
        </button>
      </div>

      {/* Viewer Profile Modal */}
      <AnimatePresence>
        {selectedViewer && (
          <motion.div
            key="viewer-modal"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-8"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setSelectedViewer(null)}
          >
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation to prevent close */}
            <div
              className="w-full max-w-xs rounded-3xl p-6 flex flex-col items-center gap-4"
              style={{ background: "#111", border: "1px solid #2a2a2a" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Avatar */}
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black"
                style={{
                  background:
                    BADGE_CONFIGS[selectedViewer.rank - 1]?.bg ??
                    "rgba(255,45,45,0.2)",
                  border: `2px solid ${BADGE_CONFIGS[selectedViewer.rank - 1]?.border ?? "#FF2D2D"}`,
                  boxShadow:
                    BADGE_CONFIGS[selectedViewer.rank - 1]?.glow ?? "none",
                }}
              >
                {selectedViewer.entry.avatar}
              </div>

              <div className="text-center">
                <p className="text-white font-bold text-lg">
                  @{selectedViewer.entry.username}
                </p>
                <p className="text-yellow-400 text-sm font-semibold mt-0.5">
                  {BADGE_CONFIGS[selectedViewer.rank - 1]?.label} Rank #
                  {selectedViewer.rank}
                </p>
              </div>

              {/* Score breakdown */}
              <div
                className="w-full rounded-2xl p-4 space-y-2"
                style={{ background: "#1a1a1a" }}
              >
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Score</span>
                  <span className="text-white font-bold">
                    {selectedViewer.entry.score.toLocaleString()}
                  </span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">❤️ Hearts</span>
                  <span className="text-white/70">
                    {selectedViewer.entry.tapPoints.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">💬 Comments</span>
                  <span className="text-white/70">
                    {selectedViewer.entry.commentPoints.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">🎁 Gifts</span>
                  <span className="text-white/70">
                    {selectedViewer.entry.giftPoints.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setSelectedViewer(null)}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white/60"
                  style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
                  data-ocid="live_watch.viewer_profile.close_button"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedViewer(null);
                    // Could open gift drawer
                  }}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
                  style={{ background: "#FF2D2D" }}
                  data-ocid="live_watch.viewer_profile.gift_button"
                >
                  <Gift className="w-4 h-4" />
                  Gift
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All Viewers Sheet */}
      <Sheet open={viewersOpen} onOpenChange={setViewersOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-0 p-0"
          style={{ background: "#0f0f0f", maxHeight: "80vh" }}
          data-ocid="live_watch.viewers.sheet"
        >
          <SheetHeader className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-white/60" />
              <SheetTitle className="text-white text-base font-bold">
                Viewer Rankings
              </SheetTitle>
            </div>
          </SheetHeader>

          <div className="px-5 pb-8 overflow-y-auto space-y-2">
            {Object.values(
              top3.reduce<Record<string, EngagementEntry>>((acc, e) => {
                acc[e.username] = e;
                return acc;
              }, {}),
            ).length === 0 ? (
              <div
                className="text-center py-12 text-gray-500 text-sm"
                data-ocid="live_watch.viewers.empty_state"
              >
                No engagement data yet — be the first!
              </div>
            ) : (
              top3.map((entry, idx) => (
                <button
                  key={entry.username}
                  type="button"
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl w-full text-left"
                  style={{
                    background: "#111",
                    border: "1px solid #1e1e1e",
                    cursor: onOpenProfile ? "pointer" : "default",
                  }}
                  data-ocid={`live_watch.viewers.item.${idx + 1}`}
                  onClick={() =>
                    onOpenProfile?.(entry.username, entry.username, "viewer")
                  }
                >
                  <span className="text-lg w-6">
                    {BADGE_CONFIGS[idx]?.label ?? `#${idx + 1}`}
                  </span>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black"
                    style={{
                      background:
                        BADGE_CONFIGS[idx]?.bg ?? "rgba(255,45,45,0.15)",
                      border: `1.5px solid ${BADGE_CONFIGS[idx]?.border ?? "#FF2D2D"}`,
                    }}
                  >
                    {entry.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-semibold">
                      @{entry.username}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {entry.score.toLocaleString()} pts
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                    🪙 {entry.giftPoints.toLocaleString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
