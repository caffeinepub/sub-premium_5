import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Principal } from "@icp-sdk/core/principal";
import {
  Heart,
  Loader2,
  MessageCircle,
  Share2,
  UserPlus,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { VideoPost } from "../backend.d";
import {
  useFollowCreator,
  useGetSubscriptions,
  useListVideoPosts,
} from "../hooks/useQueries";

// ─── Floating Action Button ───────────────────────────────────────────────────

function FloatingActionBtn({
  icon: Icon,
  label,
  onClick,
  active = false,
  activeColor = "#FF2D2D",
  ocid,
}: {
  icon: React.ComponentType<
    React.SVGProps<SVGSVGElement> & { strokeWidth?: number }
  >;
  label: string | number;
  onClick: () => void;
  active?: boolean;
  activeColor?: string;
  ocid: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 group focus-visible:outline-none"
      data-ocid={ocid}
      aria-label={typeof label === "string" ? label : undefined}
    >
      <motion.div
        whileTap={{ scale: 0.85 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="w-11 h-11 rounded-full flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.5)" }}
      >
        <Icon
          className="w-5 h-5 transition-colors duration-200"
          style={{ color: active ? activeColor : "white" }}
          strokeWidth={active ? 2.5 : 2}
        />
      </motion.div>
      <span
        className="text-[10px] font-semibold drop-shadow-md"
        style={{
          color: "rgba(255,255,255,0.9)",
          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
        }}
      >
        {label}
      </span>
    </button>
  );
}

// ─── Single Short Video ────────────────────────────────────────────────────────

function ShortVideo({
  video,
  isActive,
  subscriptions,
  onSubscribe,
}: {
  video: VideoPost;
  isActive: boolean;
  subscriptions: Principal[];
  onSubscribe: (creator: Principal) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(
    Math.floor(Math.random() * 9800 + 200),
  );
  const [commentOpen, setCommentOpen] = useState(false);

  const isFollowing = subscriptions.some(
    (p) => p.toString() === video.uploader.toString(),
  );

  // Play/pause based on whether this slide is active
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
      el.play().catch(() => {});
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [isActive]);

  const handleLike = () => {
    setLiked((prev) => {
      setLikeCount((c) => (prev ? c - 1 : c + 1));
      return !prev;
    });
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title, url });
      } catch {
        // user dismissed
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      } catch {
        toast.error("Could not copy link");
      }
    }
  };

  const handleSubscribe = () => {
    if (!isFollowing) {
      onSubscribe(video.uploader);
    } else {
      toast("Already following this creator");
    }
  };

  const videoUrl = video.videoBlob.getDirectURL();

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      {/* Video */}
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay={isActive}
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        aria-label={video.title}
      />

      {/* Dark gradient overlays */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 40%, transparent 70%, rgba(0,0,0,0.3) 100%)",
        }}
      />

      {/* Floating action buttons — right side */}
      <div className="absolute right-3 bottom-28 flex flex-col gap-4 items-center z-10">
        <FloatingActionBtn
          icon={Heart}
          label={
            likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}K` : likeCount
          }
          onClick={handleLike}
          active={liked}
          activeColor="#FF2D2D"
          ocid="shorts.like.button"
        />
        <FloatingActionBtn
          icon={MessageCircle}
          label="Comment"
          onClick={() => setCommentOpen(true)}
          ocid="shorts.comment.button"
        />
        <FloatingActionBtn
          icon={Share2}
          label="Share"
          onClick={() => void handleShare()}
          ocid="shorts.share.button"
        />
        <FloatingActionBtn
          icon={UserPlus}
          label={isFollowing ? "Following" : "Subscribe"}
          onClick={handleSubscribe}
          active={isFollowing}
          activeColor="#FF2D2D"
          ocid="shorts.subscribe.button"
        />
      </div>

      {/* Bottom-left: title + uploader */}
      <div className="absolute bottom-24 left-4 right-20 z-10">
        <p className="text-white font-bold text-sm leading-snug line-clamp-2 drop-shadow-lg mb-1">
          {video.title}
        </p>
        <p
          className="text-xs font-semibold"
          style={{
            color: "rgba(255,255,255,0.75)",
            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          }}
        >
          @{video.uploader.toString().slice(0, 10)}…
        </p>
      </div>

      {/* Comment Sheet */}
      <Sheet
        open={commentOpen}
        onOpenChange={(o) => !o && setCommentOpen(false)}
      >
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-border/20 p-0"
          style={{ background: "#161616" }}
        >
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/20">
            <SheetTitle className="text-sm font-bold text-foreground text-left">
              Comments
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <MessageCircle
              className="w-10 h-10 text-muted-foreground mb-3"
              strokeWidth={1.5}
            />
            <p className="text-sm font-semibold text-foreground mb-1">
              Comments coming soon
            </p>
            <p className="text-xs text-muted-foreground">
              We're working on bringing comments to Shorts.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── ShortsPage ───────────────────────────────────────────────────────────────

export default function ShortsPage() {
  const { data: videos, isLoading } = useListVideoPosts();
  const { data: subscriptions = [] } = useGetSubscriptions();
  const followCreator = useFollowCreator();

  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const isAnimating = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const goNext = useCallback((total: number) => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setCurrentIndex((i) => Math.min(i + 1, total - 1));
    setTimeout(() => {
      isAnimating.current = false;
    }, 350);
  }, []);

  const goPrev = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setCurrentIndex((i) => Math.max(i - 1, 0));
    setTimeout(() => {
      isAnimating.current = false;
    }, 350);
  }, []);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchEndY.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (total: number) => {
    if (touchStartY.current === null || touchEndY.current === null) return;
    const delta = touchStartY.current - touchEndY.current;
    if (delta > 50) goNext(total);
    else if (delta < -50) goPrev();
    touchStartY.current = null;
    touchEndY.current = null;
  };

  // Mouse wheel handler (desktop)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !videos) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 30) goNext(videos.length);
      else if (e.deltaY < -30) goPrev();
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [videos, goNext, goPrev]);

  const handleSubscribe = async (creator: Principal) => {
    try {
      await followCreator.mutateAsync(creator);
      toast.success("Subscribed!");
    } catch {
      toast.error("Could not subscribe");
    }
  };

  if (isLoading) {
    return (
      <div
        className="h-full flex items-center justify-center bg-black"
        data-ocid="shorts.page"
      >
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: "#FF2D2D" }}
        />
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center bg-black text-center px-8"
        data-ocid="shorts.page"
      >
        <div
          data-ocid="shorts.empty_state"
          className="flex flex-col items-center"
        >
          <Zap
            className="w-12 h-12 mb-4"
            style={{ color: "rgba(255,255,255,0.3)" }}
            strokeWidth={1.5}
          />
          <p className="text-lg font-bold text-white mb-2">
            No shorts available yet
          </p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            Upload videos to see them appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-black select-none"
      data-ocid="shorts.page"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => handleTouchEnd(videos.length)}
      style={{ touchAction: "none" }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentIndex}
          initial={{ y: "100%", opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0.5 }}
          transition={{ type: "tween", duration: 0.28, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <ShortVideo
            video={videos[currentIndex]}
            isActive={true}
            subscriptions={subscriptions}
            onSubscribe={(creator) => void handleSubscribe(creator)}
          />
        </motion.div>
      </AnimatePresence>

      {/* Progress dots on right edge */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-20 pointer-events-none">
        {videos.slice(0, Math.min(videos.length, 8)).map((video, i) => (
          <div
            key={video.id.toString()}
            className="w-1 rounded-full transition-all duration-200"
            style={{
              height: currentIndex === i ? "16px" : "4px",
              background:
                currentIndex === i ? "#FF2D2D" : "rgba(255,255,255,0.3)",
            }}
          />
        ))}
        {videos.length > 8 && (
          <div
            className="w-1 h-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.2)" }}
          />
        )}
      </div>

      {/* Swipe hint on first load */}
      {currentIndex === 0 && videos.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 1.5, duration: 0.4 }}
          className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-1"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: 3, duration: 0.8, ease: "easeInOut" }}
          >
            <div className="w-6 h-9 rounded-full border-2 border-white/50 flex items-start justify-center pt-1.5">
              <div className="w-1 h-2 rounded-full bg-white/70" />
            </div>
          </motion.div>
          <p className="text-[10px] text-white/60 font-medium">Swipe up</p>
        </motion.div>
      )}
    </div>
  );
}
