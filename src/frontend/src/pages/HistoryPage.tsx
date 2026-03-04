import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Play, Trash2, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { VideoPost, WatchHistoryEntry } from "../backend.d";
import { VideoCard } from "../components/VideoCard";
import { VideoPlayerModal } from "../components/VideoPlayerModal";
import {
  useClearWatchHistory,
  useGetSubscriptions,
  useGetWatchHistory,
  useListVideoPosts,
} from "../hooks/useQueries";

type HistoryTab = "watch_history" | "subscriptions";

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatTimeAgo(nanoseconds: bigint): string {
  const ms = Number(nanoseconds / 1_000_000n);
  const now = Date.now();
  const diff = now - ms;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 7)
    return new Date(ms).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

// ─── Watch History Tab ────────────────────────────────────────────────────────

function WatchHistoryItem({
  entry,
  video,
  index,
  onClick,
}: {
  entry: WatchHistoryEntry;
  video: VideoPost | undefined;
  index: number;
  onClick: () => void;
}) {
  const thumbUrl = video?.thumbnailBlob.getDirectURL();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.04 }}
      className="flex items-center gap-3 bg-card rounded-2xl overflow-hidden w-full text-left border border-border/20 hover:border-border/40 transition-all active:scale-[0.98]"
      data-ocid={`history.watch_history.item.${index}`}
    >
      {/* Thumbnail */}
      <div className="w-20 h-14 bg-secondary shrink-0 relative overflow-hidden rounded-l-2xl">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={video?.title ?? "Video"}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 py-2 pr-3">
        <p className="text-sm font-semibold text-foreground truncate line-clamp-1">
          {video?.title ?? "Loading..."}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
          <Clock className="w-3 h-3 shrink-0" />
          {formatTimeAgo(entry.watchedAt)}
        </p>
      </div>
    </motion.button>
  );
}

function WatchHistoryTab({ allVideos }: { allVideos: VideoPost[] }) {
  const { data: history, isLoading } = useGetWatchHistory();
  const clearHistory = useClearWatchHistory();
  const [selectedVideo, setSelectedVideo] = useState<VideoPost | null>(null);

  const sortedHistory = history
    ? [...history].sort((a, b) => Number(b.watchedAt - a.watchedAt))
    : [];

  const handleClear = async () => {
    try {
      await clearHistory.mutateAsync();
      toast.success("Watch history cleared");
    } catch {
      toast.error("Failed to clear history");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4">
      {isLoading ? (
        <div className="space-y-2 pt-3" data-ocid="history.watch_history.list">
          {[1, 2, 3].map((k) => (
            <Skeleton
              key={k}
              className="h-14 w-full rounded-2xl bg-secondary/40"
            />
          ))}
        </div>
      ) : sortedHistory.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center py-20 text-center"
          data-ocid="history.watch_history.empty_state"
        >
          <Clock
            className="w-12 h-12 mb-4 text-muted-foreground"
            strokeWidth={1.5}
          />
          <p className="text-base font-bold text-foreground mb-1">
            No watch history yet
          </p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Videos you watch will appear here, sorted by most recent.
          </p>
        </motion.div>
      ) : (
        <div className="pt-3">
          {/* Header row with clear button */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground font-medium">
              {sortedHistory.length} video
              {sortedHistory.length !== 1 ? "s" : ""} watched
            </p>
            <button
              type="button"
              onClick={() => void handleClear()}
              disabled={clearHistory.isPending}
              className="flex items-center gap-1.5 text-xs font-semibold text-destructive/80 hover:text-destructive transition-colors disabled:opacity-50"
              data-ocid="history.watch_history.delete_button"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {clearHistory.isPending ? "Clearing..." : "Clear History"}
            </button>
          </div>

          <div className="space-y-2" data-ocid="history.watch_history.list">
            {sortedHistory.map((entry, i) => {
              const video = allVideos.find((v) => v.id === entry.videoId);
              return (
                <WatchHistoryItem
                  key={`${entry.videoId.toString()}-${entry.watchedAt.toString()}`}
                  entry={entry}
                  video={video}
                  index={i + 1}
                  onClick={() => video && setSelectedVideo(video)}
                />
              );
            })}
          </div>
        </div>
      )}

      <VideoPlayerModal
        post={selectedVideo}
        open={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </div>
  );
}

// ─── Subscriptions Tab ────────────────────────────────────────────────────────

function SubscriptionsTab({ allVideos }: { allVideos: VideoPost[] }) {
  const { data: subscriptions, isLoading: subsLoading } = useGetSubscriptions();
  const [selectedVideo, setSelectedVideo] = useState<VideoPost | null>(null);

  const subscribedPrincipalSet = new Set(
    (subscriptions ?? []).map((p) => p.toString()),
  );

  const subscriptionVideos = allVideos
    .filter((v) => subscribedPrincipalSet.has(v.uploader.toString()))
    .sort((a, b) => Number(b.timestamp - a.timestamp));

  if (subsLoading) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4">
        <div className="space-y-4 pt-3">
          {[1, 2, 3].map((k) => (
            <Skeleton
              key={k}
              className="aspect-video w-full rounded-2xl bg-secondary/40"
            />
          ))}
        </div>
      </div>
    );
  }

  if (
    !subscriptions ||
    subscriptions.length === 0 ||
    subscriptionVideos.length === 0
  ) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center py-20 text-center"
          data-ocid="history.subscriptions.empty_state"
        >
          <Users
            className="w-12 h-12 mb-4 text-muted-foreground"
            strokeWidth={1.5}
          />
          <p className="text-base font-bold text-foreground mb-1">
            No subscription videos yet
          </p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Follow creators to see their videos here.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4">
      <div className="space-y-4 pt-3" data-ocid="history.subscriptions.list">
        {subscriptionVideos.map((video, i) => (
          <VideoCard
            key={video.id.toString()}
            post={video}
            index={i + 1}
            onClick={() => setSelectedVideo(video)}
          />
        ))}
      </div>

      <VideoPlayerModal
        post={selectedVideo}
        open={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </div>
  );
}

// ─── HistoryPage ──────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<HistoryTab>("watch_history");
  const { data: allVideos = [] } = useListVideoPosts();

  const tabs: { id: HistoryTab; label: string }[] = [
    { id: "watch_history", label: "Watch History" },
    { id: "subscriptions", label: "Subscriptions" },
  ];

  return (
    <div
      className="h-full flex flex-col bg-background"
      data-ocid="history.page"
    >
      {/* Header */}
      <header className="px-4 pt-4 pb-3 shrink-0">
        <h1 className="text-lg font-black tracking-tight text-foreground">
          History
        </h1>
      </header>

      {/* Tab bar */}
      <div className="px-4 pb-3 shrink-0">
        <div
          className="flex gap-2 p-1 rounded-2xl"
          style={{ background: "#1A1A1A" }}
        >
          {tabs.map(({ id, label }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className="relative flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                style={{
                  color: isActive ? "#fff" : "#6b7280",
                }}
                data-ocid={`history.${id}.tab`}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="history-tab-bg"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: "#FF2D2D" }}
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Separator */}
      <div className="h-px bg-border/20 mx-4 mb-0 shrink-0" />

      {/* Tab content */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18, ease: "easeInOut" }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {activeTab === "watch_history" ? (
            <WatchHistoryTab allVideos={allVideos} />
          ) : (
            <SubscriptionsTab allVideos={allVideos} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
