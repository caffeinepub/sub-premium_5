import { Play } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import type { VideoPost } from "../backend.d";
import { useGetUsernameByPrincipal } from "../hooks/useQueries";
import { getEngagement } from "../utils/videoEngagement";

// ─── Compact Video Card ───────────────────────────────────────────────────────

interface CompactCardProps {
  post: VideoPost;
  index: number;
  onClick: () => void;
}

function CompactCard({ post, index, onClick }: CompactCardProps) {
  const [imgError, setImgError] = useState(false);
  const { data: username } = useGetUsernameByPrincipal(post.uploader);
  const thumbUrl = post.thumbnailBlob.getDirectURL();
  const { views } = getEngagement(post.id.toString());

  function fmtN(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }

  return (
    <motion.button
      type="button"
      data-ocid={`home.section.item.${index}`}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="shrink-0 w-[140px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
    >
      {/* Thumbnail */}
      <div className="relative w-[140px] h-[80px] rounded-2xl overflow-hidden bg-[#1a1a1a] border border-white/8">
        {!imgError ? (
          <img
            src={thumbUrl}
            alt={post.title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
            <Play className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-150">
          <div className="w-8 h-8 rounded-full bg-[#FF0000]/90 flex items-center justify-center">
            <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
          </div>
        </div>
        {/* View count badge */}
        {views > 0 && (
          <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-sm rounded px-1 py-0.5">
            <span className="text-[9px] font-semibold text-white leading-none">
              {fmtN(views)}
            </span>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="mt-1.5 px-0.5">
        <p className="text-[11px] font-semibold text-white line-clamp-1 leading-snug">
          {post.title}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
          @{username ?? "user"}
        </p>
      </div>
    </motion.button>
  );
}

// ─── Live Now Empty State ─────────────────────────────────────────────────────

function LiveNowEmptyState() {
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-3 bg-[#1a1a1a] border border-white/8 rounded-2xl"
      data-ocid="home.live_now.empty_state"
    >
      {/* Pulsing red dot */}
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF0000] opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF0000]" />
      </span>
      <p className="text-xs text-muted-foreground font-medium">
        No live streams right now
      </p>
    </div>
  );
}

// ─── Section Row ──────────────────────────────────────────────────────────────

interface HomeSectionRowProps {
  title: string;
  emoji: string;
  videos: VideoPost[];
  isLive?: boolean;
  onVideoClick: (post: VideoPost) => void;
  animationDelay?: number;
}

export function HomeSectionRow({
  title,
  emoji,
  videos,
  isLive = false,
  onVideoClick,
  animationDelay = 0,
}: HomeSectionRowProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: animationDelay, ease: "easeOut" }}
      className="mb-6"
      aria-label={`${title} section`}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2">
          {/* Live dot for Live Now section */}
          {isLive && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF0000] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF0000]" />
            </span>
          )}
          <h2 className="text-sm font-black text-white tracking-tight">
            {emoji} {title}
          </h2>
        </div>
        <button
          type="button"
          data-ocid={`home.section.${title.toLowerCase().replace(/\s/g, "_")}.button`}
          className="text-[11px] font-semibold text-muted-foreground hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded px-1"
        >
          See all →
        </button>
      </div>

      {/* Scrollable strip */}
      {isLive && videos.length === 0 ? (
        <LiveNowEmptyState />
      ) : videos.length === 0 ? (
        <div
          className="text-xs text-muted-foreground px-0.5 py-2"
          data-ocid={`home.section.${title.toLowerCase().replace(/\s/g, "_")}.empty_state`}
        >
          No content available yet
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {videos.map((post, i) => (
            <CompactCard
              key={post.id.toString()}
              post={post}
              index={i + 1}
              onClick={() => onVideoClick(post)}
            />
          ))}
        </div>
      )}
    </motion.section>
  );
}
