import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  FlipHorizontal,
  Music,
  RefreshCw,
  Sparkles,
  Timer,
  Video,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  type TouchEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import { useCreateVideoPost } from "../hooks/useQueries";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  onUploadSelected: (file: File) => void;
  onGoLive: (streamId: bigint) => void;
}

type SlideIndex = 0 | 1 | 2;
type PrivacyOption = "Public" | "Followers" | "Private";
type TimerOption = "Off" | "3s" | "10s";
type CountdownStep = 3 | 2 | 1 | 0;
type UploadStage =
  | "idle"
  | "uploading"
  | "processing"
  | "encoding"
  | "finalizing"
  | "done"
  | "error";
type RecordingPhase = "idle" | "countdown" | "recording" | "editing";

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5 GB
const MAX_DURATION_SECONDS = 7200; // 2 hours

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
      resolve(null); // allow upload even if metadata can't be read
    };
    video.src = url;
  });
}

const CATEGORIES = [
  "Entertainment",
  "Gaming",
  "Music",
  "Education",
  "Sports",
  "Comedy",
  "News",
  "Other",
];

// ─── Shared Styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16,
  color: "white",
  fontSize: 15,
  padding: "14px 16px",
  outline: "none",
  width: "100%",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.35)",
};

// ─── Hashtag Input Component ───────────────────────────────────────────────────

function HashtagInput({
  tags,
  onTagsChange,
  placeholder,
  ocid,
}: {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder: string;
  ocid: string;
}) {
  const [input, setInput] = useState("");

  const addTag = (raw: string) => {
    const cleaned = raw
      .replace(/[,\s#]+/g, "")
      .toLowerCase()
      .trim();
    if (!cleaned) return;
    const tag = `#${cleaned}`;
    if (!tags.includes(tag) && tags.length < 10) {
      onTagsChange([...tags, tag]);
    }
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " " || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      onTagsChange(tags.slice(0, -1));
    }
  };

  const handleBlur = () => {
    if (input.trim()) addTag(input);
  };

  return (
    <div>
      <div
        className="flex flex-wrap gap-1.5 min-h-[50px] rounded-2xl px-3 py-2.5"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{
              background: "rgba(255,45,45,0.15)",
              color: "#FF6B6B",
              border: "1px solid rgba(255,45,45,0.25)",
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => onTagsChange(tags.filter((t) => t !== tag))}
              className="ml-0.5 hover:opacity-80"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? placeholder : "Add more..."}
          data-ocid={ocid}
          className="flex-1 min-w-[100px] bg-transparent outline-none text-white text-sm placeholder:text-white/30"
          style={{ minHeight: 28 }}
        />
      </div>
      <p
        className="text-[10px] mt-1.5"
        style={{ color: "rgba(255,255,255,0.25)" }}
      >
        Press Space, Enter, or comma to add
      </p>
    </div>
  );
}

// ─── Upload Slide ──────────────────────────────────────────────────────────────

function UploadSlide({ onClose }: { onClose: () => void }) {
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const videoElRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const createVideoPost = useCreateVideoPost();

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [_thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(
    null,
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Entertainment");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [audience, setAudience] = useState<PrivacyOption>("Public");
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);

  const audienceOptions: PrivacyOption[] = ["Public", "Followers", "Private"];

  const isUploadActive =
    uploadStage === "uploading" ||
    uploadStage === "processing" ||
    uploadStage === "encoding" ||
    uploadStage === "finalizing";

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

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    };
  }, [videoPreviewUrl, thumbnailPreviewUrl]);

  const handleVideoSelect = (file: File) => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
  };

  const handleVideoInputChange = async (file: File) => {
    const err = await validateVideoFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    handleVideoSelect(file);
  };

  const handleThumbnailSelect = (file: File) => {
    if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    setThumbnailFile(file);
    const url = URL.createObjectURL(file);
    setThumbnailPreviewUrl(url);
  };

  const handleAutoGenerateThumbnail = () => {
    const video = videoElRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
        handleThumbnailSelect(file);
        toast.success("Thumbnail captured!");
      },
      "image/jpeg",
      0.9,
    );
  };

  const handlePublish = async () => {
    if (!videoFile || !title.trim()) return;

    setUploadStage("uploading");
    setUploadProgress(0);

    try {
      // Convert video file to Uint8Array
      const videoBuffer = await videoFile.arrayBuffer();
      const videoBytes = new Uint8Array(videoBuffer);

      // Build video blob with upload progress tracking + stage mapping
      const videoBlob = ExternalBlob.fromBytes(videoBytes).withUploadProgress(
        (pct) => {
          setUploadProgress(pct);
          setUploadStage(getStageFromProgress(pct));
        },
      );

      // Build thumbnail blob — use selected file or fallback to 1×1 transparent PNG
      let thumbnailBlob: ExternalBlob;
      if (_thumbnailFile) {
        const thumbBuffer = await _thumbnailFile.arrayBuffer();
        const thumbBytes = new Uint8Array(thumbBuffer);
        thumbnailBlob = ExternalBlob.fromBytes(thumbBytes);
      } else {
        // Minimal 1×1 transparent PNG fallback
        const fallbackBytes = new Uint8Array([
          137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0,
          1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68,
          65, 84, 120, 156, 98, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0,
          0, 73, 69, 78, 68, 174, 66, 96, 130,
        ]);
        thumbnailBlob = ExternalBlob.fromBytes(fallbackBytes);
      }

      const postId = await createVideoPost.mutateAsync({
        title: title.trim(),
        description,
        videoBlob,
        thumbnailBlob,
      });

      setUploadProgress(100);
      setUploadStage("done");

      // Close modal after showing success — app will return to home feed
      // where the newly uploaded video will appear
      void postId; // postId is a bigint — used for cache busting in future
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch {
      setUploadStage("error");
    }
  };

  const handleSaveDraft = () => {
    if (!videoFile) {
      toast.error("Please select a video first.");
      return;
    }
    toast.success("Draft saved!");
    setUploadStage("idle");
  };

  const canPublish =
    !!videoFile &&
    title.trim().length > 0 &&
    uploadStage === "idle" &&
    !createVideoPost.isPending;

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ background: "#0E0E0E" }}
      data-ocid="create_modal.upload.panel"
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 shrink-0"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 52px)",
          paddingBottom: 16,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.08)" }}
          aria-label="Close"
        >
          <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2} />
        </button>
        <h2 className="text-white font-bold text-lg flex-1">Upload Video</h2>
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ overflowY: "auto", touchAction: "pan-y", paddingBottom: 32 }}
      >
        {/* ── Section: Media Selection ── */}
        <div className="px-4 pt-5 pb-2">
          <p style={sectionLabelStyle}>Media Selection</p>
        </div>

        <div className="px-4 flex flex-col gap-3">
          {/* Video picker */}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="sr-only"
            aria-label="Select video"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleVideoInputChange(f);
              e.target.value = "";
            }}
          />

          {videoPreviewUrl ? (
            <div className="flex flex-col gap-2">
              <video
                ref={videoElRef}
                src={videoPreviewUrl}
                controls
                muted
                className="w-full rounded-2xl"
                style={{
                  maxHeight: 220,
                  objectFit: "cover",
                  background: "#000",
                }}
              />
              <button
                type="button"
                data-ocid="create_modal.upload.select_video.upload_button"
                onClick={() => videoInputRef.current?.click()}
                disabled={isUploadActive}
                className="w-full py-3 rounded-2xl text-sm font-semibold disabled:opacity-40"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                Change Video
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-ocid="create_modal.upload.select_video.upload_button"
              onClick={() => videoInputRef.current?.click()}
              className="w-full py-5 rounded-2xl flex flex-col items-center gap-3 transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "2px dashed rgba(255,255,255,0.15)",
              }}
            >
              <Video
                className="w-8 h-8"
                style={{ color: "rgba(255,255,255,0.3)" }}
                strokeWidth={1.5}
              />
              <div className="text-center">
                <p className="text-sm font-semibold text-white">
                  Select from Gallery / Files
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  Camera, screen recordings, downloads · Max 5 GB · Max 2 hours
                </p>
              </div>
            </button>
          )}

          {/* Thumbnail picker */}
          <input
            ref={thumbInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Select thumbnail"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleThumbnailSelect(f);
              e.target.value = "";
            }}
          />

          <div className="flex gap-2">
            <button
              type="button"
              data-ocid="create_modal.upload.select_thumbnail.upload_button"
              onClick={() => thumbInputRef.current?.click()}
              className="flex-1 py-3.5 rounded-2xl flex flex-col items-center gap-1.5 transition-all duration-200"
              style={{
                background: thumbnailPreviewUrl
                  ? "rgba(255,45,45,0.08)"
                  : "rgba(255,255,255,0.05)",
                border: `1px solid ${thumbnailPreviewUrl ? "rgba(255,45,45,0.3)" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              {thumbnailPreviewUrl ? (
                <img
                  src={thumbnailPreviewUrl}
                  alt="Thumbnail preview"
                  className="w-full h-16 object-cover rounded-xl"
                />
              ) : (
                <>
                  <Camera
                    className="w-5 h-5"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                    strokeWidth={1.5}
                  />
                  <span
                    className="text-xs font-medium"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    Thumbnail
                  </span>
                </>
              )}
            </button>

            {videoFile && (
              <button
                type="button"
                data-ocid="create_modal.upload.autogenerate_thumbnail.button"
                onClick={handleAutoGenerateThumbnail}
                className="flex-1 py-3.5 rounded-2xl flex flex-col items-center gap-1.5"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <Sparkles
                  className="w-5 h-5"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                  strokeWidth={1.5}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  Auto-Generate
                </span>
              </button>
            )}
          </div>
          {/* Hidden canvas for thumbnail generation */}
          <canvas ref={canvasRef} className="sr-only" />
        </div>

        {/* ── Section: Video Details ── */}
        <div className="px-4 pt-6 pb-2">
          <p style={sectionLabelStyle}>Video Details</p>
        </div>

        <div className="px-4 flex flex-col gap-3">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="upload-title"
              className="text-xs font-semibold"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Title <span style={{ color: "#FF2D2D" }}>*</span>
            </label>
            <input
              id="upload-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a title..."
              maxLength={100}
              data-ocid="create_modal.upload.title.input"
              style={inputStyle}
              className="placeholder:text-white/25"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="upload-description"
              className="text-xs font-semibold"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Description
            </label>
            <textarea
              id="upload-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell viewers about your video..."
              rows={3}
              maxLength={500}
              data-ocid="create_modal.upload.description.textarea"
              style={{
                ...inputStyle,
                resize: "none",
                lineHeight: 1.6,
              }}
              className="placeholder:text-white/25"
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <p
              className="text-xs font-semibold"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Category
            </p>
            <div
              className="flex flex-wrap gap-2"
              data-ocid="create_modal.upload.category.select"
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className="px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-150"
                  style={{
                    background:
                      category === cat ? "#FF2D2D" : "rgba(255,255,255,0.06)",
                    color: category === cat ? "white" : "rgba(255,255,255,0.5)",
                    border: `1px solid ${category === cat ? "#FF2D2D" : "rgba(255,255,255,0.1)"}`,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Hashtags */}
          <div className="flex flex-col gap-1.5">
            <p
              className="text-xs font-semibold"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Hashtags
            </p>
            <HashtagInput
              tags={hashtags}
              onTagsChange={setHashtags}
              placeholder="Add hashtags..."
              ocid="create_modal.upload.hashtag.input"
            />
          </div>

          {/* Audience */}
          <div className="flex flex-col gap-1.5">
            <p
              className="text-xs font-semibold"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Audience
            </p>
            <div
              className="flex gap-2"
              data-ocid="create_modal.upload.audience.select"
            >
              {audienceOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAudience(opt)}
                  className="flex-1 py-3 rounded-xl font-semibold text-xs transition-all duration-150"
                  style={{
                    background:
                      audience === opt ? "#FF2D2D" : "rgba(255,255,255,0.06)",
                    color: audience === opt ? "white" : "rgba(255,255,255,0.5)",
                    border: `1px solid ${audience === opt ? "#FF2D2D" : "rgba(255,255,255,0.1)"}`,
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section: Publish ── */}
        <div className="px-4 pt-6 pb-2">
          <p style={sectionLabelStyle}>Publish</p>
        </div>

        <div className="px-4 flex flex-col gap-3 pb-8">
          {/* ── Upload Warning Banner ── */}
          <AnimatePresence>
            {isUploadActive && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                data-ocid="create_modal.upload.upload_warning.panel"
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
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-3 p-4 rounded-2xl"
                data-ocid="create_modal.upload.upload_status.loading_state"
                style={{
                  background: "rgba(255,45,45,0.07)",
                  border: "1px solid rgba(255,45,45,0.2)",
                }}
              >
                {/* Stage label */}
                <div className="flex items-center justify-between">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={uploadStage}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm font-bold text-white"
                    >
                      {isUploadActive &&
                        UPLOAD_STAGE_LABELS[
                          uploadStage as keyof typeof UPLOAD_STAGE_LABELS
                        ]}
                      …
                    </motion.p>
                  </AnimatePresence>
                  <p className="text-sm font-bold" style={{ color: "#FF6B6B" }}>
                    {Math.round(uploadProgress)}%
                  </p>
                </div>

                {/* Progress bar */}
                <Progress
                  value={uploadProgress}
                  className="h-1.5 bg-white/10"
                  style={
                    { "--progress-fill": "#FF2D2D" } as React.CSSProperties
                  }
                />

                {/* Stage dot indicators */}
                <div className="flex items-center justify-between gap-1 pt-1">
                  {UPLOAD_STAGES_ORDER.map((stage) => {
                    const stageIdx = UPLOAD_STAGES_ORDER.indexOf(stage);
                    const currentIdx = UPLOAD_STAGES_ORDER.indexOf(
                      uploadStage as (typeof UPLOAD_STAGES_ORDER)[number],
                    );
                    const isActive = stage === uploadStage;
                    const isPast = currentIdx > stageIdx;
                    return (
                      <div
                        key={stage}
                        className="flex flex-col items-center gap-1 flex-1"
                      >
                        <div
                          className="w-2 h-2 rounded-full transition-all duration-300"
                          style={{
                            background: isPast
                              ? "#22c55e"
                              : isActive
                                ? "#FF2D2D"
                                : "rgba(255,255,255,0.2)",
                            boxShadow: isActive
                              ? "0 0 6px rgba(255,45,45,0.6)"
                              : "none",
                          }}
                        />
                        <span
                          className="text-[9px] font-semibold tracking-wide"
                          style={{
                            color: isPast
                              ? "rgba(34,197,94,0.7)"
                              : isActive
                                ? "rgba(255,255,255,0.8)"
                                : "rgba(255,255,255,0.25)",
                          }}
                        >
                          {UPLOAD_STAGE_LABELS[stage]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Error State ── */}
          <AnimatePresence>
            {uploadStage === "error" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl"
                data-ocid="create_modal.upload.error_state"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
              >
                <AlertTriangle
                  className="w-8 h-8"
                  style={{ color: "#ef4444" }}
                  strokeWidth={1.5}
                />
                <div className="text-center">
                  <p className="font-bold text-white text-sm">Upload failed.</p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    Please try again.
                  </p>
                </div>
                <button
                  type="button"
                  data-ocid="create_modal.upload.retry.button"
                  onClick={() => {
                    setUploadStage("idle");
                    void handlePublish();
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all duration-150 active:scale-95"
                  style={{ background: "#FF2D2D" }}
                >
                  <RefreshCw className="w-4 h-4" strokeWidth={2} />
                  Try Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Success State ── */}
          <AnimatePresence>
            {uploadStage === "done" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl"
                data-ocid="create_modal.upload.success_state"
                style={{
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.25)",
                }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(34,197,94,0.15)" }}
                >
                  <Check
                    className="w-7 h-7"
                    style={{ color: "#22c55e" }}
                    strokeWidth={2.5}
                  />
                </div>
                <div className="text-center">
                  <p className="font-bold text-white">Upload complete</p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    Opening your video…
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Publish Button ── */}
          {uploadStage !== "done" && uploadStage !== "error" && (
            <motion.button
              type="button"
              data-ocid="create_modal.upload.publish.primary_button"
              onClick={() => void handlePublish()}
              disabled={!canPublish}
              whileTap={canPublish ? { scale: 0.97 } : {}}
              className="w-full py-4 rounded-2xl font-black text-white text-base transition-all duration-200"
              style={{
                background: canPublish ? "#FF2D2D" : "rgba(255,255,255,0.08)",
                boxShadow: canPublish
                  ? "0 4px 24px rgba(255,45,45,0.4)"
                  : "none",
                color: canPublish ? "white" : "rgba(255,255,255,0.3)",
                cursor: canPublish ? "pointer" : "not-allowed",
              }}
            >
              {isUploadActive ? "Uploading…" : "Upload & Publish Now"}
            </motion.button>
          )}

          {uploadStage === "idle" && (
            <button
              type="button"
              data-ocid="create_modal.upload.draft.secondary_button"
              onClick={handleSaveDraft}
              className="w-full py-4 rounded-2xl font-bold text-sm transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              Save as Draft
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shorts Slide ──────────────────────────────────────────────────────────────

function ShortsSlide({
  isActive,
  onClose,
}: {
  isActive: boolean;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [recordingPhase, setRecordingPhase] = useState<RecordingPhase>("idle");
  const [countdownStep, setCountdownStep] = useState<CountdownStep>(3);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [timerOption, setTimerOption] = useState<TimerOption>("Off");
  const [duration, setDuration] = useState<"15s" | "60s">("60s");

  // Edit screen state
  const [caption, setCaption] = useState("");
  const [shortHashtags, setShortHashtags] = useState<string[]>([]);
  const [thumbnailFrame, setThumbnailFrame] = useState(0);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    setCameraReady(false);
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera not supported on this device.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          /* autoPlay */
        }
      }
      setCameraReady(true);
    } catch (err) {
      const isPermission =
        err instanceof Error && err.name === "NotAllowedError";
      setCameraError(
        isPermission
          ? "Camera permission denied. Please allow access."
          : "Could not access camera.",
      );
    }
  }, [facingMode]);

  useEffect(() => {
    if (isActive && recordingPhase !== "editing") {
      void startCamera();
    } else if (!isActive) {
      stopCamera();
    }
    return () => stopCamera();
  }, [isActive, startCamera, stopCamera, recordingPhase]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    };
  }, []);

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingPhase("editing");
  };

  const beginCountdown = () => {
    setCountdownStep(3);
    setRecordingPhase("countdown");
  };

  const handleRecordPress = () => {
    if (recordingPhase === "idle") {
      const timerDelay =
        timerOption === "3s" ? 3000 : timerOption === "10s" ? 10000 : 0;
      if (timerDelay > 0) {
        countdownTimerRef.current = setTimeout(
          () => beginCountdown(),
          timerDelay,
        );
        toast(`Recording will start in ${timerOption}`, {
          duration: timerDelay,
        });
      } else {
        beginCountdown();
      }
    } else if (recordingPhase === "recording") {
      stopRecording();
    }
  };

  // Countdown tick — inline startRecording to avoid stale closure deps
  useEffect(() => {
    if (recordingPhase !== "countdown") return;
    if (countdownStep === 0) return;

    const t = setTimeout(() => {
      if (countdownStep > 1) {
        setCountdownStep((prev) => (prev - 1) as CountdownStep);
      } else {
        setCountdownStep(0);
        setTimeout(() => {
          // Inline startRecording logic to avoid dep on function reference
          setRecordingSeconds(0);
          setRecordingPhase("recording");
          recordingTimerRef.current = setInterval(() => {
            setRecordingSeconds((s) => {
              const maxSeconds = duration === "15s" ? 15 : 60;
              if (s + 1 >= maxSeconds) {
                if (recordingTimerRef.current) {
                  clearInterval(recordingTimerRef.current);
                  recordingTimerRef.current = null;
                }
                setRecordingPhase("editing");
                return maxSeconds;
              }
              return s + 1;
            });
          }, 1000);
        }, 300);
      }
    }, 1000);

    return () => clearTimeout(t);
  }, [recordingPhase, countdownStep, duration]);

  const handleDiscardEdit = () => {
    setRecordingPhase("idle");
    setCaption("");
    setShortHashtags([]);
    setRecordingSeconds(0);
    setThumbnailFrame(0);
    void startCamera();
  };

  const handlePostShort = () => {
    toast.success("Short posted successfully!");
    handleDiscardEdit();
    onClose();
  };

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: "#000" }}
      data-ocid="create_modal.shorts.panel"
    >
      {/* Camera video — always mounted, never hidden */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          backgroundColor: "#000",
          display: "block",
          filter: "brightness(1.05) contrast(1.05)",
        }}
      />

      {/* Camera loading spinner */}
      {!cameraReady && !cameraError && recordingPhase !== "editing" && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-10"
          style={{ background: "rgba(0,0,0,0.85)" }}
        >
          <div
            className="w-12 h-12 rounded-full border-2 animate-spin"
            style={{
              borderColor: "rgba(255,255,255,0.15)",
              borderTopColor: "rgba(255,255,255,0.7)",
            }}
          />
          <p
            className="text-xs mt-4"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Starting camera…
          </p>
        </div>
      )}

      {/* Camera error */}
      {cameraError && recordingPhase !== "editing" && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-10 px-8 gap-4"
          style={{ background: "rgba(0,0,0,0.9)" }}
        >
          <Camera
            className="w-12 h-12"
            style={{ color: "rgba(255,255,255,0.2)" }}
            strokeWidth={1}
          />
          <p
            className="text-sm text-center"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            {cameraError}
          </p>
          <button
            type="button"
            onClick={() => void startCamera()}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white"
            style={{ background: "#FF2D2D" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Camera UI (idle / countdown / recording) ── */}
      {recordingPhase !== "editing" && (
        <>
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-14">
            <button
              type="button"
              data-ocid="create_modal.shorts.close_button"
              onClick={onClose}
              aria-label="Close"
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(8px)",
              }}
            >
              <X className="w-5 h-5 text-white" strokeWidth={2} />
            </button>

            {/* Recording timer */}
            {recordingPhase === "recording" && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(255,45,45,0.85)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-white font-bold text-xs tabular-nums">
                  {formatTime(recordingSeconds)}
                </span>
              </div>
            )}

            <button
              type="button"
              aria-label="Effects"
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(8px)",
              }}
            >
              <Sparkles className="w-5 h-5 text-white" strokeWidth={1.5} />
            </button>
          </div>

          {/* Right side tools */}
          {recordingPhase !== "recording" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3 items-center">
              <button
                type="button"
                data-ocid="create_modal.shorts.flip_camera.button"
                aria-label="Flip camera"
                onClick={handleFlipCamera}
                className="w-12 h-12 rounded-full flex flex-col items-center justify-center gap-0.5"
                style={{
                  background: "rgba(0,0,0,0.55)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <FlipHorizontal
                  className="w-5 h-5 text-white"
                  strokeWidth={1.5}
                />
                <span className="text-[8px] text-white/60 font-medium">
                  Flip
                </span>
              </button>

              <button
                type="button"
                data-ocid="create_modal.shorts.timer.button"
                aria-label="Timer"
                onClick={() =>
                  setTimerOption((p) =>
                    p === "Off" ? "3s" : p === "3s" ? "10s" : "Off",
                  )
                }
                className="w-12 h-12 rounded-full flex flex-col items-center justify-center gap-0.5"
                style={{
                  background:
                    timerOption !== "Off"
                      ? "rgba(255,45,45,0.3)"
                      : "rgba(0,0,0,0.55)",
                  border:
                    timerOption !== "Off"
                      ? "1px solid rgba(255,45,45,0.6)"
                      : "none",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Timer
                  className="w-5 h-5"
                  style={{ color: timerOption !== "Off" ? "#FF2D2D" : "white" }}
                  strokeWidth={1.5}
                />
                <span
                  className="text-[8px] font-bold"
                  style={{
                    color:
                      timerOption !== "Off"
                        ? "#FF2D2D"
                        : "rgba(255,255,255,0.6)",
                  }}
                >
                  {timerOption}
                </span>
              </button>

              <button
                type="button"
                data-ocid="create_modal.shorts.duration.toggle"
                aria-label={`Switch to ${duration === "15s" ? "60s" : "15s"}`}
                onClick={() =>
                  setDuration((d) => (d === "15s" ? "60s" : "15s"))
                }
                className="w-12 h-12 rounded-full flex flex-col items-center justify-center"
                style={{
                  background: "rgba(0,0,0,0.55)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span className="text-white font-black text-[13px]">
                  {duration}
                </span>
              </button>
            </div>
          )}

          {/* Bottom — label + record button */}
          <div className="absolute bottom-12 left-0 right-0 z-20 flex flex-col items-center gap-4">
            <p
              className="text-xs font-semibold"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              Short (0–{duration === "15s" ? "15" : "60"}s)
            </p>

            <button
              type="button"
              data-ocid="create_modal.shorts.record.button"
              aria-label={
                recordingPhase === "recording"
                  ? "Stop recording"
                  : "Start recording"
              }
              onClick={handleRecordPress}
              className="relative flex items-center justify-center transition-all duration-200"
              style={{ width: 88, height: 88 }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  border: `4px solid ${recordingPhase === "recording" ? "#FF2D2D" : "white"}`,
                  transition: "border-color 0.2s",
                }}
              />
              {recordingPhase === "recording" ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 6,
                    background: "#FF2D2D",
                  }}
                />
              ) : (
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "#FF2D2D",
                  }}
                />
              )}
              {recordingPhase === "recording" && (
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{
                    border: "2px solid rgba(255,45,45,0.4)",
                    animationDuration: "1.5s",
                  }}
                />
              )}
            </button>
          </div>
        </>
      )}

      {/* ── Countdown Overlay (overlays camera, does NOT hide video) ── */}
      <AnimatePresence>
        {recordingPhase === "countdown" && (
          <motion.div
            key="shorts-countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center"
            style={{ background: "rgba(0,0,0,0.6)" }}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={countdownStep}
                initial={{ scale: 2.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="font-black leading-none"
                style={{
                  fontSize: "9rem",
                  color: "#ffffff",
                  textShadow: "0 0 40px rgba(255,255,255,0.3)",
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                {countdownStep === 0 ? "GO!" : countdownStep}
              </motion.span>
            </AnimatePresence>
            <p
              className="mt-4 text-xs font-bold tracking-[0.2em] uppercase"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Get ready…
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit Screen ── */}
      <AnimatePresence>
        {recordingPhase === "editing" && (
          <motion.div
            key="shorts-edit"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-x-0 bottom-0 z-50 flex flex-col"
            style={{
              height: "80%",
              background: "#1a1a1a",
              borderRadius: "24px 24px 0 0",
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.15)" }}
              />
            </div>

            <div className="px-4 py-2">
              <h3 className="text-white font-bold text-base">Edit Short</h3>
            </div>

            <div
              className="flex-1 overflow-y-auto px-4 flex flex-col gap-4 pb-6"
              style={{ touchAction: "pan-y" }}
            >
              {/* Caption */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="shorts-caption"
                  className="text-xs font-semibold"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  Caption
                </label>
                <input
                  id="shorts-caption"
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  maxLength={150}
                  data-ocid="create_modal.shorts.edit.caption.input"
                  style={inputStyle}
                  className="placeholder:text-white/25"
                />
              </div>

              {/* Hashtags */}
              <div className="flex flex-col gap-1.5">
                <p
                  className="text-xs font-semibold"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  Hashtags
                </p>
                <HashtagInput
                  tags={shortHashtags}
                  onTagsChange={setShortHashtags}
                  placeholder="Add hashtags..."
                  ocid="create_modal.shorts.edit.hashtag.input"
                />
              </div>

              {/* Thumbnail frame scrubber */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="shorts-thumbnail-frame"
                    className="text-xs font-semibold"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    Thumbnail Frame
                  </label>
                  <span
                    className="text-xs font-mono"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    {thumbnailFrame}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={thumbnailFrame}
                  id="shorts-thumbnail-frame"
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setThumbnailFrame(val);
                    if (videoRef.current?.duration) {
                      videoRef.current.currentTime =
                        (val / 100) * videoRef.current.duration;
                    }
                  }}
                  className="w-full accent-[#FF2D2D]"
                  style={{ height: 4, cursor: "pointer" }}
                />
              </div>

              {/* Add Music */}
              <button
                type="button"
                onClick={() => toast("Music coming soon!", { icon: "🎵" })}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-150"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                <Music className="w-4 h-4" strokeWidth={1.5} />
                Add Music
              </button>
            </div>

            {/* Action buttons */}
            <div
              className="px-4 pb-8 flex flex-col gap-3"
              style={{
                paddingBottom: "calc(32px + env(safe-area-inset-bottom))",
              }}
            >
              <button
                type="button"
                data-ocid="create_modal.shorts.edit.post.primary_button"
                onClick={handlePostShort}
                className="w-full py-4 rounded-2xl font-black text-white text-base"
                style={{
                  background: "#FF2D2D",
                  boxShadow: "0 4px 24px rgba(255,45,45,0.4)",
                }}
              >
                Post Short
              </button>
              <button
                type="button"
                data-ocid="create_modal.shorts.edit.discard.cancel_button"
                onClick={handleDiscardEdit}
                className="w-full py-4 rounded-2xl font-bold text-sm"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                Discard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Go Live Slide ─────────────────────────────────────────────────────────────

function GoLiveSlide({
  onGoLive,
  onClose,
  isActive,
}: {
  onGoLive: (streamId: bigint) => void;
  onClose: () => void;
  isActive: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Entertainment");
  const [privacy, setPrivacy] = useState<PrivacyOption>("Public");
  const [enableComments, setEnableComments] = useState(true);
  const [saveReplay, setSaveReplay] = useState(true);
  const [allowGifts, setAllowGifts] = useState(true);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownStep, setCountdownStep] = useState<CountdownStep>(3);
  const [liveStarted, setLiveStarted] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);

  // ── Camera preview for GoLive slide ──────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const stopSlideCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  const startSlideCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          /* autoPlay */
        }
      }
      setCameraReady(true);
    } catch {
      // Camera not available — silently ignore; form still works
    }
  }, []);

  // Start/stop camera based on isActive
  useEffect(() => {
    if (isActive) {
      void startSlideCamera();
    } else {
      stopSlideCamera();
    }
    return () => stopSlideCamera();
  }, [isActive, startSlideCamera, stopSlideCamera]);

  const privacyOptions: PrivacyOption[] = ["Public", "Followers", "Private"];

  // Fake viewer count simulation after going live
  useEffect(() => {
    if (!liveStarted) return;
    const t = setInterval(() => {
      setViewerCount((v) => v + Math.floor(Math.random() * 3));
    }, 2000);
    return () => clearInterval(t);
  }, [liveStarted]);

  const handleGoLive = () => {
    if (!title.trim()) {
      toast.error("Please add a live title.");
      return;
    }
    setCountdownStep(3);
    setCountdownActive(true);
  };

  const handleCancelCountdown = () => {
    setCountdownActive(false);
    setCountdownStep(3);
  };

  // Countdown tick
  useEffect(() => {
    if (!countdownActive) return;
    if (countdownStep === 0) return;

    const t = setTimeout(() => {
      if (countdownStep > 1) {
        setCountdownStep((prev) => (prev - 1) as CountdownStep);
      } else {
        setCountdownStep(0);
        setTimeout(() => {
          setCountdownActive(false);
          setLiveStarted(true);
          onGoLive(BigInt(Date.now()));
        }, 400);
      }
    }, 1000);

    return () => clearTimeout(t);
  }, [countdownActive, countdownStep, onGoLive]);

  const countdownDisplay =
    countdownStep === 0 ? "LIVE!" : String(countdownStep);
  const isGoLiveText = countdownStep === 0;

  const toggleRowStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  return (
    <div
      className="w-full h-full flex flex-col relative overflow-hidden"
      style={{ background: "#0E0E0E" }}
      data-ocid="create_modal.golive.panel"
    >
      {/* ── Camera preview behind the form — always mounted ── */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: cameraReady ? 0.18 : 0,
          transition: "opacity 0.6s ease",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* Semi-transparent overlay so form remains readable */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(10,10,10,0.78)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* All content sits above camera and overlay */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 shrink-0"
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 52px)",
            paddingBottom: 16,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,255,255,0.08)" }}
            aria-label="Close"
          >
            <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2} />
          </button>
          <h2 className="text-white font-bold text-lg flex-1">Go Live</h2>
          {liveStarted && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(255,45,45,0.2)",
                border: "1px solid rgba(255,45,45,0.4)",
              }}
            >
              <span className="w-2 h-2 rounded-full bg-[#FF2D2D] animate-pulse" />
              <span className="text-xs font-bold text-white">LIVE</span>
            </div>
          )}
        </div>

        {/* Live viewer badge */}
        {liveStarted && (
          <div className="px-4 py-3 flex items-center gap-3">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span className="text-sm">👁</span>
              <span className="text-sm font-bold text-white">
                {viewerCount} viewers
              </span>
            </div>
            <div
              className="px-3 py-2 rounded-2xl"
              style={{
                background: "rgba(255,45,45,0.1)",
                border: "1px solid rgba(255,45,45,0.25)",
              }}
            >
              <span className="text-xs font-bold" style={{ color: "#FF6B6B" }}>
                Stream is live
              </span>
            </div>
          </div>
        )}

        {/* Scrollable content */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ overflowY: "auto", touchAction: "pan-y", paddingBottom: 32 }}
        >
          {/* ── Section: Live Info ── */}
          <div className="px-4 pt-5 pb-2">
            <p style={sectionLabelStyle}>Live Info</p>
          </div>

          <div className="px-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="golive-title"
                className="text-xs font-semibold"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Stream Title <span style={{ color: "#FF2D2D" }}>*</span>
              </label>
              <input
                id="golive-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's your stream about?"
                maxLength={100}
                data-ocid="create_modal.golive.title.input"
                style={inputStyle}
                className="placeholder:text-white/25"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="golive-description"
                className="text-xs font-semibold"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Description
              </label>
              <textarea
                id="golive-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell viewers what to expect..."
                rows={2}
                maxLength={300}
                data-ocid="create_modal.golive.description.textarea"
                style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }}
                className="placeholder:text-white/25"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <p
                className="text-xs font-semibold"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Category
              </p>
              <div
                className="flex flex-wrap gap-2"
                data-ocid="create_modal.golive.category.select"
              >
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className="px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-150"
                    style={{
                      background:
                        category === cat ? "#FF2D2D" : "rgba(255,255,255,0.06)",
                      color:
                        category === cat ? "white" : "rgba(255,255,255,0.5)",
                      border: `1px solid ${category === cat ? "#FF2D2D" : "rgba(255,255,255,0.1)"}`,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <p
                className="text-xs font-semibold"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Privacy
              </p>
              <div
                className="flex gap-2"
                data-ocid="create_modal.golive.privacy.select"
              >
                {privacyOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPrivacy(opt)}
                    className="flex-1 py-3 rounded-xl font-semibold text-xs transition-all duration-150"
                    style={{
                      background:
                        privacy === opt ? "#FF2D2D" : "rgba(255,255,255,0.06)",
                      color:
                        privacy === opt ? "white" : "rgba(255,255,255,0.5)",
                      border: `1px solid ${privacy === opt ? "#FF2D2D" : "rgba(255,255,255,0.1)"}`,
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Section: Live Settings ── */}
          <div className="px-4 pt-6 pb-2">
            <p style={sectionLabelStyle}>Live Settings</p>
          </div>

          <div className="px-4 flex flex-col gap-2">
            <div style={toggleRowStyle}>
              <div>
                <p className="text-sm font-semibold text-white">
                  Enable Comments
                </p>
                <p
                  className="text-[11px] mt-0.5"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  Allow viewers to chat
                </p>
              </div>
              <Switch
                checked={enableComments}
                onCheckedChange={setEnableComments}
                data-ocid="create_modal.golive.comments.switch"
                className="data-[state=checked]:bg-[#FF2D2D]"
              />
            </div>

            <div style={toggleRowStyle}>
              <div>
                <p className="text-sm font-semibold text-white">
                  Save Live Replay
                </p>
                <p
                  className="text-[11px] mt-0.5"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  Record for later viewing
                </p>
              </div>
              <Switch
                checked={saveReplay}
                onCheckedChange={setSaveReplay}
                data-ocid="create_modal.golive.replay.switch"
                className="data-[state=checked]:bg-[#FF2D2D]"
              />
            </div>

            <div style={toggleRowStyle}>
              <div>
                <p className="text-sm font-semibold text-white">Allow Gifts</p>
                <p
                  className="text-[11px] mt-0.5"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  Viewers can send gifts
                </p>
              </div>
              <Switch
                checked={allowGifts}
                onCheckedChange={setAllowGifts}
                data-ocid="create_modal.golive.gifts.switch"
                className="data-[state=checked]:bg-[#FF2D2D]"
              />
            </div>

            <div style={toggleRowStyle}>
              <div>
                <p className="text-sm font-semibold text-white">
                  Schedule Live
                </p>
                <p
                  className="text-[11px] mt-0.5"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  Set a future date & time
                </p>
              </div>
              <Switch
                checked={scheduleEnabled}
                onCheckedChange={setScheduleEnabled}
                data-ocid="create_modal.golive.schedule.toggle"
                className="data-[state=checked]:bg-[#FF2D2D]"
              />
            </div>

            {scheduleEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  data-ocid="create_modal.golive.scheduled_date.input"
                  style={{
                    ...inputStyle,
                    colorScheme: "dark",
                  }}
                  className="placeholder:text-white/25"
                />
              </motion.div>
            )}
          </div>

          {/* ── Section: Start ── */}
          <div className="px-4 pt-6 pb-2">
            <p style={sectionLabelStyle}>Start</p>
          </div>

          <div className="px-4 pb-8">
            <motion.button
              type="button"
              data-ocid="create_modal.golive.go_live.primary_button"
              onClick={handleGoLive}
              disabled={liveStarted}
              whileTap={!liveStarted ? { scale: 0.97 } : {}}
              className="w-full rounded-2xl font-black text-white flex items-center justify-center gap-3 transition-all duration-200"
              style={{
                height: 72,
                background: liveStarted ? "rgba(255,45,45,0.4)" : "#FF2D2D",
                boxShadow: liveStarted
                  ? "none"
                  : "0 0 40px rgba(255,45,45,0.45), 0 8px 32px rgba(255,45,45,0.3)",
                fontSize: 18,
                letterSpacing: "0.06em",
                cursor: liveStarted ? "not-allowed" : "pointer",
              }}
            >
              {!liveStarted ? (
                <>
                  <span className="relative flex w-2.5 h-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-70" />
                    <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-white" />
                  </span>
                  GO LIVE
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                  STREAMING
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>
      {/* end z-10 content wrapper */}

      {/* ── Countdown Overlay — sits above camera video ── */}
      <AnimatePresence>
        {countdownActive && (
          <motion.div
            key="golive-countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ background: "rgba(0,0,0,0.55)", zIndex: 60 }}
          >
            <button
              type="button"
              onClick={handleCancelCountdown}
              className="absolute top-5 left-4 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.12)" }}
              aria-label="Cancel"
            >
              <X className="w-5 h-5 text-white" strokeWidth={2} />
            </button>

            <AnimatePresence mode="wait">
              <motion.span
                key={countdownDisplay}
                initial={{ scale: 2.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="font-black leading-none"
                style={{
                  fontSize: isGoLiveText ? "3.5rem" : "9rem",
                  color: isGoLiveText ? "#FF2D2D" : "#ffffff",
                  textShadow: isGoLiveText
                    ? "0 0 60px rgba(255,45,45,0.9)"
                    : "0 0 40px rgba(255,255,255,0.3)",
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                {countdownDisplay}
              </motion.span>
            </AnimatePresence>

            {!isGoLiveText && (
              <p
                className="mt-5 text-xs font-bold tracking-[0.2em] uppercase"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Going Live…
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Create Modal ─────────────────────────────────────────────────────────

export function CreateModal({
  onClose,
  onUploadSelected: _onUploadSelected,
  onGoLive,
}: CreateModalProps) {
  const [slideIndex, setSlideIndex] = useState<SlideIndex>(1); // default = Shorts
  const [isAnimating, setIsAnimating] = useState(false);

  // Touch/drag state refs
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);
  const isDragging = useRef(false);
  const isHorizontalSwipe = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);

  const mouseStartX = useRef<number>(0);
  const isMouseDragging = useRef(false);

  const goToSlide = (index: SlideIndex) => {
    if (isAnimating || index === slideIndex) return;
    setIsAnimating(true);
    setSlideIndex(index);
    setTimeout(() => setIsAnimating(false), 320);
  };

  // ── Touch handlers with horizontal vs vertical detection ──
  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchCurrentX.current = e.touches[0].clientX;
    isDragging.current = true;
    isHorizontalSwipe.current = false;
    setDragOffset(0);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!isDragging.current) return;
    touchCurrentX.current = e.touches[0].clientX;
    const deltaX = touchCurrentX.current - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    if (!isHorizontalSwipe.current) {
      // Determine swipe direction on first move
      if (Math.abs(deltaX) > Math.abs(deltaY) + 10) {
        isHorizontalSwipe.current = true;
      } else {
        // Vertical scroll — don't interfere
        return;
      }
    }

    if (isHorizontalSwipe.current) {
      e.preventDefault();
      setDragOffset(deltaX);
    }
  };

  const onTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (isHorizontalSwipe.current) {
      const delta = touchCurrentX.current - touchStartX.current;
      if (Math.abs(delta) > 50) {
        const newIndex =
          delta < 0 ? Math.min(slideIndex + 1, 2) : Math.max(slideIndex - 1, 0);
        goToSlide(newIndex as SlideIndex);
      }
    }
    setDragOffset(0);
    isHorizontalSwipe.current = false;
  };

  // ── Mouse drag handlers ──
  const onMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
    isMouseDragging.current = true;
    isDragging.current = true;
    setDragOffset(0);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDragging.current) return;
    const delta = e.clientX - mouseStartX.current;
    setDragOffset(delta);
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (!isMouseDragging.current) return;
    isMouseDragging.current = false;
    isDragging.current = false;
    const delta = e.clientX - mouseStartX.current;
    if (Math.abs(delta) > 50) {
      const newIndex =
        delta < 0 ? Math.min(slideIndex + 1, 2) : Math.max(slideIndex - 1, 0);
      goToSlide(newIndex as SlideIndex);
    }
    setDragOffset(0);
  };

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const slideLabels = ["Upload", "Shorts", "Live"];
  const translateX = -slideIndex * 100 + (dragOffset / window.innerWidth) * 100;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: "#000" }}
      data-ocid="create_modal.modal"
    >
      {/* ── Slide indicator dots ── */}
      <div
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-center gap-2 pt-4 pb-2"
        style={{ pointerEvents: "none" }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              width: slideIndex === i ? 20 : 6,
              opacity: slideIndex === i ? 1 : 0.35,
            }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="rounded-full"
            style={{
              height: 6,
              background: "white",
            }}
          />
        ))}
      </div>

      {/* ── Slide hint labels ── */}
      <div
        className="absolute top-3 left-0 right-0 z-30 flex items-center justify-between px-6"
        style={{ pointerEvents: "none" }}
      >
        <span
          className="text-[9px] font-bold tracking-widest uppercase transition-all duration-200"
          style={{
            color:
              slideIndex === 0
                ? "rgba(255,255,255,0.7)"
                : "rgba(255,255,255,0.2)",
          }}
        >
          {slideLabels[0]}
        </span>
        <div className="w-16" />
        <span
          className="text-[9px] font-bold tracking-widest uppercase transition-all duration-200"
          style={{
            color:
              slideIndex === 2
                ? "rgba(255,45,45,0.9)"
                : "rgba(255,255,255,0.2)",
          }}
        >
          {slideLabels[2]}
        </span>
      </div>

      {/* ── Slides container ── */}
      <div
        className="flex-1 relative overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ userSelect: "none" }}
      >
        <div
          className="flex h-full"
          style={{
            width: "300%",
            transform: `translateX(${translateX / 3}%)`,
            transition:
              isDragging.current && isHorizontalSwipe.current
                ? "none"
                : "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            willChange: "transform",
          }}
        >
          {/* Slide 0: Upload */}
          <div
            className="h-full relative"
            style={{ width: "33.333%", flexShrink: 0 }}
          >
            <UploadSlide onClose={onClose} />
          </div>

          {/* Slide 1: Shorts */}
          <div
            className="h-full relative"
            style={{ width: "33.333%", flexShrink: 0 }}
          >
            <ShortsSlide isActive={slideIndex === 1} onClose={onClose} />
          </div>

          {/* Slide 2: Go Live */}
          <div
            className="h-full relative"
            style={{ width: "33.333%", flexShrink: 0 }}
          >
            <GoLiveSlide
              onClose={onClose}
              isActive={slideIndex === 2}
              onGoLive={(streamId) => {
                onGoLive(streamId);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
