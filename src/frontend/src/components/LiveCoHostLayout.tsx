import { Mic, MicOff, Video, VideoOff, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { CoHost, LayoutMode } from "../hooks/useCoHostSystem";

interface Creator {
  username: string;
  avatarLetter: string;
}

interface LiveCoHostLayoutProps {
  layoutMode: LayoutMode;
  creator: Creator;
  coHosts: CoHost[];
  isCreator: boolean;
  onRemoveCoHost?: (id: string) => void;
}

const CELL_GRADIENTS = [
  "linear-gradient(135deg, #1a0a2e, #2d1b69)", // creator — deep purple
  "linear-gradient(135deg, #0a2e1a, #1b692d)", // co-host 1 — emerald
  "linear-gradient(135deg, #2e1a0a, #692d1b)", // co-host 2 — amber
  "linear-gradient(135deg, #0a1a2e, #1b2d69)", // co-host 3 — navy
];

interface CellProps {
  gradient: string;
  avatarLetter: string;
  username: string;
  showRemove?: boolean;
  onRemove?: () => void;
  index: number;
}

function CoHostCell({
  gradient,
  avatarLetter,
  username,
  showRemove,
  onRemove,
  index,
}: CellProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="relative flex flex-col items-center justify-center overflow-hidden"
      style={{ background: gradient }}
      data-ocid={`live_cohost.cell.item.${index + 1}`}
    >
      {/* Glow overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.04) 0%, transparent 70%)",
        }}
      />

      {/* Avatar circle */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-white/20 mb-2"
        style={{ background: "rgba(255,255,255,0.1)" }}
      >
        <span className="text-white font-black text-2xl">{avatarLetter}</span>
      </div>

      {/* Username */}
      <span
        className="text-white text-xs font-semibold px-2 py-0.5 rounded-full truncate max-w-[90%]"
        style={{ background: "rgba(0,0,0,0.4)" }}
      >
        @{username}
      </span>

      {/* Mic / Cam icons top-right */}
      <div className="absolute top-2 right-2 flex gap-1">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <Mic className="w-2.5 h-2.5 text-white/70" />
        </div>
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <Video className="w-2.5 h-2.5 text-white/70" />
        </div>
      </div>

      {/* Remove button — only for co-hosts */}
      {showRemove && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,45,45,0.8)" }}
          data-ocid={`live_cohost.remove.button.${index}`}
        >
          <X className="w-2.5 h-2.5 text-white" />
        </button>
      )}

      {/* LIVE badge for creator */}
      {index === 0 && (
        <div
          className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full"
          style={{ background: "#FF2D2D" }}
        >
          <span className="text-white text-[9px] font-black">HOST</span>
        </div>
      )}
    </motion.div>
  );
}

// Placeholder cell for empty slots in 2v2 / grid4
function EmptyCell({ index }: { index: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2"
      style={{ background: "#0a0a0a", border: "1px dashed #2a2a2a" }}
      data-ocid={`live_cohost.cell.item.${index + 1}`}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: "#1a1a1a" }}
      >
        <MicOff className="w-5 h-5 text-gray-700" />
      </div>
      <span className="text-gray-700 text-[10px]">Empty</span>
    </div>
  );
}

// Placeholder for video-off state
function VideoOffPlaceholder() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.3)" }}
    >
      <VideoOff className="w-5 h-5 text-white/30" />
    </div>
  );
}

export function LiveCoHostLayout({
  layoutMode,
  creator,
  coHosts,
  isCreator,
  onRemoveCoHost,
}: LiveCoHostLayoutProps) {
  const allParticipants = [
    {
      id: "creator",
      username: creator.username,
      avatarLetter: creator.avatarLetter,
    },
    ...coHosts,
  ];

  return (
    <div className="absolute inset-0" data-ocid="live_cohost.layout.panel">
      <AnimatePresence mode="sync">
        {layoutMode === "solo" && (
          <motion.div
            key="solo"
            className="w-full h-full flex flex-col items-center justify-center"
            style={{ background: CELL_GRADIENTS[0] }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center border-2 border-white/20 mb-3"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <span className="text-white font-black text-4xl">
                {creator.avatarLetter}
              </span>
            </div>
            <span className="text-white text-sm font-semibold opacity-70">
              @{creator.username}
            </span>
            <VideoOffPlaceholder />
          </motion.div>
        )}

        {layoutMode === "1v1" && (
          <motion.div
            key="1v1"
            className="w-full h-full grid grid-rows-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CoHostCell
              gradient={CELL_GRADIENTS[0]!}
              avatarLetter={creator.avatarLetter}
              username={creator.username}
              showRemove={false}
              index={0}
            />
            {coHosts[0] ? (
              <CoHostCell
                gradient={CELL_GRADIENTS[1]!}
                avatarLetter={coHosts[0].avatarLetter}
                username={coHosts[0].username}
                showRemove={isCreator}
                onRemove={() => onRemoveCoHost?.(coHosts[0]!.id)}
                index={1}
              />
            ) : (
              <EmptyCell index={1} />
            )}
          </motion.div>
        )}

        {layoutMode === "2v2" && (
          <motion.div
            key="2v2"
            className="w-full h-full grid grid-cols-2 grid-rows-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Top-left: creator (Team A) */}
            <CoHostCell
              gradient={CELL_GRADIENTS[0]!}
              avatarLetter={creator.avatarLetter}
              username={creator.username}
              showRemove={false}
              index={0}
            />
            {/* Top-right: co-host 2 (Team B) */}
            {coHosts[1] ? (
              <CoHostCell
                gradient={CELL_GRADIENTS[2]!}
                avatarLetter={coHosts[1].avatarLetter}
                username={coHosts[1].username}
                showRemove={isCreator}
                onRemove={() => onRemoveCoHost?.(coHosts[1]!.id)}
                index={2}
              />
            ) : (
              <EmptyCell index={2} />
            )}
            {/* Bottom-left: co-host 1 (Team A) */}
            {coHosts[0] ? (
              <CoHostCell
                gradient={CELL_GRADIENTS[1]!}
                avatarLetter={coHosts[0].avatarLetter}
                username={coHosts[0].username}
                showRemove={isCreator}
                onRemove={() => onRemoveCoHost?.(coHosts[0]!.id)}
                index={1}
              />
            ) : (
              <EmptyCell index={1} />
            )}
            {/* Bottom-right: co-host 3 (Team B) */}
            {coHosts[2] ? (
              <CoHostCell
                gradient={CELL_GRADIENTS[3]!}
                avatarLetter={coHosts[2].avatarLetter}
                username={coHosts[2].username}
                showRemove={isCreator}
                onRemove={() => onRemoveCoHost?.(coHosts[2]!.id)}
                index={3}
              />
            ) : (
              <EmptyCell index={3} />
            )}
          </motion.div>
        )}

        {layoutMode === "grid4" && (
          <motion.div
            key="grid4"
            className="w-full h-full grid grid-cols-2 grid-rows-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {allParticipants.slice(0, 4).map((p, i) => (
              <CoHostCell
                key={p.id}
                gradient={CELL_GRADIENTS[i] ?? CELL_GRADIENTS[0]!}
                avatarLetter={p.avatarLetter}
                username={p.username}
                showRemove={isCreator && i > 0}
                onRemove={i > 0 ? () => onRemoveCoHost?.(p.id) : undefined}
                index={i}
              />
            ))}
            {allParticipants.length < 4 &&
              Array.from({ length: 4 - allParticipants.length }, (_, i) => (
                <EmptyCell
                  key={`empty-slot-${allParticipants.length + i}`}
                  index={allParticipants.length + i}
                />
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
