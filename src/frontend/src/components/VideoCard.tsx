import { Skeleton } from "@/components/ui/skeleton";
import type { Principal } from "@icp-sdk/core/principal";
import { Clock, Eye, MessageCircle, Play, ThumbsUp } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import type { VideoPost } from "../backend.d";
import { useGetUsernameByPrincipal } from "../hooks/useQueries";
import { getEngagement } from "../utils/videoEngagement";

// ─── Comment count helper (still uses local storage via comment key) ──────────
function getCommentCount(vid: string): number {
  try {
    const raw = localStorage.getItem(`cmt3-${vid}`);
    if (!raw) return 0;
    const arr = JSON.parse(raw) as unknown[];
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}
function fmtN(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatRelativeTime(timestampNs: bigint): string {
  const ms = Number(timestampNs / BigInt(1_000_000));
  const now = Date.now();
  const diff = now - ms;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return new Date(ms).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

interface VideoCardProps {
  post: VideoPost;
  index: number;
  onClick: () => void;
  onCreatorClick?: (uploader: Principal) => void;
}

export function VideoCard({
  post,
  index,
  onClick,
  onCreatorClick,
}: VideoCardProps) {
  const [imgError, setImgError] = useState(false);
  const { data: username } = useGetUsernameByPrincipal(post.uploader);
  const thumbnailUrl = post.thumbnailBlob.getDirectURL();
  const vid = post.id.toString();
  const { views, likes } = useMemo(() => getEngagement(vid), [vid]);
  const commentCount = useMemo(() => getCommentCount(vid), [vid]);

  const ocid = `home.item.${index}` as const;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="video-card cursor-pointer w-full text-left"
      onClick={onClick}
      data-ocid={ocid}
      aria-label={`Play ${post.title}`}
    >
      <div className="bg-card rounded-2xl overflow-hidden border border-border/30">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-secondary overflow-hidden">
          {!imgError ? (
            <img
              src={thumbnailUrl}
              alt={post.title}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <Play className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          {/* Play overlay */}
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="font-semibold text-sm text-foreground leading-snug line-clamp-2 mb-1.5">
            {post.title}
          </h3>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCreatorClick?.(post.uploader);
              }}
              className="font-medium truncate max-w-[60%] text-primary hover:text-primary/80 transition-colors underline-offset-2 hover:underline text-left"
              data-ocid="home.creator.button"
            >
              @{username ?? "user"}
            </button>
            <span className="flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(post.timestamp)}
            </span>
          </div>
          {/* Engagement stats */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {views > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {fmtN(views)}
              </span>
            )}
            {likes > 0 && (
              <span className="flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" />
                {fmtN(likes)}
              </span>
            )}
            {commentCount > 0 && (
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {fmtN(commentCount)}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export function VideoCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border/30">
      <Skeleton className="aspect-video w-full bg-secondary" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4 bg-secondary" />
        <Skeleton className="h-3 w-1/2 bg-secondary" />
      </div>
    </div>
  );
}
