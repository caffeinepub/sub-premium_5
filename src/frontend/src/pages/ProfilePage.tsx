import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookmarkIcon,
  ChevronDown,
  Crown,
  ListVideo,
  LogOut,
  Pencil,
  Play,
  Plus,
  Settings,
  Trash2,
  User2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Playlist, VideoPost } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCreatePlaylist,
  useDeletePlaylist,
  useGetSavedVideos,
  useGetUsername,
  useIsPremium,
  useListMyPlaylists,
  useListVideoPosts,
  useRemoveVideoFromPlaylist,
  useRenamePlaylist,
  useUnsaveVideo,
} from "../hooks/useQueries";

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

export default function ProfilePage() {
  const { identity, clear } = useInternetIdentity();
  const { data: username, isLoading } = useGetUsername();
  const queryClient = useQueryClient();
  const { data: allVideos = [] } = useListVideoPosts();

  const displayName = username ?? "Anonymous";
  const initials = displayName.slice(0, 2).toUpperCase();
  const principalStr = identity?.getPrincipal().toString() ?? "";
  const shortPrincipalStr = principalStr
    ? `${principalStr.slice(0, 8)}…${principalStr.slice(-4)}`
    : "";

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
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
          {/* Profile card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-card rounded-3xl p-5 border border-border/30"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center font-black text-xl text-white">
                  {isLoading ? (
                    <User2 className="w-7 h-7 text-white" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card border-2 border-primary flex items-center justify-center">
                  <Play className="w-2 h-2 text-primary fill-primary" />
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
            transition={{ duration: 0.28, delay: sectionDelay(3) }}
          >
            <CollapsibleSection
              icon={Settings}
              label="Settings"
              ocid="profile.settings.section"
            >
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Settings
                  className="w-8 h-8 text-muted-foreground mb-3"
                  strokeWidth={1.5}
                />
                <p className="text-sm font-semibold text-foreground mb-1">
                  Settings coming soon
                </p>
                <p className="text-xs text-muted-foreground">
                  App preferences and account settings will appear here.
                </p>
              </div>
            </CollapsibleSection>
          </motion.div>

          {/* Logout */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: sectionDelay(4) }}
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
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-70 transition-opacity"
            >
              Built with love using caffeine.ai
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
