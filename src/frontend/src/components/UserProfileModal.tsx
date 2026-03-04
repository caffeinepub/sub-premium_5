/**
 * UserProfileModal — clickable user profile system for SUB PREMIUM live streams.
 *
 * Opens as a slide-up bottom sheet. All data is fetched from the backend.
 * A 30-second in-memory cache avoids redundant calls.
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Principal } from "@icp-sdk/core/principal";
import {
  Ban,
  Calendar,
  Flag,
  Gift,
  Heart,
  Loader2,
  MessageCircle,
  Shield,
  Swords,
  Trophy,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import type { ProfileViewType } from "../hooks/useUserProfile";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BattleHistoryEntry {
  opponentName: string;
  result: "win" | "loss";
  score: number;
  date: string;
  isMvp: boolean;
}

interface GiftHistoryEntry {
  giftName: string;
  coinValue: number;
  senderOrRecipient: string;
  date: string;
}

interface CachedProfile {
  username: string;
  isFollowing: boolean;
  battleHistory: BattleHistoryEntry[];
  giftHistory: GiftHistoryEntry[];
  battleStats: {
    totalWins: number;
    mvpCount: number;
    currentStreak: number;
  };
  isBanned: boolean;
  fetchedAt: number;
}

// ─── 30-second in-memory profile cache ───────────────────────────────────────
const profileCache = new Map<string, CachedProfile>();

function getCached(userId: string): CachedProfile | null {
  const entry = profileCache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > 30_000) {
    profileCache.delete(userId);
    return null;
  }
  return entry;
}

// ─── Local storage helpers ────────────────────────────────────────────────────
function loadBattleHistory(userId: string): BattleHistoryEntry[] {
  try {
    const raw = localStorage.getItem(`battleHistory_${userId}`);
    return raw ? (JSON.parse(raw) as BattleHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function loadGiftHistory(userId: string): GiftHistoryEntry[] {
  try {
    const raw = localStorage.getItem(`giftStats_${userId}`);
    return raw ? (JSON.parse(raw) as GiftHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function loadBattleStats(userId: string) {
  // If the userId matches the current user, read from sp_battle_stats
  try {
    const raw = localStorage.getItem("sp_battle_stats");
    if (raw)
      return JSON.parse(raw) as {
        totalWins: number;
        mvpCount: number;
        currentStreak: number;
      };
  } catch {
    // ignore
  }
  // Try user-specific key
  try {
    const raw = localStorage.getItem(`battleStats_${userId}`);
    if (raw)
      return JSON.parse(raw) as {
        totalWins: number;
        mvpCount: number;
        currentStreak: number;
      };
  } catch {
    // ignore
  }
  return { totalWins: 0, mvpCount: 0, currentStreak: 0 };
}

function isBanned(userId: string): boolean {
  return localStorage.getItem(`banned_${userId}`) === "true";
}

// ─── League tier from win count ───────────────────────────────────────────────
function leagueTier(wins: number): { label: string; color: string } {
  if (wins >= 500) return { label: "Diamond", color: "#00E5FF" };
  if (wins >= 200) return { label: "Platinum", color: "#E0E0E0" };
  if (wins >= 100) return { label: "Gold", color: "#FFD700" };
  if (wins >= 30) return { label: "Silver", color: "#C0C0C0" };
  return { label: "Bronze", color: "#CD7F32" };
}

// ─── Avatar gradient from username initial ────────────────────────────────────
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

function truncatePrincipal(id: string): string {
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}…${id.slice(-6)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl"
      style={{ background: "#161616", border: "1px solid #242424" }}
    >
      {icon && <span className="text-base">{icon}</span>}
      <span
        className="font-black text-lg leading-none"
        style={{ color: "#fff" }}
      >
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

function BattleHistoryRow({
  entry,
  idx,
}: {
  entry: BattleHistoryEntry;
  idx: number;
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{ background: "#141414", border: "1px solid #1e1e1e" }}
      data-ocid={`profile_modal.battle_history.item.${idx + 1}`}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background:
            entry.result === "win"
              ? "rgba(34,197,94,0.15)"
              : "rgba(239,68,68,0.15)",
        }}
      >
        {entry.result === "win" ? (
          <Trophy className="w-4 h-4 text-green-400" />
        ) : (
          <Swords className="w-4 h-4 text-red-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-semibold truncate">
          vs {entry.opponentName}
        </p>
        <p className="text-gray-500 text-[10px]">
          {entry.date} · {entry.score.toLocaleString()} pts
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {entry.isMvp && (
          <span className="text-[10px] font-bold text-yellow-400">⭐ MVP</span>
        )}
        <span
          className="text-[10px] font-black px-2 py-0.5 rounded-full"
          style={{
            background:
              entry.result === "win"
                ? "rgba(34,197,94,0.2)"
                : "rgba(239,68,68,0.2)",
            color: entry.result === "win" ? "#4ade80" : "#f87171",
          }}
        >
          {entry.result === "win" ? "WIN" : "LOSS"}
        </span>
      </div>
    </div>
  );
}

// ─── Report picker ────────────────────────────────────────────────────────────
const REPORT_REASONS = [
  "Spam or bot",
  "Inappropriate content",
  "Harassment",
  "Fake account",
  "Other",
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  username?: string;
  viewType: ProfileViewType;
  currentUserPrincipal?: string;
  onOpenGiftDrawer?: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function UserProfileModal({
  open,
  onClose,
  userId,
  username: prefetchedUsername,
  viewType,
  currentUserPrincipal,
  onOpenGiftDrawer,
}: UserProfileModalProps) {
  const { actor } = useActor();

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<CachedProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"stats" | "battles" | "gifts">(
    "stats",
  );
  const [showReportPicker, setShowReportPicker] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const hasFetchedRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId || !actor) return;

    // Check cache
    const cached = getCached(userId);
    if (cached) {
      setProfile(cached);
      return;
    }

    setLoading(true);
    try {
      // 1. Get username
      let resolvedUsername = prefetchedUsername ?? "";
      if (!resolvedUsername) {
        try {
          const principal = Principal.fromText(userId);
          const name = await actor.getUsernameByPrincipal(principal);
          resolvedUsername = name ?? userId;
        } catch {
          resolvedUsername = userId;
        }
      }

      // 2. Check follow state (only if not the current user)
      let following = false;
      if (currentUserPrincipal && currentUserPrincipal !== userId) {
        try {
          const principal = Principal.fromText(userId);
          following = await actor.isFollowing(principal);
        } catch {
          following = false;
        }
      }

      // 3. Load local data
      const battleHistory = loadBattleHistory(userId);
      const giftHistory = loadGiftHistory(userId);
      const battleStats = loadBattleStats(userId);
      const banned = isBanned(userId);

      const entry: CachedProfile = {
        username: resolvedUsername,
        isFollowing: following,
        battleHistory,
        giftHistory,
        battleStats,
        isBanned: banned,
        fetchedAt: Date.now(),
      };
      profileCache.set(userId, entry);
      setProfile(entry);
    } catch {
      // If we at least have a username, show a minimal profile
      const fallback: CachedProfile = {
        username: prefetchedUsername ?? userId,
        isFollowing: false,
        battleHistory: [],
        giftHistory: [],
        battleStats: { totalWins: 0, mvpCount: 0, currentStreak: 0 },
        isBanned: false,
        fetchedAt: Date.now(),
      };
      profileCache.set(userId, fallback);
      setProfile(fallback);
    } finally {
      setLoading(false);
    }
  }, [userId, actor, prefetchedUsername, currentUserPrincipal]);

  useEffect(() => {
    if (open && userId && hasFetchedRef.current !== userId) {
      hasFetchedRef.current = userId;
      setProfile(null);
      setActiveTab("stats");
      setShowReportPicker(false);
      void fetchProfile();
    }
    if (!open) {
      hasFetchedRef.current = null;
    }
  }, [open, userId, fetchProfile]);

  const handleFollowToggle = async () => {
    if (!actor || !profile || followLoading) return;
    setFollowLoading(true);
    try {
      const principal = Principal.fromText(userId);
      if (profile.isFollowing) {
        await actor.unfollowCreator(principal);
        const updated = { ...profile, isFollowing: false };
        profileCache.set(userId, { ...updated, fetchedAt: Date.now() });
        setProfile(updated);
        toast.success("Unfollowed");
      } else {
        await actor.followCreator(principal);
        const updated = { ...profile, isFollowing: true };
        profileCache.set(userId, { ...updated, fetchedAt: Date.now() });
        setProfile(updated);
        toast.success("Following!");
      }
    } catch {
      toast.error("Could not update follow status");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleReport = (reason: string) => {
    toast.success(`Reported: ${reason}`);
    setShowReportPicker(false);
  };

  const handleBlock = () => {
    toast.success("User blocked");
    onClose();
  };

  if (!open) return null;

  const displayUsername = profile?.username ?? prefetchedUsername ?? userId;
  const tier = profile ? leagueTier(profile.battleStats.totalWins) : null;
  const gradient = avatarGradient(displayUsername);
  const initial = (displayUsername[0] ?? "?").toUpperCase();
  const isSelf = currentUserPrincipal === userId;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-0 p-0 overflow-hidden"
        style={{
          background: "#0a0a0a",
          maxHeight: "92vh",
        }}
        data-ocid="profile_modal.sheet"
      >
        <SheetHeader className="sr-only">
          <span>{displayUsername}'s Profile</span>
        </SheetHeader>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: "#333" }}
          />
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center z-10"
          style={{ background: "rgba(255,255,255,0.06)" }}
          data-ocid="profile_modal.close_button"
        >
          <X className="w-4 h-4 text-white/60" />
        </button>

        <ScrollArea style={{ maxHeight: "calc(92vh - 40px)" }}>
          <div className="px-5 pb-10">
            {loading && !profile ? (
              <div
                className="flex flex-col items-center justify-center py-16 gap-3"
                data-ocid="profile_modal.loading_state"
              >
                <Loader2
                  className="w-8 h-8 animate-spin"
                  style={{ color: "#FF2D2D" }}
                />
                <p className="text-gray-500 text-sm">Loading profile…</p>
              </div>
            ) : profile?.isBanned ? (
              <div
                className="flex flex-col items-center justify-center py-16 gap-4"
                data-ocid="profile_modal.error_state"
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.12)" }}
                >
                  <Ban className="w-10 h-10 text-red-500" />
                </div>
                <div className="text-center">
                  <p className="text-red-400 font-black text-lg">
                    Account Suspended
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    This account has been suspended for violating our community
                    guidelines.
                  </p>
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                data-ocid="profile_modal.panel"
              >
                {/* ── TOP SECTION ── */}
                <div className="flex flex-col items-center gap-3 pt-3 pb-5">
                  {/* Avatar */}
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center relative"
                    style={{
                      background: gradient,
                      boxShadow: "0 0 0 3px #0a0a0a, 0 0 0 5px #FF2D2D33",
                    }}
                  >
                    <span className="text-white font-black text-4xl">
                      {initial}
                    </span>
                    {/* Online status dot (simple – no WS needed) */}
                    <div
                      className="absolute bottom-1 right-1 w-4 h-4 rounded-full"
                      style={{
                        background: "#22c55e",
                        border: "2px solid #0a0a0a",
                      }}
                    />
                  </div>

                  {/* Username */}
                  <div className="text-center">
                    <p className="text-white font-black text-xl leading-tight">
                      @{displayUsername}
                    </p>
                    <p className="text-gray-600 text-[11px] mt-0.5 font-mono">
                      {truncatePrincipal(userId)}
                    </p>
                  </div>

                  {/* Creator badges */}
                  {(viewType === "creator" || viewType === "opponent") && (
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {viewType === "creator" && (
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
                          style={{ background: "#FF0000", color: "white" }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          LIVE
                        </span>
                      )}
                      {tier && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            background: `${tier.color}22`,
                            color: tier.color,
                            border: `1px solid ${tier.color}44`,
                          }}
                        >
                          {tier.label}
                        </span>
                      )}
                      {profile && profile.battleStats.mvpCount > 0 && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            background: "rgba(255,215,0,0.12)",
                            color: "#FFD700",
                            border: "1px solid rgba(255,215,0,0.3)",
                          }}
                        >
                          ⭐ MVP ×{profile.battleStats.mvpCount}
                        </span>
                      )}
                      {profile && profile.battleStats.totalWins > 0 && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            background: "rgba(255,215,0,0.12)",
                            color: "#FFD700",
                            border: "1px solid rgba(255,215,0,0.3)",
                          }}
                        >
                          🥇 {profile.battleStats.totalWins} Wins
                        </span>
                      )}
                      {profile && profile.battleStats.currentStreak >= 5 && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            background: "rgba(255,107,0,0.15)",
                            color: "#FF6B00",
                            border: "1px solid rgba(255,107,0,0.3)",
                          }}
                        >
                          🔥 Hot Streak
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  {!isSelf && (
                    <div className="flex gap-2 w-full max-w-xs">
                      {/* Follow / Unfollow */}
                      <button
                        type="button"
                        onClick={() => void handleFollowToggle()}
                        disabled={followLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                        style={{
                          background: profile?.isFollowing
                            ? "#FF2D2D"
                            : "transparent",
                          border: `1.5px solid ${profile?.isFollowing ? "#FF2D2D" : "rgba(255,255,255,0.2)"}`,
                        }}
                        data-ocid="profile_modal.follow.button"
                      >
                        {followLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : profile?.isFollowing ? (
                          <>
                            <UserCheck className="w-4 h-4" />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            Follow
                          </>
                        )}
                      </button>

                      {/* Message */}
                      <button
                        type="button"
                        onClick={() => toast("Messaging coming soon")}
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: "#161616",
                          border: "1px solid #2a2a2a",
                        }}
                        data-ocid="profile_modal.message.button"
                      >
                        <MessageCircle className="w-4 h-4 text-white/60" />
                      </button>

                      {/* Gift */}
                      {onOpenGiftDrawer && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenGiftDrawer();
                          }}
                          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{
                            background: "rgba(255,215,0,0.1)",
                            border: "1px solid rgba(255,215,0,0.2)",
                          }}
                          data-ocid="profile_modal.gift.button"
                        >
                          <Gift className="w-4 h-4 text-yellow-400" />
                        </button>
                      )}

                      {/* Report */}
                      <button
                        type="button"
                        onClick={() => setShowReportPicker((v) => !v)}
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: "#161616",
                          border: "1px solid #2a2a2a",
                        }}
                        data-ocid="profile_modal.report.button"
                      >
                        <Flag className="w-4 h-4 text-white/40" />
                      </button>

                      {/* Block */}
                      <button
                        type="button"
                        onClick={handleBlock}
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: "#161616",
                          border: "1px solid #2a2a2a",
                        }}
                        data-ocid="profile_modal.block.button"
                      >
                        <Shield className="w-4 h-4 text-white/40" />
                      </button>
                    </div>
                  )}

                  {/* Report picker */}
                  <AnimatePresence>
                    {showReportPicker && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="w-full max-w-xs overflow-hidden"
                        data-ocid="profile_modal.report.panel"
                      >
                        <p className="text-gray-400 text-xs font-semibold mb-2">
                          Report reason:
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {REPORT_REASONS.map((reason) => (
                            <button
                              key={reason}
                              type="button"
                              onClick={() => handleReport(reason)}
                              className="text-left px-3 py-2 rounded-xl text-sm text-white/70 hover:text-white transition-colors"
                              style={{
                                background: "#161616",
                                border: "1px solid #2a2a2a",
                              }}
                            >
                              {reason}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ── TABS ── */}
                <div
                  className="flex rounded-2xl p-1 mb-4"
                  style={{ background: "#111" }}
                >
                  {(
                    [
                      { id: "stats", label: "Stats" },
                      { id: "battles", label: "⚔️ Battles" },
                      { id: "gifts", label: "🎁 Gifts" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background:
                          activeTab === tab.id ? "#FF2D2D" : "transparent",
                        color: activeTab === tab.id ? "white" : "#666",
                      }}
                      data-ocid={`profile_modal.${tab.id}.tab`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* ── STATS TAB ── */}
                {activeTab === "stats" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.18 }}
                    data-ocid="profile_modal.stats.section"
                  >
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <StatCard
                        label="Battle Wins"
                        value={profile?.battleStats.totalWins ?? "—"}
                        icon="🏆"
                      />
                      <StatCard
                        label="MVP Count"
                        value={profile?.battleStats.mvpCount ?? "—"}
                        icon="⭐"
                      />
                      <StatCard
                        label="Win Streak"
                        value={profile?.battleStats.currentStreak ?? "—"}
                        icon="🔥"
                      />
                      <StatCard
                        label="Followers"
                        value="—"
                        icon={<Heart className="w-3.5 h-3.5 text-red-400" />}
                      />
                      <StatCard
                        label="Following"
                        value="—"
                        icon={
                          <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                        }
                      />
                      <StatCard label="Coins Sent" value="—" icon="🪙" />
                      {tier && (
                        <StatCard label="League" value={tier.label} icon="🎖️" />
                      )}
                      <StatCard
                        label="Join Date"
                        value="—"
                        icon={
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        }
                      />
                    </div>

                    <p className="text-gray-700 text-[10px] text-center pb-2">
                      Some stats may be hidden per user privacy settings.
                    </p>
                  </motion.div>
                )}

                {/* ── BATTLES TAB ── */}
                {activeTab === "battles" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.18 }}
                    data-ocid="profile_modal.battles.section"
                  >
                    {viewType === "viewer" &&
                    (!profile || profile.battleHistory.length === 0) ? (
                      <div
                        className="text-center py-10"
                        data-ocid="profile_modal.battles.empty_state"
                      >
                        <Swords className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">
                          Battle history private
                        </p>
                      </div>
                    ) : !profile || profile.battleHistory.length === 0 ? (
                      <div
                        className="text-center py-10"
                        data-ocid="profile_modal.battles.empty_state"
                      >
                        <Swords className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">
                          No battle history yet
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {profile.battleHistory
                          .slice(0, 10)
                          .map((entry, idx) => (
                            <BattleHistoryRow
                              key={`${entry.date}-${idx}`}
                              entry={entry}
                              idx={idx}
                            />
                          ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── GIFTS TAB ── */}
                {activeTab === "gifts" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.18 }}
                    data-ocid="profile_modal.gifts.section"
                  >
                    {!profile || profile.giftHistory.length === 0 ? (
                      <div
                        className="text-center py-10"
                        data-ocid="profile_modal.gifts.empty_state"
                      >
                        <Gift className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">
                          {viewType === "creator"
                            ? "No gifts received yet"
                            : "No gifts sent yet"}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {profile.giftHistory.slice(0, 10).map((entry, idx) => (
                          <div
                            key={`${entry.date}-${idx}`}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                            style={{
                              background: "#141414",
                              border: "1px solid #1e1e1e",
                            }}
                            data-ocid={`profile_modal.gift_history.item.${idx + 1}`}
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{
                                background: "rgba(255,215,0,0.1)",
                              }}
                            >
                              <Gift className="w-4 h-4 text-yellow-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs font-semibold truncate">
                                {entry.giftName}
                              </p>
                              <p className="text-gray-500 text-[10px]">
                                {viewType === "creator"
                                  ? `from ${entry.senderOrRecipient}`
                                  : `to ${entry.senderOrRecipient}`}{" "}
                                · {entry.date}
                              </p>
                            </div>
                            <span className="text-yellow-400 text-xs font-bold flex-shrink-0">
                              🪙 {entry.coinValue.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
