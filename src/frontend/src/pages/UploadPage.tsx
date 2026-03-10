import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  CheckCircle2,
  Film,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import {
  type UploadSession,
  clearSession,
  getFileId,
  loadSession,
  useChunkedUpload,
} from "../hooks/useChunkedUpload";
import { useCreateVideoPost } from "../hooks/useQueries";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5 GB
const MAX_DURATION_SECONDS = 7200; // 2 hours

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadStage =
  | "idle"
  | "uploading"
  | "processing"
  | "encoding"
  | "finalizing"
  | "done"
  | "error";

const UPLOAD_STAGE_LABELS: Record<
  Exclude<UploadStage, "idle" | "done" | "error">,
  string
> = {
  uploading: "Uploading",
  processing: "Processing",
  encoding: "Encoding",
  finalizing: "Finalizing",
};

const UPLOAD_STAGES_ORDER: Array<
  Exclude<UploadStage, "idle" | "done" | "error">
> = ["uploading", "processing", "encoding", "finalizing"];

function getStageFromProgress(
  pct: number,
): Exclude<UploadStage, "idle" | "done" | "error"> {
  if (pct < 60) return "uploading";
  if (pct < 80) return "processing";
  if (pct < 95) return "encoding";
  return "finalizing";
}

async function validateVideoFile(file: File): Promise<string | null> {
  if (file.size > MAX_FILE_SIZE) {
    return "Video is too large. Maximum size is 5 GB.";
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (video.duration > MAX_DURATION_SECONDS) {
        resolve("Video is too long. Maximum duration is 2 hours.");
      } else {
        resolve(null);
      }
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoProgress, setVideoProgress] = useState(0);
  const [stage, setStage] = useState<UploadStage>("idle");
  const [chunkInfo, setChunkInfo] = useState("");
  const [retryInfo, setRetryInfo] = useState("");
  const [resumeSession, setResumeSession] = useState<UploadSession | null>(
    null,
  );

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const createPost = useCreateVideoPost();
  const { uploadFile, cancelUpload } = useChunkedUpload();

  const isUploadActive =
    stage === "uploading" ||
    stage === "processing" ||
    stage === "encoding" ||
    stage === "finalizing";

  // ── Prevent page leave during active upload ──
  useEffect(() => {
    if (!isUploadActive) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isUploadActive]);

  // ── Visibility change — keep upload alive ──
  useEffect(() => {
    if (!isUploadActive) return;
    const handleVisibility = () => {
      // Background fetch/XHR continues automatically; nothing to do
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [isUploadActive]);

  const canPublish = !!videoFile && title.trim().length > 0 && !isUploadActive;

  // ── File Handlers ──

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const err = await validateVideoFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    setVideoFile(file);
    setStage("idle");
    setChunkInfo("");
    setRetryInfo("");

    // Check for existing resume session
    const fileId = getFileId(file);
    const existingSession = loadSession(fileId);
    if (existingSession && existingSession.completedChunks.length > 0) {
      setResumeSession(existingSession);
    } else {
      setResumeSession(null);
    }
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setThumbnailFile(file);
    e.target.value = "";
  };

  // ── Publish ──

  const handlePublish = async () => {
    if (!videoFile || !title.trim()) return;

    setStage("uploading");
    setVideoProgress(0);
    setChunkInfo("");
    setRetryInfo("");
    setResumeSession(null);

    try {
      // Chunked read phase (0–60%)
      const videoBytes = await uploadFile(
        videoFile,
        (pct, info) => {
          setVideoProgress(pct);
          setStage(getStageFromProgress(pct));
          setChunkInfo(info);
        },
        (info) => setRetryInfo(info),
      );

      setRetryInfo("");

      // ExternalBlob upload phase (60–100%)
      const videoBlob = ExternalBlob.fromBytes(
        videoBytes as Uint8Array<ArrayBuffer>,
      ).withUploadProgress((pct) => {
        // Map ExternalBlob's 0–100 into our 60–100 range
        const mapped = 60 + Math.round(pct * 0.4);
        setVideoProgress(mapped);
        setStage(getStageFromProgress(mapped));
        setChunkInfo("");
      });

      let thumbnailBlob: ExternalBlob;
      if (thumbnailFile) {
        const thumbBytes = await readFileAsBytes(thumbnailFile);
        thumbnailBlob = ExternalBlob.fromBytes(thumbBytes);
      } else {
        const fallbackBytes = new Uint8Array([
          137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0,
          1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68,
          65, 84, 120, 156, 98, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0,
          0, 73, 69, 78, 68, 174, 66, 96, 130,
        ]);
        thumbnailBlob = ExternalBlob.fromBytes(fallbackBytes);
      }

      const postId = await createPost.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        videoBlob,
        thumbnailBlob,
      });

      void postId;

      // Success — clear session
      const fileId = getFileId(videoFile);
      clearSession(fileId);

      setVideoProgress(100);
      setStage("done");

      setTimeout(() => {
        setVideoFile(null);
        setThumbnailFile(null);
        setTitle("");
        setDescription("");
        setVideoProgress(0);
        setStage("idle");
        setChunkInfo("");
        toast.success("Video published successfully!");
      }, 2000);
    } catch (err) {
      // Keep session in localStorage so user can resume on retry
      setStage("error");
      setChunkInfo("");
      setRetryInfo("");
      console.error(err);
    }
  };

  const handleStartOver = () => {
    if (videoFile) {
      clearSession(getFileId(videoFile));
    }
    setResumeSession(null);
  };

  const handleCancelUpload = () => {
    cancelUpload();
    setStage("idle");
    setVideoProgress(0);
    setChunkInfo("");
    setRetryInfo("");
  };

  return (
    <div className="h-full flex flex-col bg-background" data-ocid="upload.page">
      {/* Header */}
      <header className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-black tracking-tight">Upload</h1>
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
          New Video
        </span>
      </header>

      {/* Form */}
      <main className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4">
        <div className="space-y-5">
          {/* Video selector */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">
              Video File
            </Label>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => void handleVideoSelect(e)}
              className="sr-only"
              aria-label="Select video file"
            />
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={isUploadActive}
              className="relative w-full rounded-2xl border-2 border-dashed border-border/50 bg-secondary/50 hover:bg-secondary hover:border-primary/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              data-ocid="upload.dropzone"
            >
              <div className="flex flex-col items-center justify-center py-8 px-4">
                {videoFile ? (
                  <>
                    <Film className="w-10 h-10 text-primary mb-3" />
                    <p className="text-sm font-semibold text-foreground text-center truncate max-w-full px-4">
                      {videoFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatFileSize(videoFile.size)}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      Select from Gallery / Files
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 text-center">
                      Photos, files, camera recordings · Max 5 GB · Max 2 hours
                    </p>
                  </>
                )}
              </div>
              {videoFile && !isUploadActive && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVideoFile(null);
                    setResumeSession(null);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label="Remove video"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={isUploadActive}
              className="sr-only"
              data-ocid="upload.upload_button"
            >
              Select Video
            </button>
          </div>

          {/* ── Resume Prompt Banner ── */}
          <AnimatePresence>
            {resumeSession && !isUploadActive && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                data-ocid="upload.resume.panel"
                className="rounded-2xl p-4 flex flex-col gap-3"
                style={{
                  background: "rgba(251,191,36,0.08)",
                  border: "1px solid rgba(251,191,36,0.3)",
                }}
              >
                <div className="flex items-start gap-2.5">
                  <RotateCcw
                    className="w-4 h-4 shrink-0 mt-0.5"
                    style={{ color: "#fbbf24" }}
                  />
                  <div>
                    <p
                      className="text-sm font-bold"
                      style={{ color: "#fbbf24" }}
                    >
                      Upload interrupted — resume?
                    </p>
                    <p className="text-xs mt-0.5 text-muted-foreground">
                      {resumeSession.completedChunks.length} /{" "}
                      {resumeSession.totalChunks} chunks already uploaded
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    data-ocid="upload.resume.primary_button"
                    onClick={() => void handlePublish()}
                    className="flex-1 h-9 rounded-xl text-xs font-bold"
                    style={{ background: "#fbbf24", color: "#0f0f0f" }}
                  >
                    Resume Upload
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    data-ocid="upload.resume.secondary_button"
                    onClick={handleStartOver}
                    className="flex-1 h-9 rounded-xl text-xs font-bold border-border/50"
                  >
                    Start Over
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Thumbnail selector */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">
              Thumbnail{" "}
              <span className="text-muted-foreground font-normal text-xs">
                (optional)
              </span>
            </Label>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              onChange={handleThumbnailSelect}
              className="sr-only"
              aria-label="Select thumbnail image"
            />
            {thumbnailFile ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-border/50">
                <img
                  src={URL.createObjectURL(thumbnailFile)}
                  alt="Thumbnail preview"
                  className="w-full aspect-video object-cover"
                />
                {!isUploadActive && (
                  <button
                    type="button"
                    onClick={() => setThumbnailFile(null)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black/90"
                    aria-label="Remove thumbnail"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => thumbnailInputRef.current?.click()}
                disabled={isUploadActive}
                className="flex flex-col items-center justify-center py-6 px-4 w-full rounded-2xl border-2 border-dashed border-border/50 bg-secondary/50 hover:bg-secondary hover:border-primary/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                data-ocid="upload.thumbnail.upload_button"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-2">
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  Select Thumbnail
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Photos, gallery, files
                </p>
              </button>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="video-title" className="text-sm font-semibold">
              Title <span className="text-primary">*</span>
            </Label>
            <Input
              id="video-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your video a great title…"
              maxLength={100}
              disabled={isUploadActive}
              className="bg-secondary border-border/50 rounded-xl h-12 focus-visible:ring-primary"
              data-ocid="upload.title.input"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label
              htmlFor="video-description"
              className="text-sm font-semibold"
            >
              Description
            </Label>
            <Textarea
              id="video-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell viewers what your video is about…"
              rows={3}
              maxLength={500}
              disabled={isUploadActive}
              className="bg-secondary border-border/50 rounded-xl resize-none focus-visible:ring-primary"
              data-ocid="upload.description.textarea"
            />
          </div>

          {/* ── Upload Warning Banner ── */}
          <AnimatePresence>
            {isUploadActive && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                data-ocid="upload.upload_warning.panel"
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
                style={{
                  background: "rgba(251,191,36,0.08)",
                  border: "1px solid rgba(251,191,36,0.25)",
                }}
              >
                <AlertTriangle
                  className="w-4 h-4 shrink-0"
                  style={{ color: "#fbbf24" }}
                  strokeWidth={2}
                />
                <p
                  className="text-xs font-medium leading-snug"
                  style={{ color: "#fbbf24" }}
                >
                  Uploading video. Please stay on this page until upload
                  completes.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── 4-Stage Upload Progress ── */}
          <AnimatePresence>
            {isUploadActive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-secondary rounded-2xl p-4 space-y-3"
                data-ocid="upload.upload_status.loading_state"
              >
                {/* Stage label + percentage */}
                <div className="flex items-center justify-between text-sm">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={stage}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="font-bold text-foreground"
                    >
                      {isUploadActive &&
                        UPLOAD_STAGE_LABELS[
                          stage as keyof typeof UPLOAD_STAGE_LABELS
                        ]}
                      …
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-primary font-bold">
                    {Math.round(videoProgress)}%
                  </span>
                </div>

                {/* Progress bar */}
                <Progress value={videoProgress} className="h-2 bg-border" />

                {/* Chunk info */}
                {chunkInfo && (
                  <p className="text-xs text-muted-foreground text-center">
                    {chunkInfo}
                  </p>
                )}

                {/* Retry info */}
                {retryInfo && (
                  <p
                    className="text-xs text-center animate-pulse"
                    style={{ color: "#fbbf24" }}
                  >
                    {retryInfo}
                  </p>
                )}

                {/* Stage dot indicators */}
                <div className="flex items-center justify-between gap-1 pt-1">
                  {UPLOAD_STAGES_ORDER.map((s) => {
                    const sIdx = UPLOAD_STAGES_ORDER.indexOf(s);
                    const currentIdx = UPLOAD_STAGES_ORDER.indexOf(
                      stage as (typeof UPLOAD_STAGES_ORDER)[number],
                    );
                    const isActive = s === stage;
                    const isPast = currentIdx > sIdx;
                    return (
                      <div
                        key={s}
                        className="flex flex-col items-center gap-1 flex-1"
                      >
                        <div
                          className="w-2 h-2 rounded-full transition-all duration-300"
                          style={{
                            background: isPast
                              ? "hsl(var(--primary))"
                              : isActive
                                ? "hsl(var(--primary))"
                                : "hsl(var(--border))",
                            opacity: isPast || isActive ? 1 : 0.4,
                            boxShadow: isActive
                              ? "0 0 6px hsl(var(--primary) / 0.6)"
                              : "none",
                          }}
                        />
                        <span
                          className="text-[9px] font-semibold tracking-wide"
                          style={{
                            color: isActive
                              ? "hsl(var(--foreground))"
                              : isPast
                                ? "hsl(var(--primary))"
                                : "hsl(var(--muted-foreground))",
                            opacity: isPast || isActive ? 1 : 0.5,
                          }}
                        >
                          {UPLOAD_STAGE_LABELS[s]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Cancel button */}
                <button
                  type="button"
                  onClick={handleCancelUpload}
                  className="w-full text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
                >
                  Cancel upload
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Error State ── */}
          <AnimatePresence>
            {stage === "error" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-2xl p-4 flex flex-col items-center gap-3 text-center"
                data-ocid="upload.error_state"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
              >
                <AlertTriangle
                  className="w-7 h-7"
                  style={{ color: "#ef4444" }}
                  strokeWidth={1.5}
                />
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Upload failed.
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your progress is saved. Tap Try Again to resume.
                  </p>
                </div>
                <Button
                  type="button"
                  data-ocid="upload.retry.button"
                  onClick={() => {
                    setStage("idle");
                    void handlePublish();
                  }}
                  className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Success State ── */}
          <AnimatePresence>
            {stage === "done" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-primary/10 border border-primary/30 rounded-2xl p-4 flex items-center gap-3"
                data-ocid="upload.success_state"
              >
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <p className="text-sm font-medium text-foreground">
                  Upload complete
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Publish Button ── */}
          {stage !== "done" && stage !== "error" && (
            <Button
              onClick={() => void handlePublish()}
              disabled={!canPublish}
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-base glow-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              data-ocid="upload.submit_button"
            >
              {isUploadActive ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {
                    UPLOAD_STAGE_LABELS[
                      stage as keyof typeof UPLOAD_STAGE_LABELS
                    ]
                  }
                  …
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Publish Video
                </>
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readFileAsBytes(file: File): Promise<Uint8Array<ArrayBuffer>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (result instanceof ArrayBuffer) {
        resolve(new Uint8Array(result));
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.readAsArrayBuffer(file);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
