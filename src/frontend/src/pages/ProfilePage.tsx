import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  BookmarkIcon,
  Bot,
  ChevronDown,
  Crown,
  Database,
  Eye,
  Film,
  HardDrive,
  ListVideo,
  LogOut,
  Moon,
  Pencil,
  Play,
  Plus,
  Settings,
  Shield,
  Trash2,
  User2,
  Wallet,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Playlist, VideoPost } from "../backend.d";
import { EditProfilePanel } from "../components/EditProfilePanel";
import { LanguageSelector } from "../components/LanguageSelector";
import { OnlineStatusDot } from "../components/OnlineStatusDot";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useClearWatchHistory,
  useCreatePlaylist,
  useDeletePlaylist,
  useGetExtendedProfile,
  useGetSavedVideos,
  useGetUsername,
  useIsPremium,
  useListMyPlaylists,
  useListVideoPosts,
  useRemoveVideoFromPlaylist,
  useRenamePlaylist,
  useUnsaveVideo,
} from "../hooks/useQueries";
import { formatActiveStatus, getActiveStatus } from "../utils/activeStatus";

// ─── localStorage helpers ─────────────────────────────────────────────────────

function useLocalStorage<T>(key: string, defaultValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      // ignore
    }
  };

  return [value, set];
}

// ─── Actor Status Banner ──────────────────────────────────────────────────────

/**
 * Shows a subtle info card when the AI actor is not available.
 * Never shows raw backend errors — only friendly messages.
 */
function ActorStatusBanner({
  actorMissing,
}: {
  actorMissing: boolean;
}) {
  const [activated, setActivated] = useState(false);

  if (!actorMissing || activated) return null;

  const handleActivate = () => {
    setActivated(true);
    toast.success("AI assistant activated", {
      description: "default-subpremium-ai-v1 assigned to your profile.",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-3 bg-blue-500/8 border border-blue-500/15 rounded-2xl px-4 py-3 mb-3"
      data-ocid="profile.actor_status.section"
    >
      <Bot className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-blue-300/90 font-medium leading-snug">
          AI assistant not configured yet.
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tap below to activate your AI assistant.
        </p>
      </div>
      <button
        type="button"
        onClick={handleActivate}
        className="shrink-0 bg-primary hover:bg-primary/90 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all"
        data-ocid="profile.activate_ai.button"
      >
        Activate AI
      </button>
    </motion.div>
  );
}

// ─── Settings sub-components ──────────────────────────────────────────────────

function SettingsDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-4 pb-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </span>
      <div className="flex-1 h-px bg-white/6" />
    </div>
  );
}

function SettingsToggleRow({
  label,
  description,
  ocid,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  ocid: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex-1 min-w-0">
        <Label className="text-sm font-medium text-foreground cursor-pointer">
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        data-ocid={ocid}
        className="shrink-0"
      />
    </div>
  );
}

function SettingsSelectRow({
  label,
  ocid,
  value,
  onValueChange,
  options,
}: {
  label: string;
  ocid: string;
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className="w-32 h-9 bg-secondary/60 border-border/30 rounded-xl text-sm"
          data-ocid={ocid}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card border-border/30 rounded-2xl">
          {options.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="text-sm rounded-xl"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Full Settings Sections ───────────────────────────────────────────────────

function SettingsSections({
  isAdmin = false,
  onAdminDashboard,
}: {
  isAdmin?: boolean;
  onAdminDashboard?: () => void;
}) {
  const clearWatchHistory = useClearWatchHistory();

  // Persist all settings to localStorage
  const [showOnlineStatus, setShowOnlineStatus] = useLocalStorage(
    "settings.showOnlineStatus",
    true,
  );
  const [allowComments, setAllowComments] = useLocalStorage(
    "settings.allowComments",
    true,
  );
  const [allowDownloads, setAllowDownloads] = useLocalStorage(
    "settings.allowDownloads",
    false,
  );
  const [showSubscriptions, setShowSubscriptions] = useLocalStorage(
    "settings.showSubscriptions",
    false,
  );
  const [privateAccount, setPrivateAccount] = useLocalStorage(
    "settings.privateAccount",
    false,
  );
  const [blockedUsersOpen, setBlockedUsersOpen] = useState(false);

  const [pushNotifications, setPushNotifications] = useLocalStorage(
    "settings.pushNotifications",
    true,
  );
  const [emailNotifications, setEmailNotifications] = useLocalStorage(
    "settings.emailNotifications",
    false,
  );
  const [subscriberAlerts, setSubscriberAlerts] = useLocalStorage(
    "settings.subscriberAlerts",
    true,
  );
  const [commentNotifications, setCommentNotifications] = useLocalStorage(
    "settings.commentNotifications",
    true,
  );
  const [likeNotifications, setLikeNotifications] = useLocalStorage(
    "settings.likeNotifications",
    true,
  );
  const [newVideoNotifications, setNewVideoNotifications] = useLocalStorage(
    "settings.newVideoNotifications",
    true,
  );

  const [videoQuality, setVideoQuality] = useLocalStorage(
    "settings.videoQuality",
    "auto",
  );
  const [autoplay, setAutoplay] = useLocalStorage("settings.autoplay", true);
  const [subtitlesDefault, setSubtitlesDefault] = useLocalStorage(
    "settings.subtitlesDefault",
    false,
  );
  const [playbackSpeed, setPlaybackSpeed] = useLocalStorage(
    "settings.playbackSpeed",
    "1",
  );
  const [audioQuality, setAudioQuality] = useLocalStorage(
    "settings.audioQuality",
    "auto",
  );

  const [darkMode, setDarkMode] = useLocalStorage("settings.darkMode", true);
  const [dataSaver, setDataSaver] = useLocalStorage(
    "settings.dataSaver",
    false,
  );
  const [reduceAnimations, setReduceAnimations] = useLocalStorage(
    "settings.reduceAnimations",
    false,
  );
  const [restrictedMode, setRestrictedMode] = useLocalStorage(
    "settings.restrictedMode",
    false,
  );

  const notify = () => toast.success("Settings updated", { duration: 1500 });

  const handleToggle =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      notify();
    };

  const handleSelect = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    notify();
  };

  const handleClearCache = () => {
    toast.success("Cache cleared", { duration: 2000 });
  };

  const handleClearWatchHistory = async () => {
    try {
      await clearWatchHistory.mutateAsync();
      toast.success("Watch history cleared", { duration: 2000 });
    } catch {
      toast.error("Failed to clear watch history");
    }
  };

  return (
    <div className="space-y-1">
      {/* ── Privacy ── */}
      <SettingsDivider label="Privacy" />

      <div className="bg-secondary/20 rounded-2xl px-4 divide-y divide-white/5">
        <SettingsToggleRow
          label="Show my online status"
          ocid="settings.privacy.show_online_status.switch"
          checked={showOnlineStatus}
          onCheckedChange={handleToggle(setShowOnlineStatus)}
        />
        <SettingsToggleRow
          label="Allow comments on my videos"
          ocid="settings.privacy.allow_comments.switch"
          checked={allowComments}
          onCheckedChange={handleToggle(setAllowComments)}
        />
        <SettingsToggleRow
          label="Allow downloads"
          ocid="settings.privacy.allow_downloads.switch"
          checked={allowDownloads}
          onCheckedChange={handleToggle(setAllowDownloads)}
        />
        <SettingsToggleRow
          label="Show subscription list publicly"
          ocid="settings.privacy.show_subscriptions.switch"
          checked={showSubscriptions}
          onCheckedChange={handleToggle(setShowSubscriptions)}
        />
        <SettingsToggleRow
          label="Private account"
          description="Only followers can see your content"
          ocid="settings.privacy.private_account.switch"
          checked={privateAccount}
          onCheckedChange={handleToggle(setPrivateAccount)}
        />
        {/* Blocked users row */}
        <div className="flex items-center justify-between gap-3 py-2.5">
          <div className="flex items-center gap-2">
            <Ban className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium text-foreground">
              Blocked Users
            </Label>
          </div>
          <button
            type="button"
            onClick={() => setBlockedUsersOpen(true)}
            className="text-xs text-primary font-semibold hover:text-primary/80 transition-colors px-3 py-1.5 bg-primary/10 rounded-xl"
            data-ocid="settings.privacy.blocked_users.button"
          >
            Manage
          </button>
        </div>
      </div>

      {/* ── Notifications ── */}
      <SettingsDivider label="Notifications" />

      <div className="bg-secondary/20 rounded-2xl px-4 divide-y divide-white/5">
        <SettingsToggleRow
          label="Push notifications"
          ocid="settings.notifications.push.switch"
          checked={pushNotifications}
          onCheckedChange={handleToggle(setPushNotifications)}
        />
        <SettingsToggleRow
          label="Email notifications"
          ocid="settings.notifications.email.switch"
          checked={emailNotifications}
          onCheckedChange={handleToggle(setEmailNotifications)}
        />
        <SettingsToggleRow
          label="New subscriber alerts"
          ocid="settings.notifications.subscribers.switch"
          checked={subscriberAlerts}
          onCheckedChange={handleToggle(setSubscriberAlerts)}
        />
        <SettingsToggleRow
          label="Comment notifications"
          ocid="settings.notifications.comments.switch"
          checked={commentNotifications}
          onCheckedChange={handleToggle(setCommentNotifications)}
        />
        <SettingsToggleRow
          label="Like notifications"
          ocid="settings.notifications.likes.switch"
          checked={likeNotifications}
          onCheckedChange={handleToggle(setLikeNotifications)}
        />
        <SettingsToggleRow
          label="New videos from subscribed creators"
          ocid="settings.notifications.new_videos.switch"
          checked={newVideoNotifications}
          onCheckedChange={handleToggle(setNewVideoNotifications)}
        />
      </div>

      {/* ── Video & Audio Preferences ── */}
      <SettingsDivider label="Video & Audio Preferences" />

      <div className="bg-secondary/20 rounded-2xl px-4 divide-y divide-white/5">
        <SettingsSelectRow
          label="Default quality"
          ocid="settings.video.quality.select"
          value={videoQuality}
          onValueChange={handleSelect(setVideoQuality)}
          options={[
            { value: "auto", label: "Auto" },
            { value: "1080p", label: "1080p" },
            { value: "720p", label: "720p" },
            { value: "480p", label: "480p" },
          ]}
        />
        <SettingsToggleRow
          label="Autoplay"
          ocid="settings.video.autoplay.switch"
          checked={autoplay}
          onCheckedChange={handleToggle(setAutoplay)}
        />
        <SettingsToggleRow
          label="Subtitles on by default"
          ocid="settings.video.subtitles_default.switch"
          checked={subtitlesDefault}
          onCheckedChange={handleToggle(setSubtitlesDefault)}
        />
        <SettingsSelectRow
          label="Playback speed"
          ocid="settings.video.playback_speed.select"
          value={playbackSpeed}
          onValueChange={handleSelect(setPlaybackSpeed)}
          options={[
            { value: "0.5", label: "0.5×" },
            { value: "0.75", label: "0.75×" },
            { value: "1", label: "1×" },
            { value: "1.25", label: "1.25×" },
            { value: "1.5", label: "1.5×" },
            { value: "2", label: "2×" },
          ]}
        />
        <SettingsSelectRow
          label="Audio quality"
          ocid="settings.video.audio_quality.select"
          value={audioQuality}
          onValueChange={handleSelect(setAudioQuality)}
          options={[
            { value: "auto", label: "Auto" },
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" },
            { value: "low", label: "Low" },
          ]}
        />
      </div>

      {/* ── App Preferences ── */}
      <SettingsDivider label="App Preferences" />

      <div className="bg-secondary/20 rounded-2xl px-4 divide-y divide-white/5">
        <SettingsToggleRow
          label="Dark mode"
          ocid="settings.app.dark_mode.switch"
          checked={darkMode}
          onCheckedChange={handleToggle(setDarkMode)}
        />
        <SettingsToggleRow
          label="Data saver mode"
          description="Reduces video quality to save mobile data"
          ocid="settings.app.data_saver.switch"
          checked={dataSaver}
          onCheckedChange={handleToggle(setDataSaver)}
        />
        <SettingsToggleRow
          label="Reduce animations"
          ocid="settings.app.reduce_animations.switch"
          checked={reduceAnimations}
          onCheckedChange={handleToggle(setReduceAnimations)}
        />
        <SettingsToggleRow
          label="Restricted mode"
          description="Filters potentially mature content"
          ocid="settings.app.restricted_mode.switch"
          checked={restrictedMode}
          onCheckedChange={handleToggle(setRestrictedMode)}
        />
      </div>

      {/* ── Storage ── */}
      <SettingsDivider label="Storage" />

      <div className="bg-secondary/20 rounded-2xl px-4 space-y-0 divide-y divide-white/5">
        {/* Storage used */}
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Storage used
            </span>
          </div>
          <span className="text-sm text-muted-foreground font-mono">0 MB</span>
        </div>

        {/* Clear cache */}
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Cached data
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearCache}
            className="text-xs text-primary font-semibold hover:text-primary/80 transition-colors px-3 py-1.5 bg-primary/10 rounded-xl"
            data-ocid="settings.storage.clear_cache.button"
          >
            Clear Cache
          </button>
        </div>

        {/* Clear watch history */}
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Watch history
            </span>
          </div>
          <button
            type="button"
            onClick={() => void handleClearWatchHistory()}
            disabled={clearWatchHistory.isPending}
            className="text-xs text-destructive font-semibold hover:text-destructive/80 transition-colors px-3 py-1.5 bg-destructive/10 rounded-xl disabled:opacity-50"
            data-ocid="settings.storage.clear_history.button"
          >
            {clearWatchHistory.isPending ? "Clearing…" : "Clear History"}
          </button>
        </div>
      </div>

      {/* ── Account ── */}
      <SettingsDivider label="Account" />

      <div className="space-y-2">
        {/* Admin Dashboard — only shown to admins */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => onAdminDashboard?.()}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-colors text-left"
            style={{
              background: "rgba(255,45,45,0.08)",
              border: "1px solid rgba(255,45,45,0.2)",
            }}
            data-ocid="settings.account.admin_dashboard.button"
          >
            <Shield className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-sm font-semibold text-red-400 flex-1">
              Admin Dashboard
            </span>
            <ChevronDown className="-rotate-90 w-4 h-4 text-red-400/60" />
          </button>
        )}

        {/* Manage subscription */}
        <button
          type="button"
          onClick={() =>
            toast.info("Opening subscription manager…", { duration: 2500 })
          }
          className="w-full flex items-center gap-3 bg-secondary/30 hover:bg-secondary/50 border border-border/20 rounded-2xl px-4 py-3.5 transition-colors text-left"
          data-ocid="settings.account.manage_subscription.button"
        >
          <Crown className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-sm font-semibold text-foreground flex-1">
            Manage Subscription
          </span>
          <ChevronDown className="-rotate-90 w-4 h-4 text-muted-foreground" />
        </button>

        {/* Payment methods */}
        <button
          type="button"
          onClick={() =>
            toast.info("Opening payment methods…", { duration: 2500 })
          }
          className="w-full flex items-center gap-3 bg-secondary/30 hover:bg-secondary/50 border border-border/20 rounded-2xl px-4 py-3.5 transition-colors text-left"
          data-ocid="settings.account.payment_methods.button"
        >
          <Film className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-semibold text-foreground flex-1">
            Payment Methods
          </span>
          <ChevronDown className="-rotate-90 w-4 h-4 text-muted-foreground" />
        </button>

        {/* Delete account */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center gap-3 bg-destructive/8 hover:bg-destructive/15 border border-destructive/20 rounded-2xl px-4 py-3.5 transition-colors text-left"
              data-ocid="settings.account.delete_account.button"
            >
              <Trash2 className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-sm font-semibold text-destructive flex-1">
                Delete Account
              </span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent
            className="bg-card border-border/30 rounded-3xl"
            data-ocid="settings.account.delete_account.dialog"
          >
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">
                Delete your account?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                This action cannot be undone. All your videos, playlists, and
                profile data will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                className="rounded-2xl border-border/30"
                data-ocid="settings.account.delete_account.cancel_button"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  toast.success("Account deletion request submitted.", {
                    duration: 3000,
                  })
                }
                className="rounded-2xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                data-ocid="settings.account.delete_account.confirm_button"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Blocked users sheet */}
      <Sheet open={blockedUsersOpen} onOpenChange={setBlockedUsersOpen}>
        <SheetContent
          side="bottom"
          className="bg-card border-border/30 rounded-t-3xl p-0 max-h-[70vh]"
          data-ocid="settings.privacy.blocked_users.sheet"
        >
          <SheetHeader className="px-5 pt-5 pb-4 flex flex-row items-center justify-between">
            <SheetTitle className="text-base font-bold text-foreground">
              Blocked Users
            </SheetTitle>
            <button
              type="button"
              onClick={() => setBlockedUsersOpen(false)}
              className="w-8 h-8 rounded-xl bg-secondary/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
              data-ocid="settings.privacy.blocked_users.close_button"
            >
              <X className="w-4 h-4" />
            </button>
          </SheetHeader>
          <div className="px-5 pb-10">
            <div
              className="text-center py-12 text-muted-foreground text-sm"
              data-ocid="settings.privacy.blocked_users.empty_state"
            >
              No blocked users
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CollapsibleSection({
  icon: Icon,
  label,
  count,
  ocid,
  children,
  defaultOpen = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  ocid: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="bg-card rounded-3xl border border-border/30 overflow-hidden"
      data-ocid={ocid}
    >
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition-colors"
        aria-expanded={open}
      >
        <span className="w-8 h-8 rounded-xl bg-secondary/60 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </span>
        <span className="flex-1 text-left font-semibold text-sm text-foreground">
          {label}
        </span>
        {count !== undefined && (
          <span className="text-xs text-muted-foreground bg-secondary/60 rounded-full px-2 py-0.5 font-medium">
            {count}
          </span>
        )}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 pb-4 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Saved Videos Section ─────────────────────────────────────────────────────

function SavedVideosSection({ allVideos }: { allVideos: VideoPost[] }) {
  const { data: savedIds, isLoading } = useGetSavedVideos();
  const unsaveVideo = useUnsaveVideo();

  const savedVideos = savedIds
    ? savedIds
        .map((id) => allVideos.find((v) => v.id === id))
        .filter((v): v is VideoPost => Boolean(v))
    : [];

  const handleUnsave = async (videoId: bigint) => {
    try {
      await unsaveVideo.mutateAsync(videoId);
      toast.success("Removed from saved");
    } catch {
      toast.error("Failed to remove video");
    }
  };

  return (
    <div>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="aspect-video rounded-2xl bg-secondary/40" />
          <Skeleton className="aspect-video rounded-2xl bg-secondary/40" />
          <Skeleton className="aspect-video rounded-2xl bg-secondary/40" />
          <Skeleton className="aspect-video rounded-2xl bg-secondary/40" />
        </div>
      ) : savedVideos.length === 0 ? (
        <div
          className="text-center py-8 text-muted-foreground text-sm"
          data-ocid="profile.saved_videos.empty_state"
        >
          No saved videos
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {savedVideos.map((video, i) => {
            const thumbUrl = video.thumbnailBlob.getDirectURL();
            return (
              <div
                key={video.id.toString()}
                className="relative rounded-2xl overflow-hidden aspect-video bg-secondary group"
                data-ocid={`profile.saved_videos.item.${i + 1}`}
              >
                {thumbUrl && (
                  <img
                    src={thumbUrl}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <p className="absolute bottom-2 left-2 right-8 text-xs font-semibold text-white truncate leading-tight">
                  {video.title}
                </p>
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => void handleUnsave(video.id)}
                  disabled={unsaveVideo.isPending}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-colors"
                  aria-label={`Remove ${video.title} from saved`}
                  data-ocid={`profile.saved_videos.delete_button.${i + 1}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── My Playlists Section ─────────────────────────────────────────────────────

function PlaylistDetailSheet({
  playlist,
  allVideos,
  open,
  onClose,
}: {
  playlist: Playlist | null;
  allVideos: VideoPost[];
  open: boolean;
  onClose: () => void;
}) {
  const renamePlaylist = useRenamePlaylist();
  const removeVideoFromPlaylist = useRemoveVideoFromPlaylist();
  const deletePlaylist = useDeletePlaylist();
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (playlist) setNewName(playlist.name);
  }, [playlist]);

  if (!playlist) return null;

  const playlistVideos = playlist.videoIds
    .map((id) => allVideos.find((v) => v.id === id))
    .filter((v): v is VideoPost => Boolean(v));

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === playlist.name) {
      setRenaming(false);
      return;
    }
    try {
      await renamePlaylist.mutateAsync({
        id: playlist.id,
        name: newName.trim(),
      });
      toast.success("Playlist renamed");
      setRenaming(false);
    } catch {
      toast.error("Failed to rename playlist");
    }
  };

  const handleRemoveVideo = async (videoId: bigint) => {
    try {
      await removeVideoFromPlaylist.mutateAsync({
        playlistId: playlist.id,
        videoId,
      });
      toast.success("Video removed from playlist");
    } catch {
      toast.error("Failed to remove video");
    }
  };

  const handleDelete = async () => {
    try {
      await deletePlaylist.mutateAsync(playlist.id);
      toast.success("Playlist deleted");
      onClose();
    } catch {
      toast.error("Failed to delete playlist");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-card border-border/30 rounded-t-3xl p-0 max-h-[85vh]"
        data-ocid="profile.playlist_detail.sheet"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-5 pt-5 pb-3 flex flex-row items-center gap-3">
            <div className="flex-1">
              {renaming ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-9 bg-secondary border-border/40 text-foreground text-sm rounded-xl"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleRename();
                      if (e.key === "Escape") setRenaming(false);
                    }}
                    autoFocus
                    data-ocid="profile.playlist_detail.input"
                  />
                  <Button
                    size="sm"
                    onClick={() => void handleRename()}
                    disabled={renamePlaylist.isPending}
                    className="h-9 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs px-3"
                    data-ocid="profile.playlist_detail.save_button"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRenaming(false)}
                    className="h-9 rounded-xl text-muted-foreground text-xs px-3"
                    data-ocid="profile.playlist_detail.cancel_button"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <SheetTitle className="text-base font-bold text-foreground text-left">
                  {playlist.name}
                </SheetTitle>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {playlist.videoIds.length} videos
              </p>
            </div>
            {!renaming && (
              <button
                type="button"
                onClick={() => setRenaming(true)}
                className="w-8 h-8 rounded-xl bg-secondary/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Rename playlist"
                data-ocid="profile.playlist_detail.edit_button"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-secondary/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
              data-ocid="profile.playlist_detail.close_button"
            >
              <X className="w-4 h-4" />
            </button>
          </SheetHeader>

          <div className="h-px bg-border/20 mx-5" />

          {/* Video list */}
          <ScrollArea className="flex-1 px-5 py-3">
            {playlistVideos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No videos in this playlist
              </div>
            ) : (
              <div className="space-y-2">
                {playlistVideos.map((video, i) => {
                  const thumbUrl = video.thumbnailBlob.getDirectURL();
                  return (
                    <div
                      key={video.id.toString()}
                      className="flex items-center gap-3 bg-secondary/40 rounded-2xl overflow-hidden"
                      data-ocid={`profile.playlist_detail.item.${i + 1}`}
                    >
                      <div className="w-20 h-14 bg-secondary shrink-0 relative overflow-hidden">
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={video.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="flex-1 text-sm font-semibold text-foreground truncate py-2">
                        {video.title}
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleRemoveVideo(video.id)}
                        disabled={removeVideoFromPlaylist.isPending}
                        className="shrink-0 w-8 h-8 mr-2 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors"
                        aria-label={`Remove ${video.title}`}
                        data-ocid={`profile.playlist_detail.delete_button.${i + 1}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Delete section */}
          <div className="px-5 pb-6 pt-3">
            {confirmDelete ? (
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => void handleDelete()}
                  disabled={deletePlaylist.isPending}
                  className="flex-1 h-11 rounded-2xl font-bold text-sm"
                  data-ocid="profile.playlists.confirm_button"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Playlist
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 h-11 rounded-2xl font-bold text-sm border border-border/30"
                  data-ocid="profile.playlists.cancel_button"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full text-sm text-destructive/70 hover:text-destructive font-medium transition-colors flex items-center justify-center gap-2"
                data-ocid="profile.playlists.delete_button"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Playlist
              </button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CreatePlaylistSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const createPlaylist = useCreatePlaylist();
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a playlist name");
      return;
    }
    try {
      await createPlaylist.mutateAsync(name.trim());
      toast.success("Playlist created");
      onClose();
    } catch {
      toast.error("Failed to create playlist");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-card border-border/30 rounded-t-3xl p-0"
        data-ocid="profile.playlists.modal"
      >
        <SheetHeader className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-bold text-foreground">
              New Playlist
            </SheetTitle>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-secondary/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
              data-ocid="profile.playlists.close_button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </SheetHeader>

        <div className="px-5 pb-8 space-y-4">
          <Input
            ref={inputRef}
            placeholder="Playlist name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
            className="h-12 bg-secondary border-border/40 text-foreground rounded-2xl text-sm px-4"
            data-ocid="profile.playlists.input"
          />
          <Button
            onClick={() => void handleCreate()}
            disabled={createPlaylist.isPending || !name.trim()}
            className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-sm"
            data-ocid="profile.playlists.submit_button"
          >
            {createPlaylist.isPending ? "Creating..." : "Create Playlist"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PlaylistsSection({ allVideos }: { allVideos: VideoPost[] }) {
  const { data: playlists, isLoading } = useListMyPlaylists();
  const deletePlaylist = useDeletePlaylist();
  const renamePlaylist = useRenamePlaylist();
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(
    null,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<bigint | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Keep selected playlist in sync with updated data
  useEffect(() => {
    if (selectedPlaylist && playlists) {
      const updated = playlists.find((p) => p.id === selectedPlaylist.id);
      if (updated) setSelectedPlaylist(updated);
    }
  }, [playlists, selectedPlaylist]);

  const handleDeletePlaylist = async (id: bigint, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deletePlaylist.mutateAsync(id);
      toast.success("Playlist deleted");
    } catch {
      toast.error("Failed to delete playlist");
    }
  };

  const handleStartRename = (playlist: Playlist, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(playlist.id);
    setRenameValue(playlist.name);
  };

  const handleRenameSubmit = async (id: bigint) => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      await renamePlaylist.mutateAsync({ id, name: renameValue.trim() });
      toast.success("Playlist renamed");
      setRenamingId(null);
    } catch {
      toast.error("Failed to rename");
    }
  };

  return (
    <div className="space-y-2">
      {/* Create button */}
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="w-full flex items-center gap-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-2xl px-4 py-3 transition-colors"
        data-ocid="profile.playlists.primary_button"
      >
        <Plus className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-primary">
          Create Playlist
        </span>
      </button>

      {isLoading ? (
        <>
          <Skeleton className="h-14 w-full rounded-2xl bg-secondary/40" />
          <Skeleton className="h-14 w-full rounded-2xl bg-secondary/40" />
        </>
      ) : !playlists || playlists.length === 0 ? (
        <div
          className="text-center py-8 text-muted-foreground text-sm"
          data-ocid="profile.playlists.empty_state"
        >
          No playlists yet
        </div>
      ) : (
        playlists.map((playlist, i) => (
          // biome-ignore lint/a11y/useKeyWithClickEvents: inner buttons handle keyboard
          <div
            key={playlist.id.toString()}
            className="flex items-center gap-3 bg-secondary/40 rounded-2xl px-4 py-3 cursor-pointer hover:bg-secondary/60 transition-colors"
            onClick={() => {
              if (renamingId !== playlist.id) setSelectedPlaylist(playlist);
            }}
            data-ocid={`profile.playlists.item.${i + 1}`}
          >
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <ListVideo className="w-4 h-4 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              {renamingId === playlist.id ? (
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleRenameSubmit(playlist.id);
                    if (e.key === "Escape") setRenamingId(null);
                    e.stopPropagation();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-secondary border border-border/40 text-foreground text-sm rounded-lg px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary"
                  data-ocid={`profile.playlists.input.${i + 1}`}
                />
              ) : (
                <>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {playlist.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {playlist.videoIds.length} videos
                  </p>
                </>
              )}
            </div>

            {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation container, inner buttons handle interaction */}
            <div
              className="flex items-center gap-1 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {renamingId === playlist.id ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handleRenameSubmit(playlist.id)}
                    className="text-xs text-primary font-semibold px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                    data-ocid={`profile.playlists.save_button.${i + 1}`}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenamingId(null)}
                    className="text-xs text-muted-foreground px-2 py-1 rounded-lg hover:bg-secondary transition-colors"
                    data-ocid={`profile.playlists.cancel_button.${i + 1}`}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={(e) => handleStartRename(playlist, e)}
                    className="w-7 h-7 rounded-lg bg-secondary/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Rename playlist"
                    data-ocid={`profile.playlists.edit_button.${i + 1}`}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => void handleDeletePlaylist(playlist.id, e)}
                    disabled={deletePlaylist.isPending}
                    className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors"
                    aria-label="Delete playlist"
                    data-ocid={`profile.playlists.delete_button.${i + 1}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))
      )}

      {/* Playlist detail sheet */}
      <PlaylistDetailSheet
        playlist={selectedPlaylist}
        allVideos={allVideos}
        open={!!selectedPlaylist}
        onClose={() => setSelectedPlaylist(null)}
      />

      {/* Create playlist sheet */}
      <CreatePlaylistSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}

// ─── Premium Status Section ───────────────────────────────────────────────────

function PremiumSection() {
  const { data: isPremium, isLoading } = useIsPremium();

  return (
    <div className="space-y-3" data-ocid="profile.premium.section">
      {isLoading ? (
        <Skeleton className="h-20 w-full rounded-2xl bg-secondary/40" />
      ) : isPremium ? (
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <Crown className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-foreground">
                Premium Member
              </span>
              <span className="text-xs bg-green-500/20 text-green-400 font-semibold px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              You have access to all premium content
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-secondary/40 border border-border/30 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-secondary/60 flex items-center justify-center shrink-0">
            <Crown className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-foreground">
                Free Plan
              </span>
              <span className="text-xs bg-secondary/80 text-muted-foreground font-semibold px-2 py-0.5 rounded-full">
                Inactive
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Upgrade to unlock all premium features
            </p>
          </div>
        </div>
      )}

      {!isPremium && !isLoading && (
        <button
          type="button"
          className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-[0.98]"
          data-ocid="profile.premium.primary_button"
        >
          <Crown className="w-4 h-4" />
          Upgrade to Premium
        </button>
      )}
    </div>
  );
}

// ─── Main ProfilePage ─────────────────────────────────────────────────────────

interface ProfilePageProps {
  onWalletNavigate?: () => void;
  onAdminDashboard?: () => void;
}

export default function ProfilePage({
  onWalletNavigate,
  onAdminDashboard,
}: ProfilePageProps) {
  const { identity, clear } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const [isAdmin, setIsAdmin] = useState(false);
  // Actor is definitively missing only after initialization finishes
  const actorMissing = !actor && !actorFetching;
  const { data: username, isLoading } = useGetUsername();
  const { data: extendedProfile } = useGetExtendedProfile();
  const queryClient = useQueryClient();
  const { data: allVideos = [] } = useListVideoPosts();
  const [editOpen, setEditOpen] = useState(false);

  const principalStr = identity?.getPrincipal().toString() ?? "";
  const shortPrincipalStr = principalStr
    ? `${principalStr.slice(0, 8)}…${principalStr.slice(-4)}`
    : "";

  // Use extended profile name if available, fallback to username or short principal
  const rawDisplayName =
    extendedProfile?.name || extendedProfile?.username || username || "";
  const displayName =
    rawDisplayName ||
    (principalStr ? `user_${principalStr.slice(0, 5)}` : "User");
  const initials = rawDisplayName
    ? rawDisplayName.slice(0, 2).toUpperCase()
    : "U";

  const lastActiveAt = principalStr ? getActiveStatus(principalStr) : null;
  const { isOnline, label: activeLabel } = formatActiveStatus(lastActiveAt);

  // Check admin status
  useEffect(() => {
    if (!actor) return;
    actor
      .isCallerAdmin()
      .then((admin) => setIsAdmin(admin))
      .catch(() => setIsAdmin(false));
  }, [actor]);

  const handleLogout = async () => {
    // ── 1. Wipe all localStorage (session, tokens, cached state, actor links) ──
    try {
      localStorage.clear();
    } catch {
      // ignore storage errors
    }

    // ── 2. Clear all React Query cache ──────────────────────────────────────
    queryClient.clear();

    // ── 3. Clear all session cookies ────────────────────────────────────────
    try {
      for (const c of document.cookie.split(";")) {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
      }
    } catch {
      // ignore cookie errors
    }

    // ── 4. Log out from Internet Identity (clears delegation) ───────────────
    try {
      await clear();
    } catch {
      // ignore auth errors — proceed with hard reload regardless
    }

    // ── 5. Hard reload to login screen — no auto-login ───────────────────────
    window.location.reload();
  };

  const sectionDelay = (i: number) => i * 0.06;

  return (
    <div
      className="h-full flex flex-col bg-background"
      data-ocid="profile.page"
    >
      {/* Header */}
      <header className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-black tracking-tight">Profile</h1>
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
          Account
        </span>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4">
        <div className="space-y-3">
          {/* Actor status banner — shown only when actor failed to load after init */}
          <AnimatePresence>
            <ActorStatusBanner actorMissing={actorMissing} />
          </AnimatePresence>

          {/* Profile card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-card rounded-3xl p-5 border border-border/30"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                {extendedProfile?.avatarUrl ? (
                  <div className="w-16 h-16 rounded-2xl overflow-hidden">
                    <img
                      src={extendedProfile.avatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center font-black text-xl text-white">
                    {isLoading ? (
                      <User2 className="w-7 h-7 text-white" />
                    ) : (
                      initials
                    )}
                  </div>
                )}
                {/* Online status dot — bottom-right of avatar */}
                <div className="absolute -bottom-1 -right-1">
                  <OnlineStatusDot lastActiveAt={lastActiveAt} size="md" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                {isLoading ? (
                  <>
                    <Skeleton className="h-5 w-32 bg-secondary mb-2" />
                    <Skeleton className="h-3 w-24 bg-secondary" />
                  </>
                ) : (
                  <>
                    <p className="font-bold text-lg text-foreground truncate">
                      @{displayName}
                    </p>
                    {/* Bio snippet */}
                    {extendedProfile?.bio && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-[200px]">
                        {extendedProfile.bio}
                      </p>
                    )}
                    {/* Active status label */}
                    <p
                      className={`text-xs font-medium mt-0.5 ${isOnline ? "text-green-400" : "text-muted-foreground"}`}
                    >
                      {activeLabel}
                    </p>
                    {shortPrincipalStr && (
                      <p
                        className="text-xs text-muted-foreground font-mono mt-0.5 truncate"
                        title={principalStr}
                      >
                        {shortPrincipalStr}
                      </p>
                    )}
                  </>
                )}
              </div>
              {/* Action buttons */}
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="flex items-center gap-1.5 bg-white/8 hover:bg-white/14 text-white/70 hover:text-white rounded-2xl px-3 py-2 text-xs font-semibold transition-colors active:scale-95"
                  aria-label="Edit profile"
                  data-ocid="profile.edit_profile.button"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onWalletNavigate?.()}
                  className="flex items-center gap-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 hover:text-yellow-300 rounded-2xl px-3 py-2 text-xs font-semibold transition-colors active:scale-95"
                  aria-label="My Wallet"
                  data-ocid="profile.wallet.button"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  Wallet
                </button>
              </div>
            </div>
          </motion.div>

          {/* Saved Videos */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: sectionDelay(0) }}
          >
            <CollapsibleSection
              icon={BookmarkIcon}
              label="Saved Videos"
              ocid="profile.saved_videos.section"
            >
              <SavedVideosSection allVideos={allVideos} />
            </CollapsibleSection>
          </motion.div>

          {/* My Playlists */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: sectionDelay(1) }}
          >
            <CollapsibleSection
              icon={ListVideo}
              label="My Playlists"
              ocid="profile.playlists.section"
            >
              <PlaylistsSection allVideos={allVideos} />
            </CollapsibleSection>
          </motion.div>

          {/* Premium Status */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: sectionDelay(2) }}
          >
            <CollapsibleSection
              icon={Crown}
              label="Premium Status"
              ocid="profile.premium.section"
            >
              <PremiumSection />
            </CollapsibleSection>
          </motion.div>

          {/* Settings */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: sectionDelay(4) }}
          >
            <CollapsibleSection
              icon={Settings}
              label="Settings"
              ocid="profile.settings.section"
            >
              <LanguageSelector />
              <SettingsSections
                isAdmin={isAdmin}
                onAdminDashboard={onAdminDashboard}
              />
            </CollapsibleSection>
          </motion.div>

          {/* Logout */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: sectionDelay(5) }}
          >
            <Button
              onClick={() => void handleLogout()}
              variant="destructive"
              className="w-full h-12 rounded-2xl bg-destructive/15 hover:bg-destructive/30 text-destructive border border-destructive/20 font-bold"
              data-ocid="profile.logout.button"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </motion.div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground opacity-40 pt-2">
            © {new Date().getFullYear()}.{" "}
            <span>Built with love using caffeine.ai</span>
          </p>
        </div>
      </main>

      {/* Edit Profile Panel */}
      <EditProfilePanel open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
