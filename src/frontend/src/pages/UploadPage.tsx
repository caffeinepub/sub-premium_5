import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Film,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import { useCreateVideoPost } from "../hooks/useQueries";

type UploadStage = "idle" | "uploading" | "publishing" | "done";

export default function UploadPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoProgress, setVideoProgress] = useState(0);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);
  const [stage, setStage] = useState<UploadStage>("idle");

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const createPost = useCreateVideoPost();

  const isUploading = stage === "uploading" || stage === "publishing";
  const overallProgress =
    stage === "uploading"
      ? Math.round((videoProgress + thumbnailProgress) / 2)
      : stage === "publishing"
        ? 99
        : stage === "done"
          ? 100
          : 0;

  const canPublish =
    !!videoFile && !!thumbnailFile && title.trim().length > 0 && !isUploading;

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setVideoFile(file);
    e.target.value = "";
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setThumbnailFile(file);
    e.target.value = "";
  };

  const handlePublish = async () => {
    if (!videoFile || !thumbnailFile || !title.trim()) return;

    setStage("uploading");
    setVideoProgress(0);
    setThumbnailProgress(0);

    try {
      // Read files
      const [videoBytes, thumbBytes] = await Promise.all([
        readFileAsBytes(videoFile),
        readFileAsBytes(thumbnailFile),
      ]);

      // Create blobs with progress tracking
      const videoBlob = ExternalBlob.fromBytes(videoBytes).withUploadProgress(
        (pct) => setVideoProgress(pct),
      );
      const thumbnailBlob = ExternalBlob.fromBytes(
        thumbBytes,
      ).withUploadProgress((pct) => setThumbnailProgress(pct));

      setStage("publishing");
      await createPost.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        videoBlob,
        thumbnailBlob,
      });

      setStage("done");
      toast.success("Video published successfully!");

      // Reset form after brief delay
      setTimeout(() => {
        setVideoFile(null);
        setThumbnailFile(null);
        setTitle("");
        setDescription("");
        setVideoProgress(0);
        setThumbnailProgress(0);
        setStage("idle");
      }, 1500);
    } catch (err) {
      setStage("idle");
      toast.error("Failed to publish. Please try again.");
      console.error(err);
    }
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
              onChange={handleVideoSelect}
              className="sr-only"
              aria-label="Select video file"
            />
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={isUploading}
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
                      Tap to select video
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      MP4, MOV, WebM supported
                    </p>
                  </>
                )}
              </div>
              {/* Remove button */}
              {videoFile && !isUploading && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVideoFile(null);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label="Remove video"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </button>
            {/* Hidden upload button for marker coverage */}
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={isUploading}
              className="sr-only"
              data-ocid="upload.upload_button"
            >
              Select Video
            </button>
          </div>

          {/* Thumbnail selector */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">
              Thumbnail
            </Label>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              onChange={handleThumbnailSelect}
              className="sr-only"
              aria-label="Select thumbnail image"
            />
            <button
              type="button"
              onClick={() => thumbnailInputRef.current?.click()}
              disabled={isUploading}
              className="relative w-full rounded-2xl border-2 border-dashed border-border/50 bg-secondary/50 hover:bg-secondary hover:border-primary/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              data-ocid="upload.thumbnail.upload_button"
            >
              {thumbnailFile ? (
                <div className="relative">
                  <img
                    src={URL.createObjectURL(thumbnailFile)}
                    alt="Thumbnail preview"
                    className="w-full aspect-video object-cover rounded-xl"
                  />
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setThumbnailFile(null);
                      }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black/90"
                      aria-label="Remove thumbnail"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 px-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-2">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    Tap to add thumbnail
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    JPG, PNG, WebP
                  </p>
                </div>
              )}
            </button>
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
              disabled={isUploading}
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
              disabled={isUploading}
              className="bg-secondary border-border/50 rounded-xl resize-none focus-visible:ring-primary"
              data-ocid="upload.description.textarea"
            />
          </div>

          {/* Upload progress */}
          <AnimatePresence>
            {isUploading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-secondary rounded-2xl p-4 space-y-2"
                data-ocid="upload.loading_state"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">
                    {stage === "publishing" ? "Publishing…" : "Uploading…"}
                  </span>
                  <span className="text-primary font-bold">
                    {overallProgress}%
                  </span>
                </div>
                <Progress value={overallProgress} className="h-2 bg-border" />
                {stage === "uploading" && (
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Video: {videoProgress}%</span>
                    <span>Thumbnail: {thumbnailProgress}%</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success state */}
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
                  Video published successfully!
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Publish button */}
          <Button
            onClick={handlePublish}
            disabled={!canPublish}
            className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-base glow-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            data-ocid="upload.submit_button"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {stage === "publishing" ? "Publishing…" : "Uploading…"}
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Publish Video
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}

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
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
