import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BookmarkPlus, Check, ListVideo, Loader2, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { VideoPost } from "../backend.d";
import {
  useAddVideoToPlaylist,
  useCreatePlaylist,
  useGetUsernameByPrincipal,
  useListMyPlaylists,
  useRecordWatchHistory,
} from "../hooks/useQueries";

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

interface VideoPlayerModalProps {
  post: VideoPost | null;
  open: boolean;
  onClose: () => void;
}

// ─── Save to Playlist Sheet ───────────────────────────────────────────────────

function SaveToPlaylistSheet({
  videoId,
  open,
  onClose,
}: {
  videoId: bigint;
  open: boolean;
  onClose: () => void;
}) {
  const { data: playlists, isLoading } = useListMyPlaylists();
  const addVideoToPlaylist = useAddVideoToPlaylist();
  const createPlaylist = useCreatePlaylist();
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setAddedIds(new Set());
      setCreatingNew(false);
      setNewName("");
    }
  }, [open]);

  useEffect(() => {
    if (creatingNew) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [creatingNew]);

  const handleAddToPlaylist = async (
    playlistId: bigint,
    playlistName: string,
  ) => {
    const key = playlistId.toString();
    try {
      await addVideoToPlaylist.mutateAsync({ playlistId, videoId });
      setAddedIds((prev) => new Set([...prev, key]));
      toast.success(`Added to "${playlistName}"`);
    } catch {
      toast.error("Failed to add to playlist");
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newName.trim()) {
      toast.error("Please enter a playlist name");
      return;
    }
    try {
      const id = await createPlaylist.mutateAsync(newName.trim());
      await addVideoToPlaylist.mutateAsync({ playlistId: id, videoId });
      setAddedIds((prev) => new Set([...prev, id.toString()]));
      toast.success(`Created "${newName.trim()}" and added video`);
      setCreatingNew(false);
      setNewName("");
    } catch {
      toast.error("Failed to create playlist");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-card border-border/30 rounded-t-3xl p-0 max-h-[70vh]"
        data-ocid="home.video.playlist.sheet"
      >
        <SheetHeader className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-bold text-foreground">
              Save to Playlist
            </SheetTitle>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-secondary/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </SheetHeader>

        <div className="h-px bg-border/20 mx-5" />

        <ScrollArea className="flex-1 max-h-[45vh]">
          <div className="px-5 py-3 space-y-2">
            {/* Create new playlist option */}
            {creatingNew ? (
              <div className="flex items-center gap-2 bg-secondary/40 rounded-2xl p-3">
                <Input
                  ref={inputRef}
                  placeholder="Playlist name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleCreateAndAdd();
                    if (e.key === "Escape") setCreatingNew(false);
                  }}
                  className="h-9 flex-1 bg-secondary/60 border-border/40 text-foreground text-sm rounded-xl"
                  data-ocid="home.video.playlist.input"
                />
                <button
                  type="button"
                  onClick={() => void handleCreateAndAdd()}
                  disabled={
                    createPlaylist.isPending || addVideoToPlaylist.isPending
                  }
                  className="h-9 px-3 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                  data-ocid="home.video.playlist.submit_button"
                >
                  {createPlaylist.isPending || addVideoToPlaylist.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setCreatingNew(false)}
                  className="h-9 px-2 text-muted-foreground hover:text-foreground text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreatingNew(true)}
                className="w-full flex items-center gap-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-2xl px-4 py-3 transition-colors"
                data-ocid="home.video.playlist.primary_button"
              >
                <Plus className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">
                  Create New Playlist
                </span>
              </button>
            )}

            {/* Existing playlists */}
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !playlists || playlists.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No playlists yet — create one above
              </div>
            ) : (
              playlists.map((playlist, i) => {
                const isAdded = addedIds.has(playlist.id.toString());
                return (
                  <div
                    key={playlist.id.toString()}
                    className="flex items-center gap-3 bg-secondary/40 rounded-2xl px-4 py-3"
                    data-ocid={`home.video.playlist.item.${i + 1}`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                      <ListVideo className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {playlist.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {playlist.videoIds.length} videos
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        !isAdded &&
                        void handleAddToPlaylist(playlist.id, playlist.name)
                      }
                      disabled={isAdded || addVideoToPlaylist.isPending}
                      className={`h-8 px-3 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                        isAdded
                          ? "bg-green-500/20 text-green-400 cursor-default"
                          : "bg-primary/20 hover:bg-primary/30 text-primary"
                      }`}
                      data-ocid={`home.video.playlist.save_button.${i + 1}`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Added
                        </>
                      ) : (
                        "Add"
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ─── Video Player Modal ───────────────────────────────────────────────────────

export function VideoPlayerModal({
  post,
  open,
  onClose,
}: VideoPlayerModalProps) {
  const { data: username } = useGetUsernameByPrincipal(post?.uploader);
  const recordWatchHistory = useRecordWatchHistory();
  const [playlistSheetOpen, setPlaylistSheetOpen] = useState(false);

  // Record watch history when modal opens
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally only trigger on open/post id change
  useEffect(() => {
    if (open && post) {
      recordWatchHistory.mutate(post.id);
    }
  }, [open, post?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!post) return null;

  const videoUrl = post.videoBlob.getDirectURL();

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          className="bg-card border-border/50 p-0 max-w-lg w-full rounded-3xl overflow-hidden"
          data-ocid="home.video.modal"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-50 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-colors"
            aria-label="Close video"
            data-ocid="home.video.close_button"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Video player */}
          <div className="relative bg-black aspect-video w-full">
            {/* biome-ignore lint/a11y/useMediaCaption: user-generated content; captions not available */}
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
              playsInline
            />
          </div>

          {/* Video info */}
          <div className="p-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold leading-snug text-foreground">
                {post.title}
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-2 mt-1 mb-3">
              <span className="text-xs text-primary font-medium">
                @{username ?? "anonymous"}
              </span>
              <span className="text-xs text-muted-foreground">
                · {formatRelativeTime(post.timestamp)}
              </span>
            </div>
            {post.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {post.description}
              </p>
            )}

            {/* Save to Playlist button */}
            <button
              type="button"
              onClick={() => setPlaylistSheetOpen(true)}
              className="flex items-center gap-2 bg-secondary/60 hover:bg-secondary/80 rounded-2xl px-4 py-2.5 text-sm font-semibold text-foreground transition-colors w-full"
              data-ocid="home.video.save_playlist_button"
            >
              <BookmarkPlus className="w-4 h-4 text-primary" />
              Save to Playlist
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save to Playlist Sheet (outside Dialog to avoid nesting issues) */}
      {open && (
        <SaveToPlaylistSheet
          videoId={post.id}
          open={playlistSheetOpen}
          onClose={() => setPlaylistSheetOpen(false)}
        />
      )}
    </>
  );
}
