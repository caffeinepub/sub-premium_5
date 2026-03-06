import {
  ArrowLeft,
  Camera,
  FlipHorizontal,
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  PhoneOff,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";

interface NewLiveStreamScreenProps {
  streamId: bigint;
  onBack: () => void;
  /** Called after countdown finishes — camera stream is already running */
  onGoLive: () => void;
}

type CountdownStep = 5 | 4 | 3 | 2 | 1 | 0;

export default function NewLiveStreamScreen({
  streamId,
  onBack,
  onGoLive,
}: NewLiveStreamScreenProps) {
  const { actor } = useActor();

  // ── Camera refs (never unmounted) ─────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── State ──────────────────────────────────────────────────────
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isLive, setIsLive] = useState(false);
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownStep, setCountdownStep] = useState<CountdownStep>(5);
  const [micEnabled, setMicEnabled] = useState(true);
  const [chatVisible, setChatVisible] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [isEndingLive, setIsEndingLive] = useState(false);

  // ── Start camera ───────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    // Stop any existing tracks first
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    setCameraReady(false);
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera not supported on this device or browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: true,
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

      // Sync mic track state
      for (const track of stream.getAudioTracks()) {
        track.enabled = micEnabled;
      }

      setCameraReady(true);
    } catch (err) {
      const isPermission =
        err instanceof Error &&
        (err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError");
      setCameraError(
        isPermission
          ? "Camera access required"
          : "Could not access camera. Please allow permission and try again.",
      );
    }
  }, [facingMode, micEnabled]);

  // ── Stop camera ────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  // ── Mount + restart camera when startCamera/stopCamera change ──
  // startCamera is memoized with facingMode in its deps, so it changes
  // whenever facingMode changes — triggering this effect to restart the camera.
  useEffect(() => {
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // ── Mic toggle — sync to stream tracks ─────────────────────────
  useEffect(() => {
    if (!streamRef.current) return;
    for (const track of streamRef.current.getAudioTracks()) {
      track.enabled = micEnabled;
    }
  }, [micEnabled]);

  // ── Countdown tick ─────────────────────────────────────────────
  useEffect(() => {
    if (!countdownActive || countdownStep === 0) return;

    const timeout = setTimeout(() => {
      setCountdownStep((prev) => (prev - 1) as CountdownStep);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [countdownActive, countdownStep]);

  // ── Countdown reaches 0 → go live ─────────────────────────────
  useEffect(() => {
    if (!countdownActive || countdownStep !== 0) return;

    const go = async () => {
      try {
        if (actor) await actor.updateLiveStreamStatus(streamId, "live");
      } catch (err) {
        console.error("Failed to update stream status:", err);
      }
      setIsLive(true);
      setCountdownActive(false);
      toast.success("You're now LIVE!", { duration: 3000 });
      onGoLive();
    };

    void go();
  }, [countdownActive, countdownStep, actor, streamId, onGoLive]);

  // ── Viewer count simulation when live ─────────────────────────
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setViewerCount((v) => v + Math.floor(Math.random() * 4));
    }, 2500);
    return () => clearInterval(interval);
  }, [isLive]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleGoLive = () => {
    setCountdownStep(5);
    setCountdownActive(true);
  };

  const handleCancelCountdown = () => {
    setCountdownActive(false);
    setCountdownStep(5);
  };

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const handleEndLive = async () => {
    setIsEndingLive(true);
    try {
      if (actor) await actor.updateLiveStreamStatus(streamId, "ended");
    } catch (err) {
      console.error("Failed to end stream:", err);
    }
    stopCamera();
    onBack();
  };

  const handleEnableCamera = () => {
    setCameraError(null);
    void startCamera();
  };

  const countdownDisplay = countdownStep === 0 ? "GO!" : String(countdownStep);
  const isGoText = countdownStep === 0;

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: "#000" }}
      data-ocid="new_live.page"
    >
      {/* ═══════════════════════════════════════════════════════════
          CAMERA VIDEO — ALWAYS MOUNTED, NEVER REMOVED OR REPLACED
          ═══════════════════════════════════════════════════════════ */}
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
          background: "#000",
          display: "block",
          filter: "brightness(1.1) contrast(1.05)",
        }}
      />

      {/* ─── Camera loading spinner ─── */}
      {!cameraReady && !cameraError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
          }}
          data-ocid="new_live.loading_state"
        >
          <Loader2 className="w-10 h-10 text-white animate-spin" />
          <p
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 13,
              marginTop: 14,
              fontFamily: "'Sora', sans-serif",
            }}
          >
            Starting camera…
          </p>
        </div>
      )}

      {/* ─── PRE-LIVE UI: back button + GO LIVE button ─── */}
      {cameraReady && !isLive && !countdownActive && (
        <>
          {/* Back button top-left */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 20,
              padding: "calc(env(safe-area-inset-top) + 12px) 16px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)",
            }}
          >
            <button
              type="button"
              data-ocid="new_live.back.button"
              onClick={onBack}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2} />
            </button>

            <div
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                background: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <span
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                LIVE PREVIEW
              </span>
            </div>

            <button
              type="button"
              data-ocid="new_live.flip_camera_setup.button"
              onClick={handleFlipCamera}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <FlipHorizontal
                className="w-5 h-5 text-white"
                strokeWidth={1.5}
              />
            </button>
          </div>

          {/* GO LIVE button at bottom */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 20,
              padding: "24px 24px calc(env(safe-area-inset-bottom) + 32px)",
              background:
                "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
            }}
          >
            <motion.button
              type="button"
              data-ocid="new_live.go_live.primary_button"
              onClick={handleGoLive}
              whileTap={{ scale: 0.96 }}
              style={{
                width: "100%",
                height: 60,
                borderRadius: 20,
                background: "#FF2D2D",
                boxShadow:
                  "0 0 40px rgba(255,45,45,0.5), 0 8px 32px rgba(255,45,45,0.3)",
                border: "none",
                color: "white",
                fontWeight: 900,
                fontSize: 17,
                letterSpacing: "0.08em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                cursor: "pointer",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              <span className="relative flex w-3 h-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full w-3 h-3 bg-white" />
              </span>
              GO LIVE
            </motion.button>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
          COUNTDOWN OVERLAY — absolute, OVER video, never replaces it
          ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {countdownActive && (
          <motion.div
            key="countdown-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.45)",
            }}
            data-ocid="new_live.countdown.panel"
          >
            {/* Cancel button — top left */}
            <button
              type="button"
              data-ocid="new_live.countdown.cancel.button"
              onClick={handleCancelCountdown}
              style={{
                position: "absolute",
                top: "calc(env(safe-area-inset-top) + 16px)",
                left: 16,
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X className="w-5 h-5 text-white" strokeWidth={2} />
            </button>

            {/* Countdown number */}
            <AnimatePresence mode="wait">
              <motion.div
                key={countdownStep}
                initial={{ scale: 2.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <span
                  style={{
                    fontSize: isGoText ? "4rem" : "9rem",
                    fontWeight: 900,
                    lineHeight: 1,
                    color: isGoText ? "#FF2D2D" : "#ffffff",
                    textShadow: isGoText
                      ? "0 0 60px rgba(255,45,45,0.9), 0 0 120px rgba(255,45,45,0.4)"
                      : "0 0 40px rgba(255,255,255,0.5)",
                    fontFamily: "'Sora', sans-serif",
                  }}
                >
                  {countdownDisplay}
                </span>

                {!isGoText && (
                  <p
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.25em",
                      textTransform: "uppercase",
                      fontFamily: "'Sora', sans-serif",
                    }}
                  >
                    Going Live…
                  </p>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Step progress dots */}
            <div
              style={{
                position: "absolute",
                bottom: "calc(env(safe-area-inset-bottom) + 48px)",
                left: 0,
                right: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <motion.div
                  key={n}
                  animate={{
                    background:
                      n >= countdownStep && countdownStep > 0
                        ? "rgba(255,255,255,0.3)"
                        : "#FF2D2D",
                    scale: n === countdownStep ? 1.3 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
          LIVE TOP BAR — absolute top, only when isLive
          ═══════════════════════════════════════════════════════════ */}
      {isLive && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 30,
            padding: "calc(env(safe-area-inset-top) + 12px) 16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)",
          }}
          data-ocid="new_live.top_bar.panel"
        >
          {/* Back button */}
          <button
            type="button"
            data-ocid="new_live.back.button"
            onClick={onBack}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2} />
          </button>

          {/* LIVE badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 20,
              background: "#FF2D2D",
              boxShadow: "0 0 20px rgba(255,45,45,0.5)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "white",
                display: "inline-block",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
              className="animate-pulse"
            />
            <span
              style={{
                color: "white",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.1em",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              LIVE
            </span>
          </div>

          {/* Viewer count */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 20,
              background: "rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <span style={{ fontSize: 14 }}>👁</span>
            <span
              style={{
                color: "white",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "'Sora', sans-serif",
              }}
            >
              {viewerCount}
            </span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          LIVE CONTROLS BOTTOM — absolute bottom, only when isLive
          ═══════════════════════════════════════════════════════════ */}
      {isLive && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 30,
            padding: "24px 24px calc(env(safe-area-inset-bottom) + 24px)",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.75), transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
          data-ocid="new_live.controls.panel"
        >
          {/* End Live */}
          <motion.button
            type="button"
            data-ocid="new_live.end_live.button"
            onClick={() => void handleEndLive()}
            disabled={isEndingLive}
            whileTap={{ scale: 0.92 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "rgba(255,45,45,0.85)",
                border: "2px solid rgba(255,45,45,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isEndingLive ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <PhoneOff className="w-5 h-5 text-white" strokeWidth={2} />
              )}
            </div>
            <span
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.05em",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              END
            </span>
          </motion.button>

          {/* Mic toggle */}
          <motion.button
            type="button"
            data-ocid="new_live.mic.toggle"
            onClick={() => setMicEnabled((v) => !v)}
            whileTap={{ scale: 0.92 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: !micEnabled
                  ? "rgba(255,45,45,0.25)"
                  : "rgba(0,0,0,0.55)",
                border: `1px solid ${!micEnabled ? "rgba(255,45,45,0.5)" : "rgba(255,255,255,0.2)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {micEnabled ? (
                <Mic
                  className="w-5 h-5"
                  style={{ color: "white" }}
                  strokeWidth={1.5}
                />
              ) : (
                <MicOff
                  className="w-5 h-5"
                  style={{ color: "#FF6B6B" }}
                  strokeWidth={1.5}
                />
              )}
            </div>
            <span
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.05em",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              {micEnabled ? "MIC" : "MUTED"}
            </span>
          </motion.button>

          {/* Flip camera */}
          <motion.button
            type="button"
            data-ocid="new_live.flip_camera.button"
            onClick={handleFlipCamera}
            whileTap={{ scale: 0.92 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.55)",
                border: "1px solid rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FlipHorizontal
                className="w-5 h-5 text-white"
                strokeWidth={1.5}
              />
            </div>
            <span
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.05em",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              FLIP
            </span>
          </motion.button>

          {/* Chat toggle */}
          <motion.button
            type="button"
            data-ocid="new_live.chat.toggle"
            onClick={() => setChatVisible((v) => !v)}
            whileTap={{ scale: 0.92 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: chatVisible
                  ? "rgba(255,45,45,0.25)"
                  : "rgba(0,0,0,0.55)",
                border: `1px solid ${chatVisible ? "rgba(255,45,45,0.5)" : "rgba(255,255,255,0.2)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MessageCircle
                className="w-5 h-5"
                style={{ color: chatVisible ? "#FF6B6B" : "white" }}
                strokeWidth={1.5}
              />
            </div>
            <span
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.05em",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              CHAT
            </span>
          </motion.button>
        </div>
      )}

      {/* ─── Simple chat panel (slide up when visible) ─── */}
      <AnimatePresence>
        {isLive && chatVisible && (
          <motion.div
            key="chat-panel"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{
              position: "absolute",
              bottom: "calc(env(safe-area-inset-bottom) + 110px)",
              left: 12,
              right: 12,
              zIndex: 40,
              borderRadius: 20,
              background: "rgba(0,0,0,0.7)",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: 16,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
            data-ocid="new_live.chat.panel"
          >
            <p
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: 11,
                textAlign: "center",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              Chat will appear here when viewers join
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
          ERROR OVERLAY — absolute, only when cameraError
          Never shows a black screen — always explains why
          ═══════════════════════════════════════════════════════════ */}
      {cameraError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.88)",
            padding: 32,
          }}
          data-ocid="new_live.error_state"
        >
          {/* Back button */}
          <button
            type="button"
            data-ocid="new_live.error.back.button"
            onClick={onBack}
            style={{
              position: "absolute",
              top: "calc(env(safe-area-inset-top) + 16px)",
              left: 16,
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2} />
          </button>

          {/* Camera icon */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "rgba(255,45,45,0.15)",
              border: "1px solid rgba(255,45,45,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Camera
              className="w-8 h-8"
              style={{ color: "rgba(255,100,100,0.8)" }}
              strokeWidth={1.5}
            />
          </div>

          <p
            style={{
              color: "white",
              fontSize: 18,
              fontWeight: 800,
              textAlign: "center",
              marginBottom: 10,
              fontFamily: "'Sora', sans-serif",
            }}
          >
            Camera access required
          </p>

          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 13,
              textAlign: "center",
              marginBottom: 28,
              lineHeight: 1.6,
              fontFamily: "'Sora', sans-serif",
            }}
          >
            Please allow camera access to go live
          </p>

          <motion.button
            type="button"
            data-ocid="new_live.enable_camera.button"
            onClick={handleEnableCamera}
            whileTap={{ scale: 0.96 }}
            style={{
              width: "100%",
              maxWidth: 260,
              height: 52,
              borderRadius: 16,
              background: "#FF2D2D",
              border: "none",
              color: "white",
              fontSize: 15,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 0 30px rgba(255,45,45,0.4)",
              fontFamily: "'Sora', sans-serif",
            }}
          >
            Enable Camera
          </motion.button>
        </div>
      )}
    </div>
  );
}
