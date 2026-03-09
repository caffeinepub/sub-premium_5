/**
 * PublicCreatorProfilePage — full-screen public creator profile
 * accessible from the Home feed. Shows avatar, name, follow/unfollow,
 * battle stats, and a 2-column grid of their uploaded videos.
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import { Principal } from "@icp-sdk/core/principal";
import {
  ArrowLeft,
  Loader2,
  Play,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { VideoPost } from "../backend.d";
import { VideoPlayerModal } from "../components/VideoPlayerModal";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetUsername,
  useGetUsernameByPrincipal,
  useListVideoPosts,
} from "../hooks/useQueries";
import {
  addNotification,
  decrementFollowerCount,
  getFollowerCount,
  incrementFollowerCount,
} from "../utils/notificationStore";

// ─── Avatar gradient (same array as UserProfileModal) ─────────────────────────
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #FF6B6B, #FF2D2D)",
  "linear-gradient(135deg, #4FACFE, #00C6FF)",
  "linear-gradient(135deg, #43E97B, #38F9D7)",
  "linear-gradient(135deg, #FA8231, #F7971E)",
  "linear-gradient(135deg, #A55EEA, #7B2FFF)",
  "linear-gradient(135deg, #FC5C7D, #6A3093)",
  "linear-gradient(135deg, #f7971e, #ffd200)",
  "linear-gradient(135deg, #11998e, #38ef7d)",
];

function avatarGradient(username: string): string {
  const idx = (username.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx] ?? AVATAR_GRADIENTS[0]!;
}

// ─── Battle stats from localStorage ──────────────────────────────────────────
interface BattleStats {
  totalWins: number;
  mvpCount: number;
  currentStreak: number;
}

function loadBattleStats(principalId: string): BattleStats | null {
  try {
    const globalRaw = localStorage.getItem("sp_battle_stats");
    if (globalRaw) return JSON.parse(globalRaw) as BattleStats;
  } catch {
    /* ignore */
  }
  try {
    const userRaw = localStorage.getItem(`battleStats_${principalId}`);
    if (userRaw) return JSON.parse(userRaw) as BattleStats;
  } catch {
    /* ignore */
  }
  return null;
}

// ─── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  emoji,
}: {
  label: string;
  value: number;
  emoji: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl"
      style={{ background: "#161616", border: "1px solid #242424" }}
    >
      <span className="text-base">{emoji}</span>
      <span className="font-black text-lg leading-none text-white">
        {value}
      </span>
      <span
        className="text-[10px] font-medium leading-none text-center"
        style={{ color: "#666" }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── VideoGrid item ────────────────────────────────────────────────────────────
function VideoGridItem({
  post,
  index,
  onClick,
}: {
  post: VideoPost;
  index: number;
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const thumbnailUrl = post.thumbnailBlob.getDirectURL();

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden aspect-video bg-[#161616] w-full group"
      style={{ border: "1px solid #242424" }}
      data-ocid={`creator_profile.videos.item.${index}`}
      aria-label={`Play ${post.title}`}
    >
      {/* Thumbnail */}
      {!imgError ? (
        <img
          src={thumbnailUrl}
          alt={post.title}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
          <Play className="w-8 h-8 text-white/20" />
        </div>
      )}

      {/* Hover play overlay */}
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-10 h-10 rounded-full bg-[#FF2D2D]/90 flex items-center justify-center">
          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
        </div>
      </div>

      {/* Title overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-2 pt-4 pb-2">
        <p className="text-white text-[10px] font-semibold leading-tight line-clamp-2">
          {post.title}
        </p>
      </div>
    </motion.button>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────────
interface PublicCreatorProfilePageProps {
  principalId: string;
  onBack: () => void;
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function PublicCreatorProfilePage({
  principalId,
  onBack,
}: PublicCreatorProfilePageProps) {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const myUserId = identity?.getPrincipal().toString() ?? "";

  // Resolve principal object
  const principal = useMemo(() => {
    try {
      return Principal.fromText(principalId);
    } catch {
      return null;
    }
  }, [principalId]);

  // Fetch username
  const { data: username, isLoading: usernameLoading } =
    useGetUsernameByPrincipal(principal ?? undefined);

  // My own username (for notification message)
  const { data: myUsername } = useGetUsername();

  // Fetch all videos, filter by uploader
  const { data: allVideos, isLoading: videosLoading } = useListVideoPosts();
  const creatorVideos = useMemo(
    () =>
      (allVideos ?? []).filter((v) => v.uploader.toString() === principalId),
    [allVideos, principalId],
  );

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followChecked, setFollowChecked] = useState(false);

  // Follower count from localStorage
  const [followerCount, setFollowerCount] = useState(0);

  // Battle stats
  const [battleStats, setBattleStats] = useState<BattleStats | null>(null);

  // Selected video for player
  const [selectedVideo, setSelectedVideo] = useState<VideoPost | null>(null);

  // Load initial follow state + battle stats + follower count
  useEffect(() => {
    if (!actor || !principal || followChecked) return;
    void (async () => {
      try {
        const [following] = await Promise.all([actor.isFollowing(principal)]);
        setIsFollowing(following);
      } catch {
        /* ignore */
      }
      setFollowChecked(true);
    })();
    setBattleStats(loadBattleStats(principalId));
    setFollowerCount(getFollowerCount(principalId));
  }, [actor, principal, principalId, followChecked]);

  const handleFollowToggle = useCallback(async () => {
    if (!actor || !principal || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await actor.unfollowCreator(principal);
        setIsFollowing(false);
        decrementFollowerCount(principalId);
        setFollowerCount((c) => Math.max(0, c - 1));
        toast.success("Unsubscribed");
      } else {
        await actor.followCreator(principal);
        setIsFollowing(true);
        incrementFollowerCount(principalId);
        setFollowerCount((c) => c + 1);
        toast.success("Subscribed!");

        // Notify the creator about new follower (only if not self)
        if (principalId !== myUserId) {
          const followerName = myUsername ?? myUserId.slice(0, 8);
          addNotification(principalId, {
            type: "follow",
            title: "New Follower",
            message: `@${followerName} started following you.`,
            actorUsername: followerName,
          });
        }
      }
    } catch {
      toast.error("Could not update subscription status");
    } finally {
      setFollowLoading(false);
    }
  }, [
    actor,
    principal,
    isFollowing,
    followLoading,
    principalId,
    myUserId,
    myUsername,
  ]);

  const displayUsername = username ?? `${principalId.slice(0, 8)}…`;
  const gradient = avatarGradient(displayUsername);
  const initial = (displayUsername[0] ?? "?").toUpperCase();
  const isLoading = usernameLoading || videosLoading;

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: "#0f0f0f" }}
      data-ocid="creator_profile.page"
    >
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ background: "#0f0f0f", borderBottom: "1px solid #1a1a1a" }}
      >
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ background: "#1a1a1a" }}
          data-ocid="creator_profile.back_button"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="flex-1 text-center text-base font-bold text-white">
          Creator
        </h1>
        {/* Spacer to balance the back button */}
        <div className="w-9" />
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="pb-8">
          {/* Profile card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center gap-4 px-6 pt-8 pb-6"
          >
            {/* Avatar */}
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center relative"
              style={{
                background: gradient,
                boxShadow: "0 0 0 3px #0f0f0f, 0 0 0 5px #FF2D2D44",
              }}
            >
              <span className="text-white font-black text-5xl">{initial}</span>
            </div>

            {/* Name + username */}
            {usernameLoading ? (
              <div className="flex flex-col items-center gap-2">
                <div
                  className="h-5 w-32 rounded-lg animate-pulse"
                  style={{ background: "#2a2a2a" }}
                />
                <div
                  className="h-4 w-24 rounded-lg animate-pulse"
                  style={{ background: "#1e1e1e" }}
                />
              </div>
            ) : (
              <div className="text-center">
                <p className="text-white font-black text-xl leading-tight">
                  {displayUsername}
                </p>
                <p style={{ color: "#888" }} className="text-sm mt-0.5">
                  @{displayUsername}
                </p>
              </div>
            )}

            {/* Battle badges */}
            {battleStats && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {battleStats.totalWins > 0 && (
                  <span
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{
                      background: "rgba(255,215,0,0.12)",
                      color: "#FFD700",
                      border: "1px solid rgba(255,215,0,0.25)",
                    }}
                  >
                    <Trophy className="w-3 h-3" />
                    {battleStats.totalWins} Wins
                  </span>
                )}
                {battleStats.mvpCount > 0 && (
                  <span
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{
                      background: "rgba(255,215,0,0.12)",
                      color: "#FFD700",
                      border: "1px solid rgba(255,215,0,0.25)",
                    }}
                  >
                    ⭐ MVP ×{battleStats.mvpCount}
                  </span>
                )}
                {battleStats.currentStreak >= 5 && (
                  <span
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{
                      background: "rgba(255,107,0,0.15)",
                      color: "#FF6B00",
                      border: "1px solid rgba(255,107,0,0.3)",
                    }}
                  >
                    <Zap className="w-3 h-3" />
                    Hot Streak
                  </span>
                )}
              </div>
            )}

            {/* Subscribe button */}
            <button
              type="button"
              onClick={() => void handleFollowToggle()}
              disabled={followLoading || !followChecked}
              className="flex items-center justify-center gap-2 px-8 py-2.5 rounded-full text-sm font-bold text-white transition-all active:scale-95"
              style={{
                background: isFollowing ? "transparent" : "#FF2D2D",
                border: isFollowing
                  ? "1.5px solid rgba(255,255,255,0.2)"
                  : "1.5px solid #FF2D2D",
                minWidth: "140px",
              }}
              data-ocid="creator_profile.follow.button"
            >
              {followLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isFollowing ? (
                <>
                  <UserCheck className="w-4 h-4" />
                  Subscribed
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Subscribe
                </>
              )}
            </button>

            {/* Stats row: Videos / Followers */}
            <div className="flex items-center gap-6 mt-2">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-white font-black text-lg leading-none">
                  {creatorVideos.length}
                </span>
                <span
                  className="text-[11px] font-medium"
                  style={{ color: "#666" }}
                >
                  Videos
                </span>
              </div>
              <div className="h-8 w-px" style={{ background: "#242424" }} />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-white font-black text-lg leading-none">
                  {followerCount}
                </span>
                <span
                  className="text-[11px] font-medium"
                  style={{ color: "#666" }}
                >
                  Followers
                </span>
              </div>
              <div className="h-8 w-px" style={{ background: "#242424" }} />
              <div className="flex flex-col items-center gap-0.5">
                <Users className="w-4 h-4 mb-0.5" style={{ color: "#666" }} />
                <span
                  className="text-[11px] font-medium"
                  style={{ color: "#666" }}
                >
                  Subscriptions
                </span>
              </div>
            </div>
          </motion.div>

          {/* Divider */}
          <div style={{ height: 1, background: "#1a1a1a", margin: "0 16px" }} />

          {/* Videos section */}
          <div className="px-4 pt-5">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-white font-bold text-base">Videos</h2>
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#1e1e1e", color: "#888" }}
              >
                {creatorVideos.length}
              </span>
            </div>

            {videosLoading || isLoading ? (
              <div
                className="grid grid-cols-2 gap-3"
                data-ocid="creator_profile.videos.list"
              >
                {[1, 2, 3, 4].map((k) => (
                  <div
                    key={k}
                    className="rounded-2xl aspect-video animate-pulse"
                    style={{ background: "#1a1a1a" }}
                  />
                ))}
              </div>
            ) : creatorVideos.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-14 text-center"
                data-ocid="creator_profile.videos.empty_state"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "#1a1a1a" }}
                >
                  <Play className="w-7 h-7" style={{ color: "#444" }} />
                </div>
                <p className="text-white/60 font-medium text-sm">
                  No videos yet
                </p>
                <p className="text-white/30 text-xs mt-1 max-w-[200px]">
                  This creator hasn't uploaded any videos yet.
                </p>
              </div>
            ) : (
              <div
                className="grid grid-cols-2 gap-3"
                data-ocid="creator_profile.videos.list"
              >
                {creatorVideos.map((post, i) => (
                  <VideoGridItem
                    key={post.id.toString()}
                    post={post}
                    index={i + 1}
                    onClick={() => setSelectedVideo(post)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Battle Stats section (only if stats exist) */}
          {battleStats && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="px-4 pt-6"
              data-ocid="creator_profile.stats.section"
            >
              <div
                style={{ height: 1, background: "#1a1a1a", marginBottom: 20 }}
              />
              <h2 className="text-white font-bold text-base mb-4">
                Battle Stats
              </h2>
              <div className="grid grid-cols-3 gap-2">
                <StatCard
                  label="Total Wins"
                  value={battleStats.totalWins}
                  emoji="🏆"
                />
                <StatCard
                  label="MVP Count"
                  value={battleStats.mvpCount}
                  emoji="⭐"
                />
                <StatCard
                  label="Win Streak"
                  value={battleStats.currentStreak}
                  emoji="🔥"
                />
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Video Player Modal */}
      <VideoPlayerModal
        post={selectedVideo}
        open={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </div>
  );
}
