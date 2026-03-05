import { Switch } from "@/components/ui/switch";
import {
  Camera,
  CloudUpload,
  FlipHorizontal,
  Sparkles,
  Timer,
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

interface CreateModalProps {
  onClose: () => void;
  onUploadSelected: (file: File) => void;
  onGoLive: (streamId: bigint) => void;
}

type SlideIndex = 0 | 1 | 2;
type PrivacyOption = "Public" | "Followers" | "Private";
type TimerOption = "Off" | "3s" | "10s";
type CountdownStep = 3 | 2 | 1 | 0;

// ─── Upload Slide ──────────────────────────────────────────────────────────────
function UploadSlide({
  onFileSelect,
}: {
  onFileSelect: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFile = (file: File) => {
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("video/")) handleFile(file);
  };

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center px-6 gap-6"
      style={{ background: "#0E0E0E" }}
      data-ocid="create_modal.upload.panel"
    >
      {/* Label */}
      <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500">
        Upload
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        data-ocid="create_modal.upload.dropzone"
        className="w-full flex flex-col items-center justify-center gap-4 rounded-2xl transition-all duration-200"
        style={{
          border: `2px dashed ${isDragging ? "#FF2D2D" : "rgba(255,255,255,0.15)"}`,
          background: isDragging
            ? "rgba(255,45,45,0.06)"
            : "rgba(255,255,255,0.03)",
          minHeight: 220,
          padding: 32,
        }}
      >
        {selectedFile ? (
          <>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,45,45,0.15)" }}
            >
              <CloudUpload
                className="w-8 h-8"
                style={{ color: "#FF2D2D" }}
                strokeWidth={1.5}
              />
            </div>
            <p
              className="text-sm font-semibold text-center truncate max-w-full"
              style={{ color: "rgba(255,255,255,0.9)" }}
            >
              {selectedFile.name}
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Video selected — tap "Select From Gallery" to change
            </p>
          </>
        ) : (
          <>
            <CloudUpload
              className="w-16 h-16"
              style={{ color: "rgba(255,255,255,0.25)" }}
              strokeWidth={1}
            />
            <div className="text-center">
              <p
                className="text-lg font-bold"
                style={{ color: "rgba(255,255,255,0.9)" }}
              >
                Upload Video
              </p>
              <p
                className="text-xs mt-1.5"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Drag & drop or select from gallery
              </p>
            </div>
          </>
        )}
      </div>

      {/* Select button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        aria-label="Select video from gallery"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        data-ocid="create_modal.upload.upload_button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all duration-200"
        style={{
          background: "#FF2D2D",
          boxShadow: "0 4px 20px rgba(255,45,45,0.4)",
        }}
      >
        Select From Gallery
      </button>
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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [timerOption, setTimerOption] = useState<TimerOption>("Off");
  const [duration, setDuration] = useState<"15s" | "60s">("60s");

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
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // autoPlay handles it
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

  // Start/stop camera based on active state
  useEffect(() => {
    if (isActive) {
      void startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isActive, startCamera, stopCamera]);

  const cycleTimer = () => {
    setTimerOption((prev) =>
      prev === "Off" ? "3s" : prev === "3s" ? "10s" : "Off",
    );
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: "#000" }}
      data-ocid="create_modal.shorts.panel"
    >
      {/* Camera video — always mounted */}
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
          filter: "brightness(1.1) contrast(1.05)",
        }}
      />

      {/* Loading */}
      {!cameraReady && !cameraError && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-10"
          style={{ background: "#000" }}
        >
          <div
            className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin"
            style={{
              borderColor: "rgba(255,255,255,0.3)",
              borderTopColor: "transparent",
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
      {cameraError && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-10 px-8 gap-4"
          style={{ background: "#000" }}
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

      {/* Top bar — close & effects */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-5">
        <button
          type="button"
          data-ocid="create_modal.shorts.close_button"
          onClick={onClose}
          aria-label="Close"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <X className="w-5 h-5 text-white" strokeWidth={2} />
        </button>

        <p
          className="text-[10px] font-bold tracking-[0.2em] uppercase"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          Shorts
        </p>

        <button
          type="button"
          data-ocid="create_modal.shorts.effects.button"
          aria-label="Effects"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <Sparkles className="w-5 h-5 text-white" strokeWidth={1.5} />
        </button>
      </div>

      {/* Right side tools */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3 items-center">
        {/* Flip camera */}
        <button
          type="button"
          aria-label="Flip camera"
          onClick={() =>
            setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
          }
          className="w-12 h-12 rounded-full flex flex-col items-center justify-center gap-0.5"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <FlipHorizontal className="w-5 h-5 text-white" strokeWidth={1.5} />
          <span className="text-[8px] text-white/60 font-medium">Flip</span>
        </button>

        {/* Timer */}
        <button
          type="button"
          aria-label="Timer"
          onClick={cycleTimer}
          className="w-12 h-12 rounded-full flex flex-col items-center justify-center gap-0.5"
          style={{
            background:
              timerOption !== "Off"
                ? "rgba(255,45,45,0.3)"
                : "rgba(0,0,0,0.55)",
            border:
              timerOption !== "Off" ? "1px solid rgba(255,45,45,0.6)" : "none",
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
                timerOption !== "Off" ? "#FF2D2D" : "rgba(255,255,255,0.6)",
            }}
          >
            {timerOption}
          </span>
        </button>

        {/* Duration toggle */}
        <button
          type="button"
          data-ocid="create_modal.shorts.duration.toggle"
          aria-label={`Switch to ${duration === "15s" ? "60s" : "15s"}`}
          onClick={() => setDuration((d) => (d === "15s" ? "60s" : "15s"))}
          className="w-12 h-12 rounded-full flex flex-col items-center justify-center"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <span className="text-white font-black text-[13px]">{duration}</span>
        </button>
      </div>

      {/* Bottom — label + record button */}
      <div className="absolute bottom-12 left-0 right-0 z-20 flex flex-col items-center gap-4">
        <p
          className="text-xs font-semibold"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          Short (0–60s)
        </p>

        {/* Record button */}
        <button
          type="button"
          data-ocid="create_modal.shorts.record.button"
          aria-label={isRecording ? "Stop recording" : "Start recording"}
          onClick={() => setIsRecording((r) => !r)}
          className="relative flex items-center justify-center transition-all duration-200"
          style={{ width: 88, height: 88 }}
        >
          {/* Outer ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              border: `4px solid ${isRecording ? "#FF2D2D" : "white"}`,
              transition: "border-color 0.2s",
            }}
          />
          {/* Inner dot / square */}
          <motion.div
            animate={{
              width: isRecording ? 30 : 64,
              height: isRecording ? 30 : 64,
              borderRadius: isRecording ? 6 : 32,
              backgroundColor: "#FF2D2D",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          />
          {/* Pulse ring when recording */}
          {isRecording && (
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
    </div>
  );
}

// ─── Go Live Slide ─────────────────────────────────────────────────────────────
function GoLiveSlide({ onGoLive }: { onGoLive: (streamId: bigint) => void }) {
  const [title, setTitle] = useState("");
  const [privacy, setPrivacy] = useState<PrivacyOption>("Public");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownStep, setCountdownStep] = useState<CountdownStep>(3);

  const privacyOptions: PrivacyOption[] = ["Public", "Followers", "Private"];

  const handleGoLive = () => {
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
          onGoLive(BigInt(Date.now()));
        }, 400);
      }
    }, 1000);

    return () => clearTimeout(t);
  }, [countdownActive, countdownStep, onGoLive]);

  const countdownDisplay =
    countdownStep === 0 ? "LIVE!" : String(countdownStep);
  const isGoLiveText = countdownStep === 0;

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center px-6 gap-5 overflow-hidden"
      style={{ background: "#0E0E0E" }}
      data-ocid="create_modal.golive.panel"
    >
      {/* Label */}
      <p
        className="text-[10px] font-bold tracking-[0.2em] uppercase"
        style={{ color: "#FF2D2D" }}
      >
        Go Live
      </p>

      {/* Title input */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Stream title..."
        maxLength={100}
        data-ocid="create_modal.golive.title.input"
        className="w-full outline-none placeholder:text-gray-600 text-white text-base font-medium rounded-2xl px-4 py-4"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          fontSize: 15,
        }}
      />

      {/* Privacy selector */}
      <div className="w-full flex flex-col gap-2">
        <p
          className="text-xs font-semibold"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          Audience
        </p>
        <div
          className="flex gap-2"
          data-ocid="create_modal.golive.privacy.select"
        >
          {privacyOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPrivacy(option)}
              className="flex-1 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200"
              style={{
                background:
                  privacy === option ? "#FF2D2D" : "rgba(255,255,255,0.06)",
                color: privacy === option ? "white" : "rgba(255,255,255,0.5)",
                border:
                  privacy === option
                    ? "1px solid #FF2D2D"
                    : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule toggle */}
      <div
        className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div>
          <p className="text-sm font-semibold text-white">Schedule Live</p>
          <p
            className="text-[11px]"
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

      {/* GO LIVE button */}
      <motion.button
        type="button"
        data-ocid="create_modal.golive.go_live.primary_button"
        onClick={handleGoLive}
        whileTap={{ scale: 0.97 }}
        className="w-full rounded-2xl font-black text-white flex items-center justify-center gap-3"
        style={{
          height: 72,
          background: "#FF2D2D",
          boxShadow:
            "0 0 40px rgba(255,45,45,0.45), 0 8px 32px rgba(255,45,45,0.3)",
          fontSize: 18,
          letterSpacing: "0.06em",
        }}
      >
        <span className="relative flex w-2.5 h-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-70" />
          <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-white" />
        </span>
        GO LIVE
      </motion.button>

      {/* Countdown overlay */}
      <AnimatePresence>
        {countdownActive && (
          <motion.div
            key="golive-countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: "rgba(0,0,0,0.88)" }}
          >
            {/* Cancel button */}
            <button
              type="button"
              onClick={handleCancelCountdown}
              className="absolute top-5 left-4 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              <X className="w-5 h-5 text-white" strokeWidth={2} />
            </button>

            {/* Countdown number */}
            <AnimatePresence mode="wait">
              <motion.span
                key={countdownDisplay}
                initial={{ scale: 2.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="font-black"
                style={{
                  fontSize: isGoLiveText ? "3.5rem" : "9rem",
                  color: isGoLiveText ? "#FF2D2D" : "#ffffff",
                  textShadow: isGoLiveText
                    ? "0 0 60px rgba(255,45,45,0.9)"
                    : "0 0 40px rgba(255,255,255,0.3)",
                  lineHeight: 1,
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
  onUploadSelected,
  onGoLive,
}: CreateModalProps) {
  const [slideIndex, setSlideIndex] = useState<SlideIndex>(1); // default = Shorts
  const [isAnimating, setIsAnimating] = useState(false);

  // Touch/drag state
  const touchStartX = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);
  const isDragging = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);

  const goToSlide = (index: SlideIndex) => {
    if (isAnimating || index === slideIndex) return;
    setIsAnimating(true);
    setSlideIndex(index);
    setTimeout(() => setIsAnimating(false), 320);
  };

  // Touch handlers
  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    isDragging.current = true;
    setDragOffset(0);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!isDragging.current) return;
    touchCurrentX.current = e.touches[0].clientX;
    const delta = touchCurrentX.current - touchStartX.current;
    setDragOffset(delta);
  };

  const onTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const delta = touchCurrentX.current - touchStartX.current;

    if (Math.abs(delta) > 50) {
      const newIndex =
        delta < 0 ? Math.min(slideIndex + 1, 2) : Math.max(slideIndex - 1, 0);
      goToSlide(newIndex as SlideIndex);
    }
    setDragOffset(0);
  };

  // Mouse drag handlers (desktop)
  const mouseStartX = useRef<number>(0);
  const isMouseDragging = useRef(false);

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

  // Prevent body scroll when modal is open
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
      {/* Page indicator dots */}
      <div
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-center gap-2 pt-3 pb-2"
        style={{ pointerEvents: "none" }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: slideIndex === i ? 20 : 6,
              height: 6,
              background: slideIndex === i ? "white" : "rgba(255,255,255,0.25)",
            }}
          />
        ))}
      </div>

      {/* Slide hint labels (top) */}
      <div
        className="absolute top-3.5 left-0 right-0 z-30 flex items-center justify-between px-6"
        style={{ pointerEvents: "none" }}
      >
        <span
          className="text-[9px] font-bold tracking-widest uppercase transition-all duration-200"
          style={{
            color:
              slideIndex === 0
                ? "rgba(255,255,255,0.8)"
                : "rgba(255,255,255,0.2)",
          }}
        >
          {slideLabels[0]}
        </span>
        <div className="w-16" /> {/* dots space */}
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

      {/* Slides container */}
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
            transition: isDragging.current
              ? "none"
              : "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            willChange: "transform",
          }}
        >
          {/* Slide 0: Upload */}
          <div className="flex-1 h-full relative" style={{ width: "33.333%" }}>
            <UploadSlide
              onFileSelect={(file) => {
                onUploadSelected(file);
                onClose();
              }}
            />
          </div>

          {/* Slide 1: Shorts */}
          <div className="flex-1 h-full relative" style={{ width: "33.333%" }}>
            <ShortsSlide isActive={slideIndex === 1} onClose={onClose} />
          </div>

          {/* Slide 2: Go Live */}
          <div className="flex-1 h-full relative" style={{ width: "33.333%" }}>
            <GoLiveSlide
              onGoLive={(streamId) => {
                onGoLive(streamId);
                onClose();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
