import { Bell, SlidersHorizontal, Tv2, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { VideoPost } from "../backend.d";
import { AISearchBar } from "../components/AISearchBar";
import { CategoryTabs } from "../components/CategoryTabs";
import type { Category } from "../components/CategoryTabs";
import { HomeSectionRow } from "../components/HomeSectionRow";
import {
  DEFAULT_NOTIFICATIONS,
  NotificationsPanel,
} from "../components/NotificationsPanel";
import type { Notification } from "../components/NotificationsPanel";
import { VideoCard, VideoCardSkeleton } from "../components/VideoCard";
import { VideoPlayerModal } from "../components/VideoPlayerModal";
import {
  useGetUsernameByPrincipal,
  useListVideoPosts,
} from "../hooks/useQueries";
import { getEngagement } from "../utils/videoEngagement";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function filterVideos(videos: VideoPost[], category: Category): VideoPost[] {
  if (category === "All") return videos;
  const keyword = category.toLowerCase();
  return videos.filter(
    (v) =>
      v.title.toLowerCase().includes(keyword) ||
      v.description.toLowerCase().includes(keyword),
  );
}

function filterVideosBySearch(
  videos: VideoPost[],
  query: string,
  usernameMap?: Map<string, string>,
): VideoPost[] {
  const q = query.toLowerCase().trim();
  if (!q) return videos;

  // Extract hashtags from query (words starting with #)
  const queryHashtags = q
    .split(/\s+/)
    .filter((w) => w.startsWith("#"))
    .map((w) => w.slice(1));

  return videos.filter((v) => {
    const title = v.title.toLowerCase();
    const description = v.description.toLowerCase();
    const combined = `${title} ${description}`;

    // Match title / description
    if (title.includes(q) || description.includes(q)) return true;

    // Match @username
    const uploaderKey = v.uploader.toString();
    const uname = usernameMap?.get(uploaderKey)?.toLowerCase();
    if (uname) {
      // Support both "alex" and "@alex"
      const cleanQuery = q.startsWith("@") ? q.slice(1) : q;
      if (uname.includes(cleanQuery)) return true;
    }

    // Match hashtags extracted from query against title/description
    if (queryHashtags.length > 0) {
      for (const tag of queryHashtags) {
        if (combined.includes(tag)) return true;
      }
    }

    // Match hashtags that appear in the title/description against the full query
    const hashtagsInContent = combined.match(/#\w+/g) ?? [];
    for (const tag of hashtagsInContent) {
      if (q.includes(tag.toLowerCase().slice(1))) return true;
    }

    return false;
  });
}

type SortMode = "latest" | "most_viewed";

function sortVideos(videos: VideoPost[], mode: SortMode): VideoPost[] {
  if (mode === "latest")
    return [...videos].sort((a, b) => Number(b.timestamp - a.timestamp));
  return [...videos].sort(
    (a, b) =>
      (getEngagement(b.id.toString()).views ?? 0) -
      (getEngagement(a.id.toString()).views ?? 0),
  );
}

// ─── Username map builder (builds from video list) ────────────────────────────
// We collect all unique uploader principals and resolve them in bulk.
// This hook returns a stable Map<principalString, username>.
function useUsernameMap(videos: VideoPost[]): Map<string, string> {
  // Get unique uploaders (max 20 for perf)
  const uploaders = useMemo(() => {
    const seen = new Set<string>();
    const result: VideoPost["uploader"][] = [];
    for (const v of videos) {
      const k = v.uploader.toString();
      if (!seen.has(k)) {
        seen.add(k);
        result.push(v.uploader);
        if (result.length >= 20) break;
      }
    }
    return result;
  }, [videos]);

  // Resolve each principal separately — hooks called in a loop at fixed length
  // We use at most 20 slots and pad with undefined
  const slots = Array.from({ length: 20 }, (_, i) => uploaders[i]);

  const r0 = useGetUsernameByPrincipal(slots[0]);
  const r1 = useGetUsernameByPrincipal(slots[1]);
  const r2 = useGetUsernameByPrincipal(slots[2]);
  const r3 = useGetUsernameByPrincipal(slots[3]);
  const r4 = useGetUsernameByPrincipal(slots[4]);
  const r5 = useGetUsernameByPrincipal(slots[5]);
  const r6 = useGetUsernameByPrincipal(slots[6]);
  const r7 = useGetUsernameByPrincipal(slots[7]);
  const r8 = useGetUsernameByPrincipal(slots[8]);
  const r9 = useGetUsernameByPrincipal(slots[9]);
  const r10 = useGetUsernameByPrincipal(slots[10]);
  const r11 = useGetUsernameByPrincipal(slots[11]);
  const r12 = useGetUsernameByPrincipal(slots[12]);
  const r13 = useGetUsernameByPrincipal(slots[13]);
  const r14 = useGetUsernameByPrincipal(slots[14]);
  const r15 = useGetUsernameByPrincipal(slots[15]);
  const r16 = useGetUsernameByPrincipal(slots[16]);
  const r17 = useGetUsernameByPrincipal(slots[17]);
  const r18 = useGetUsernameByPrincipal(slots[18]);
  const r19 = useGetUsernameByPrincipal(slots[19]);

  return useMemo(() => {
    const map = new Map<string, string>();
    const entries: Array<[(typeof slots)[0], string | null | undefined]> = [
      [slots[0], r0.data],
      [slots[1], r1.data],
      [slots[2], r2.data],
      [slots[3], r3.data],
      [slots[4], r4.data],
      [slots[5], r5.data],
      [slots[6], r6.data],
      [slots[7], r7.data],
      [slots[8], r8.data],
      [slots[9], r9.data],
      [slots[10], r10.data],
      [slots[11], r11.data],
      [slots[12], r12.data],
      [slots[13], r13.data],
      [slots[14], r14.data],
      [slots[15], r15.data],
      [slots[16], r16.data],
      [slots[17], r17.data],
      [slots[18], r18.data],
      [slots[19], r19.data],
    ];
    for (const [principal, username] of entries) {
      if (principal && username) {
        map.set(principal.toString(), username);
      }
    }
    return map;
  }, [
    slots,
    r0.data,
    r1.data,
    r2.data,
    r3.data,
    r4.data,
    r5.data,
    r6.data,
    r7.data,
    r8.data,
    r9.data,
    r10.data,
    r11.data,
    r12.data,
    r13.data,
    r14.data,
    r15.data,
    r16.data,
    r17.data,
    r18.data,
    r19.data,
  ]);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface HomePageProps {
  onCreatorClick?: (principalId: string) => void;
}

export default function HomePage({ onCreatorClick }: HomePageProps) {
  const { data: videos, isLoading } = useListVideoPosts();
  const [selectedVideo, setSelectedVideo] = useState<VideoPost | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(
    DEFAULT_NOTIFICATIONS,
  );
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Build username map for @user search
  const usernameMap = useUsernameMap(videos ?? []);

  // Animated header: "Welcome to SUB TV" → logo + "SUB PREMIUM"
  const [headerPhase, setHeaderPhase] = useState<"welcome" | "logo">("welcome");
  const headerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    headerTimerRef.current = setTimeout(() => {
      setHeaderPhase("logo");
    }, 2200);
    return () => {
      if (headerTimerRef.current) clearTimeout(headerTimerRef.current);
    };
  }, []);

  // Auto-notification: detect newly uploaded videos
  const prevVideoCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (!videos) return;
    const currentCount = videos.length;
    if (prevVideoCountRef.current === null) {
      // First load — just record baseline
      prevVideoCountRef.current = currentCount;
      return;
    }
    if (currentCount > prevVideoCountRef.current) {
      // New video(s) uploaded — prepend notifications
      const newVideos = videos.slice(
        0,
        currentCount - prevVideoCountRef.current,
      );
      const newNotifs: Notification[] = newVideos.map((v) => {
        const uploaderName =
          usernameMap.get(v.uploader.toString()) ?? "creator";
        return {
          id: Date.now().toString() + v.id.toString(),
          type: "upload" as const,
          title: "New Video Uploaded",
          message: `@${uploaderName} uploaded a new video on SUB PREMIUM`,
          time: "Just now",
          read: false,
          videoId: v.id.toString(),
        };
      });
      setNotifications((prev) => [...newNotifs, ...prev]);
    }
    prevVideoCountRef.current = currentCount;
  }, [videos, usernameMap]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const categoryFilteredVideos = useMemo(
    () => filterVideos(videos ?? [], activeCategory),
    [videos, activeCategory],
  );

  const displayedVideos = useMemo(() => {
    const base =
      searchActive && searchQuery.trim()
        ? filterVideosBySearch(videos ?? [], searchQuery, usernameMap)
        : categoryFilteredVideos;
    return sortVideos(base, sortMode);
  }, [
    searchActive,
    searchQuery,
    videos,
    categoryFilteredVideos,
    sortMode,
    usernameMap,
  ]);

  // ─── Homepage section data ─────────────────────────────────────────────────

  const trendingVideos = useMemo(() => {
    return [...(videos ?? [])]
      .sort(
        (a, b) =>
          (getEngagement(b.id.toString()).views ?? 0) -
          (getEngagement(a.id.toString()).views ?? 0),
      )
      .slice(0, 10);
  }, [videos]);

  const recommendedVideos = useMemo(() => {
    return [...(videos ?? [])]
      .sort((a, b) => Number(b.timestamp - a.timestamp))
      .slice(0, 10);
  }, [videos]);

  const shortsVideos = useMemo(() => {
    return (videos ?? [])
      .filter(
        (v) =>
          v.title.toLowerCase().includes("short") ||
          v.description.toLowerCase().includes("short"),
      )
      .slice(0, 10);
  }, [videos]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

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

  function handleVideoOpenFromNotification(videoId: string) {
    const video = (videos ?? []).find((v) => v.id.toString() === videoId);
    if (video) setSelectedVideo(video);
  }

  // Animation key: changes when search mode or category changes
  const feedKey = searchActive ? `search-${searchQuery}` : activeCategory;

  return (
    <div className="h-full flex flex-col bg-background" data-ocid="home.page">
      {/* Sticky header + search + tabs block */}
      <div className="sticky top-0 z-10 bg-background shrink-0">
        {/* Header */}
        <header className="px-4 pt-4 pb-2 flex items-center justify-between gap-2 min-h-[56px]">
          {/* Animated logo / welcome text */}
          <div className="flex items-center gap-2 overflow-hidden">
            <AnimatePresence mode="wait">
              {headerPhase === "welcome" ? (
                <motion.h1
                  key="welcome"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-[22px] font-black tracking-[1.5px] text-white whitespace-nowrap"
                >
                  Welcome to SUB TV
                </motion.h1>
              ) : (
                <motion.div
                  key="logo"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.0 }}
                  className="flex items-center gap-2"
                >
                  {/* YouTube-style red play badge */}
                  <span className="w-9 h-6 bg-[#FF0000] rounded-md flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-xs leading-none">
                      ▶
                    </span>
                  </span>
                  <h1 className="text-[22px] font-black tracking-[1.5px] text-white whitespace-nowrap">
                    SUB PREMIUM
                  </h1>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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

        {/* Search Bar — always visible below header */}
        <AISearchBar
          videos={videos ?? []}
          onSearch={handleSearch}
          onVideoClick={(v) => setSelectedVideo(v)}
          usernameMap={usernameMap}
        />

        {/* Category tabs + sort */}
        <div className="flex items-center gap-2 pr-4">
          <div className="flex-1">
            <CategoryTabs
              active={activeCategory}
              onChange={setActiveCategory}
            />
          </div>
          {/* Sort button */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowSortMenu((p) => !p)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#1C1C1C] text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              data-ocid="home.sort.button"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {sortMode === "latest" ? "Latest" : "Most Viewed"}
            </button>
            <AnimatePresence>
              {showSortMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 z-20 bg-card border border-border/40 rounded-2xl shadow-xl overflow-hidden w-40"
                  data-ocid="home.sort.dropdown_menu"
                >
                  {(["latest", "most_viewed"] as SortMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setSortMode(mode);
                        setShowSortMenu(false);
                      }}
                      className={`w-full flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-colors ${sortMode === mode ? "text-primary bg-primary/10" : "text-foreground hover:bg-secondary/40"}`}
                      data-ocid={`home.sort.${mode}.button`}
                    >
                      {mode === "latest" ? "Latest" : "Most Viewed"}
                      {sortMode === mode && (
                        <span className="ml-auto text-primary">✓</span>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

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
        onVideoOpen={handleVideoOpenFromNotification}
      />

      {/* Content */}
      <main className="flex-1 overflow-y-auto scrollbar-hide pb-4">
        {isLoading ? (
          <div className="space-y-4 pt-3 px-4" data-ocid="home.loading_state">
            {(["s1", "s2", "s3", "s4"] as const).map((k) => (
              <VideoCardSkeleton key={k} />
            ))}
          </div>
        ) : (
          <>
            {/* Main video feed */}
            <AnimatePresence mode="wait">
              <motion.div
                key={feedKey}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="px-4"
              >
                {displayedVideos.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-center justify-center min-h-[40vh] text-center px-6"
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
                        onCreatorClick={(uploader) =>
                          onCreatorClick?.(uploader.toString())
                        }
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* ─── Homepage Sections ─────────────────────────────────────── */}
            {!searchActive && (
              <div className="px-4 mt-6" data-ocid="home.sections.panel">
                {/* Divider */}
                <div className="h-px bg-border/20 mb-6" />

                {/* Trending */}
                <HomeSectionRow
                  title="Trending"
                  emoji="🔥"
                  videos={trendingVideos}
                  onVideoClick={(post) => setSelectedVideo(post)}
                  animationDelay={0.05}
                />

                {/* Live Now */}
                <HomeSectionRow
                  title="Live Now"
                  emoji="🔴"
                  videos={[]}
                  isLive
                  onVideoClick={(post) => setSelectedVideo(post)}
                  animationDelay={0.1}
                />

                {/* Recommended */}
                <HomeSectionRow
                  title="Recommended"
                  emoji="⭐"
                  videos={recommendedVideos}
                  onVideoClick={(post) => setSelectedVideo(post)}
                  animationDelay={0.15}
                />

                {/* Shorts */}
                <HomeSectionRow
                  title="Shorts"
                  emoji="⚡"
                  videos={shortsVideos}
                  onVideoClick={(post) => setSelectedVideo(post)}
                  animationDelay={0.2}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Video Player Modal */}
      <VideoPlayerModal
        post={selectedVideo}
        open={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        onOpenNext={(nextPost) => setSelectedVideo(nextPost)}
      />
    </div>
  );
}
