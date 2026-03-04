import { Bell, Tv2, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import type { VideoPost } from "../backend.d";
import { AISearchBar } from "../components/AISearchBar";
import { CategoryTabs } from "../components/CategoryTabs";
import type { Category } from "../components/CategoryTabs";
import {
  DEFAULT_NOTIFICATIONS,
  NotificationsPanel,
} from "../components/NotificationsPanel";
import type { Notification } from "../components/NotificationsPanel";
import { VideoCard, VideoCardSkeleton } from "../components/VideoCard";
import { VideoPlayerModal } from "../components/VideoPlayerModal";
import { useListVideoPosts } from "../hooks/useQueries";

function filterVideos(videos: VideoPost[], category: Category): VideoPost[] {
  if (category === "All") return videos;
  const keyword = category.toLowerCase();
  return videos.filter(
    (v) =>
      v.title.toLowerCase().includes(keyword) ||
      v.description.toLowerCase().includes(keyword),
  );
}

function filterVideosBySearch(videos: VideoPost[], query: string): VideoPost[] {
  const q = query.toLowerCase().trim();
  if (!q) return videos;
  return videos.filter(
    (v) =>
      v.title.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q),
  );
}

export default function HomePage() {
  const { data: videos, isLoading } = useListVideoPosts();
  const [selectedVideo, setSelectedVideo] = useState<VideoPost | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(
    DEFAULT_NOTIFICATIONS,
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const categoryFilteredVideos = useMemo(
    () => filterVideos(videos ?? [], activeCategory),
    [videos, activeCategory],
  );

  const displayedVideos = useMemo(() => {
    if (searchActive && searchQuery.trim()) {
      return filterVideosBySearch(videos ?? [], searchQuery);
    }
    return categoryFilteredVideos;
  }, [searchActive, searchQuery, videos, categoryFilteredVideos]);

  function handleSearch(q: string) {
    setSearchQuery(q);
    setSearchActive(!!q.trim());
  }

  function handleToggleNotifications() {
    setNotificationsOpen((prev) => !prev);
  }

  function handleMarkRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  // Animation key: changes when search mode or category changes
  const feedKey = searchActive ? `search-${searchQuery}` : activeCategory;

  return (
    <div className="h-full flex flex-col bg-background" data-ocid="home.page">
      {/* Sticky header + search + tabs block */}
      <div className="sticky top-0 z-10 bg-background shrink-0">
        {/* Header */}
        <header className="px-4 pt-4 pb-2 flex items-center justify-between gap-2 min-h-[56px]">
          {/* Logo */}
          <h1 className="text-lg font-black tracking-tight text-[#FF2D2D]">
            SUB PREMIUM
          </h1>

          {/* Right icons */}
          <div className="flex items-center gap-2">
            {/* Notification bell with badge */}
            <button
              type="button"
              data-ocid="home.notification.button"
              aria-label="Notifications"
              onClick={handleToggleNotifications}
              className="relative w-9 h-9 rounded-full bg-[#1C1C1C] flex items-center justify-center
                         text-muted-foreground hover:text-foreground hover:bg-[#242424]
                         transition-colors duration-150 focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF2D2D] border border-background" />
              )}
            </button>

            {/* Profile */}
            <button
              type="button"
              data-ocid="home.profile.button"
              aria-label="Profile"
              className="w-9 h-9 rounded-full bg-[#1C1C1C] flex items-center justify-center
                         text-muted-foreground hover:text-foreground hover:bg-[#242424]
                         transition-colors duration-150 focus-visible:outline-none
                         focus-visible:ring-2 focus-visible:ring-primary"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* AI Search Bar — always visible below header */}
        <AISearchBar
          videos={videos ?? []}
          onSearch={handleSearch}
          onVideoClick={(v) => setSelectedVideo(v)}
        />

        {/* Category tabs */}
        <CategoryTabs active={activeCategory} onChange={setActiveCategory} />

        {/* Thin separator */}
        <div className="h-px bg-border/20 mx-4" />
      </div>

      {/* Notifications panel (positioned below sticky header) */}
      <NotificationsPanel
        open={notificationsOpen}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onClose={() => setNotificationsOpen(false)}
      />

      {/* Content */}
      <main className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4">
        {isLoading ? (
          <div className="space-y-4 pt-3" data-ocid="home.loading_state">
            {(["s1", "s2", "s3", "s4"] as const).map((k) => (
              <VideoCardSkeleton key={k} />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={feedKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {displayedVideos.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col items-center justify-center min-h-[55vh] text-center px-6"
                  data-ocid="home.empty_state"
                >
                  <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center mb-5">
                    {searchActive ? (
                      <span className="text-4xl">🔍</span>
                    ) : (
                      <Tv2 className="w-9 h-9 text-muted-foreground" />
                    )}
                  </div>
                  <h2 className="text-xl font-bold mb-2">
                    {searchActive
                      ? "No videos found"
                      : activeCategory === "All"
                        ? "No videos yet"
                        : `No ${activeCategory} videos yet`}
                  </h2>
                  <p className="text-muted-foreground text-sm max-w-xs">
                    {searchActive
                      ? `No videos matched "${searchQuery}". Try a different search term.`
                      : activeCategory === "All"
                        ? "Be the first to upload and share something amazing with the community."
                        : `No videos tagged as "${activeCategory}" have been uploaded yet.`}
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-4 pt-3" data-ocid="home.list">
                  {displayedVideos.map((post, index) => (
                    <VideoCard
                      key={post.id.toString()}
                      post={post}
                      index={index + 1}
                      onClick={() => setSelectedVideo(post)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Video Player Modal */}
      <VideoPlayerModal
        post={selectedVideo}
        open={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </div>
  );
}
