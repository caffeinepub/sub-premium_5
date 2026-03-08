import {
  ArrowLeft,
  Camera,
  FlipHorizontal,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Settings,
  Share2,
  Shield,
  Users,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";

// ─── Props ────────────────────────────────────────────────────────────────────
interface NewLiveStreamScreenProps {
  streamId: bigint;
  onBack: () => void;
  onGoLive: () => void;
}

type CountdownStep = 5 | 4 | 3 | 2 | 1 | 0;

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  username: string;
  text: string;
  isMod: boolean;
  isSystem?: boolean;
  timestamp: number;
}

interface FloatingHeart {
  id: string;
  x: number;
  y: number;
  drift: number;
  scale: number;
}

interface RainHeart {
  id: string;
  x: number;
  size: number;
  duration: number;
  delay: number;
}

interface GiftNotif {
  id: string;
  sender: string;
  giftName: string;
  giftEmoji: string;
  coins: number;
  timestamp: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MOCK_VIEWERS = [
  "user_alex",
  "gamer99",
  "musiclover",
  "pro_streamer",
  "bestfan",
  "viewer_123",
  "hype_king",
  "night_owl",
];
const MOCK_MESSAGES = [
  "Amazing stream! 🔥",
  "Let's gooo!",
  "First time here, loving it",
  "This is fire 🎯",
  "You're the best!",
  "❤️❤️❤️",
  "Keep it up!",
  "So talented wow",
  "Can't stop watching 👀",
  "This is incredible!",
  "GOAT 🐐",
  "W streamer 🙌",
  "Sending love ❤️",
  "LMAO 😂",
];

const GIFTS = [
  { emoji: "🌹", name: "Rose", coins: 1 },
  { emoji: "❤️", name: "Heart", coins: 5 },
  { emoji: "🔥", name: "Fire", coins: 10 },
  { emoji: "🚀", name: "Rocket", coins: 100 },
  { emoji: "👑", name: "Crown", coins: 500 },
  { emoji: "🐉", name: "Dragon", coins: 1000 },
];

const MOCK_VIEWERS_COHOST = [
  { id: "v1", username: "alex_creator" },
  { id: "v2", username: "music_vibes" },
  { id: "v3", username: "pro_dancer" },
  { id: "v4", username: "gamer_pro" },
];

const MOCK_OPPONENTS = [
  { id: "o1", username: "king_streams", initials: "KS" },
  { id: "o2", username: "nova_live", initials: "NL" },
  { id: "o3", username: "flash_tv", initials: "FT" },
];

const CONFETTI_COLORS = [
  "#FF2D2D",
  "#FF6B6B",
  "#FFB400",
  "#FF8C42",
  "#A8E6CF",
  "#88D8B0",
  "#FFAAA5",
  "#FF8B94",
  "#9B59B6",
  "#3498DB",
];

// Pre-computed static confetti / burst-heart data (avoids noArrayIndexKey lint error)
const CONFETTI_ITEMS = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * 360;
  const distance = 90 + ((i * 7) % 80);
  const rad = (angle * Math.PI) / 180;
  return {
    id: `cf-${i}`,
    tx: Math.cos(rad) * distance,
    ty: Math.sin(rad) * distance,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    isCircle: i % 2 === 0,
    width: 10 + ((i * 3) % 8),
    height: 10 + ((i * 5) % 8),
    rotateDeg: 360 + ((i * 17) % 360),
    delay: i * 0.008,
  };
});

const BURST_HEARTS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * 360;
  const dist = 55 + ((i * 6) % 60);
  const rad = (angle * Math.PI) / 180;
  return {
    id: `bh-${i}`,
    tx: Math.cos(rad) * dist,
    ty: Math.sin(rad) * dist,
    fontSize: 20 + ((i * 3) % 10),
    delay: 0.1 + i * 0.015,
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(s: number) {
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function fmtHearts(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function calcProgress(hearts: number): number {
  if (hearts <= 0) return 0;
  if (hearts >= 1_000_000) return 100;
  if (hearts < 10_000) return (hearts / 10_000) * 25;
  if (hearts < 100_000) return 25 + ((hearts - 10_000) / 90_000) * 25;
  if (hearts < 500_000) return 50 + ((hearts - 100_000) / 400_000) * 25;
  return 75 + ((hearts - 500_000) / 500_000) * 25;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function NewLiveStreamScreen({
  streamId,
  onBack,
  onGoLive,
}: NewLiveStreamScreenProps) {
  const { actor } = useActor();

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chatListRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);
  const tapTimesRef = useRef<number[]>([]);
  const heartRainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationTriggeredRef = useRef(false);

  // ── Core state ────────────────────────────────────────────────────────────────
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isLive, setIsLive] = useState(false);
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownStep, setCountdownStep] = useState<CountdownStep>(5);
  const [micEnabled, setMicEnabled] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [totalCoinsReceived, setTotalCoinsReceived] = useState(0);
  const [isEndingLive, setIsEndingLive] = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);

  // ── Engagement / heart state ──────────────────────────────────────────────────
  const [heartCount, setHeartCount] = useState(0);
  const [progressHearts, setProgressHearts] = useState(0);
  const [isHeartRaining, setIsHeartRaining] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [rainHearts, setRainHearts] = useState<RainHeart[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);

  // ── Gift state ────────────────────────────────────────────────────────────────
  const [giftPanelOpen, setGiftPanelOpen] = useState(false);
  const [giftNotifications, setGiftNotifications] = useState<GiftNotif[]>([]);
  const [premiumGiftActive, setPremiumGiftActive] = useState<{
    emoji: string;
    name: string;
    sender: string;
  } | null>(null);

  // ── Chat state ────────────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessage, setPinnedMessage] = useState<string | null>(null);

  // ── Battle state ──────────────────────────────────────────────────────────────
  const [battlePanelOpen, setBattlePanelOpen] = useState(false);
  const [battleActive, setBattleActive] = useState(false);
  const [battleTimeLeft, setBattleTimeLeft] = useState(300);
  const [battleScoreA, setBattleScoreA] = useState(0);
  const [battleScoreB, setBattleScoreB] = useState(0);
  const [battleWinner, setBattleWinner] = useState<"A" | "B" | null>(null);
  const [selectedOpponent, setSelectedOpponent] = useState(MOCK_OPPONENTS[0]);

  // ── Co-host / Mod state ───────────────────────────────────────────────────────
  const [coHostPanelOpen, setCoHostPanelOpen] = useState(false);
  const [coHosts, setCoHosts] = useState<
    Array<{ id: string; username: string }>
  >([]);
  const [modPanelOpen, setModPanelOpen] = useState(false);
  const [mods, setMods] = useState<Set<string>>(new Set());

  // ─────────────────────────────────────────────────────────────────────────────
  // Camera
  // ─────────────────────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
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
          /* autoPlay */
        }
      }
      for (const track of stream.getAudioTracks()) track.enabled = micEnabled;
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

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  useEffect(() => {
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // ── Mic sync ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!streamRef.current) return;
    for (const track of streamRef.current.getAudioTracks())
      track.enabled = micEnabled;
  }, [micEnabled]);

  // ── Countdown tick ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!countdownActive || countdownStep === 0) return;
    const t = setTimeout(
      () => setCountdownStep((p) => (p - 1) as CountdownStep),
      1000,
    );
    return () => clearTimeout(t);
  }, [countdownActive, countdownStep]);

  // ── Countdown → go live ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!countdownActive || countdownStep !== 0) return;
    const go = async () => {
      try {
        if (actor) await actor.updateLiveStreamStatus(streamId, "live");
      } catch {
        /* silent */
      }
      setIsLive(true);
      setCountdownActive(false);
      setViewerCount(Math.floor(Math.random() * 50) + 10);
      toast.success("You're now LIVE!", { duration: 3000 });
      onGoLive();
    };
    void go();
  }, [countdownActive, countdownStep, actor, streamId, onGoLive]);

  // ── Viewer count simulation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isLive) return;
    const i = setInterval(() => {
      setViewerCount((v) => Math.max(1, v + Math.floor(Math.random() * 6) - 1));
    }, 3000);
    return () => clearInterval(i);
  }, [isLive]);

  // ── Simulated incoming chat ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isLive) return;
    const sendRandom = () => {
      const username =
        MOCK_VIEWERS[Math.floor(Math.random() * MOCK_VIEWERS.length)];
      const text =
        MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)];
      const isMod = mods.has(username);
      setChatMessages((prev) => [
        ...prev.slice(-60),
        { id: uid(), username, text, isMod, timestamp: Date.now() },
      ]);
    };
    const interval = setInterval(sendRandom, 3500);
    return () => clearInterval(interval);
  }, [isLive, mods]);

  // ── Auto-scroll chat ──────────────────────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: chatMessages triggers scroll
  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // ── Battle timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!battleActive || battleWinner) return;
    if (battleTimeLeft <= 0) {
      setBattleWinner(battleScoreA >= battleScoreB ? "A" : "B");
      setBattleActive(false);
      return;
    }
    const t = setTimeout(() => setBattleTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [battleActive, battleTimeLeft, battleWinner, battleScoreA, battleScoreB]);

  // ── Battle score simulation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!battleActive || battleWinner) return;
    const i = setInterval(() => {
      if (Math.random() < 0.5)
        setBattleScoreB((v) => v + Math.floor(Math.random() * 8) + 1);
    }, 2500);
    return () => clearInterval(i);
  }, [battleActive, battleWinner]);

  // ── Celebration trigger ───────────────────────────────────────────────────────
  useEffect(() => {
    if (
      calcProgress(progressHearts) >= 100 &&
      !celebrationTriggeredRef.current
    ) {
      celebrationTriggeredRef.current = true;
      setShowCelebration(true);
      const t = setTimeout(() => {
        setShowCelebration(false);
        setProgressHearts(0);
        celebrationTriggeredRef.current = false;
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [progressHearts]);

  // ── Clean up floating hearts ──────────────────────────────────────────────────
  useEffect(() => {
    if (floatingHearts.length === 0) return;
    const t = setTimeout(() => {
      setFloatingHearts((prev) => prev.slice(-30));
    }, 2000);
    return () => clearTimeout(t);
  }, [floatingHearts]);

  // ── Gift notification auto-dismiss ────────────────────────────────────────────
  useEffect(() => {
    if (giftNotifications.length === 0) return;
    const oldest = giftNotifications[0];
    const age = Date.now() - oldest.timestamp;
    const remaining = Math.max(0, 2500 - age);
    const t = setTimeout(() => {
      setGiftNotifications((prev) => prev.filter((n) => n.id !== oldest.id));
    }, remaining);
    return () => clearTimeout(t);
  }, [giftNotifications]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Heart / engagement logic
  // ─────────────────────────────────────────────────────────────────────────────
  const spawnHearts = useCallback((x: number, y: number) => {
    const count = 3 + Math.floor(Math.random() * 3);
    const newHearts: FloatingHeart[] = Array.from({ length: count }, () => ({
      id: uid(),
      x: x + (Math.random() - 0.5) * 40,
      y,
      drift: (Math.random() - 0.5) * 60,
      scale: 0.8 + Math.random() * 0.8,
    }));
    setFloatingHearts((prev) => [...prev.slice(-40), ...newHearts]);
  }, []);

  const handleScreenTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isLive) return;

      const now = Date.now();
      const x =
        "touches" in e
          ? (e.touches[0]?.clientX ?? 0)
          : (e as React.MouseEvent).clientX;
      const y =
        "touches" in e
          ? (e.touches[0]?.clientY ?? 0)
          : (e as React.MouseEvent).clientY;

      // Double-tap detection (2 taps within 300ms)
      if (now - lastTapRef.current < 300) {
        spawnHearts(x, y);
        setHeartCount((c) => c + 3);
        setProgressHearts((c) => c + 3);
        if (battleActive) {
          setBattleScoreA((v) => v + 1);
        }
      }
      lastTapRef.current = now;

      // Track tap rate for rain
      tapTimesRef.current = [...tapTimesRef.current, now].filter(
        (t) => now - t < 1000,
      );

      if (tapTimesRef.current.length >= 3 && !isHeartRaining) {
        setIsHeartRaining(true);
        const newRainHearts: RainHeart[] = Array.from({ length: 12 }, () => ({
          id: uid(),
          x: Math.random() * 90 + 5,
          size: 20 + Math.random() * 20,
          duration: 1.5 + Math.random() * 1.5,
          delay: Math.random() * 0.5,
        }));
        setRainHearts(newRainHearts);

        if (heartRainTimerRef.current) clearTimeout(heartRainTimerRef.current);
        heartRainTimerRef.current = setTimeout(() => {
          setIsHeartRaining(false);
          setRainHearts([]);
          tapTimesRef.current = [];
        }, 3000);
      }
    },
    [isLive, spawnHearts, battleActive, isHeartRaining],
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Action handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const handleGoLive = () => {
    setCountdownStep(5);
    setCountdownActive(true);
  };

  const handleCancelCountdown = () => {
    setCountdownActive(false);
    setCountdownStep(5);
  };

  const handleFlipCamera = () =>
    setFacingMode((p) => (p === "user" ? "environment" : "user"));

  const handleEndLive = async () => {
    setIsEndingLive(true);
    try {
      if (actor) await actor.updateLiveStreamStatus(streamId, "ended");
    } catch {
      /* silent */
    }
    stopCamera();
    onBack();
  };

  const handleSendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages((prev) => [
      ...prev.slice(-60),
      { id: uid(), username: "You", text, isMod: false, timestamp: Date.now() },
    ]);
    setChatInput("");
  };

  const handleEnableCamera = () => {
    setCameraError(null);
    void startCamera();
  };

  const handleSendGift = (gift: (typeof GIFTS)[0]) => {
    setGiftPanelOpen(false);

    const notif: GiftNotif = {
      id: uid(),
      sender: "You",
      giftName: gift.name,
      giftEmoji: gift.emoji,
      coins: gift.coins,
      timestamp: Date.now(),
    };
    setGiftNotifications((prev) => [...prev.slice(-4), notif]);

    if (gift.coins >= 100) {
      setPremiumGiftActive({
        emoji: gift.emoji,
        name: gift.name,
        sender: "You",
      });
      setTimeout(() => setPremiumGiftActive(null), 2000);
    }

    setTotalCoinsReceived((v) => v + gift.coins);

    if (battleActive) {
      setBattleScoreA((v) => v + gift.coins);
    }

    setChatMessages((prev) => [
      ...prev.slice(-60),
      {
        id: uid(),
        username: "System",
        text: `You sent ${gift.emoji} ${gift.name}!`,
        isMod: false,
        isSystem: true,
        timestamp: Date.now(),
      },
    ]);
  };

  const handleQuickGift = () => {
    handleSendGift(GIFTS[0]); // Rose = quick gift
  };

  const handleStartBattle = () => {
    const opp =
      MOCK_OPPONENTS[Math.floor(Math.random() * MOCK_OPPONENTS.length)];
    setSelectedOpponent(opp);
    setBattleScoreA(0);
    setBattleScoreB(0);
    setBattleTimeLeft(300);
    setBattleWinner(null);
    setBattleActive(true);
    setBattlePanelOpen(false);
  };

  const handleInviteCoHost = (viewer: (typeof MOCK_VIEWERS_COHOST)[0]) => {
    if (coHosts.length >= 3) {
      toast("Max 3 co-hosts per side", { icon: "⚠️" });
      return;
    }
    if (coHosts.find((h) => h.id === viewer.id)) return;
    setCoHosts((prev) => [
      ...prev,
      { id: viewer.id, username: viewer.username },
    ]);
    toast(`${viewer.username} joined as co-host!`, { icon: "🎤" });
  };

  const handleRemoveCoHost = (id: string) => {
    setCoHosts((prev) => prev.filter((h) => h.id !== id));
  };

  const handleMakeMod = (username: string) => {
    setMods((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  };

  const handleKick = (username: string) => {
    toast(`${username} was kicked from the stream`, { icon: "🚫" });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Derived
  // ─────────────────────────────────────────────────────────────────────────────
  const earningsUSD = totalCoinsReceived / 100;
  const progressPct = calcProgress(progressHearts);
  const countdownDisplay = countdownStep === 0 ? "GO!" : String(countdownStep);
  const isGoText = countdownStep === 0;

  const btnStyle = (active = false, color = "rgba(0,0,0,0.55)") => ({
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: active ? "rgba(255,45,45,0.35)" : color,
    border: `1px solid ${active ? "rgba(255,45,45,0.6)" : "rgba(255,255,255,0.2)"}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      style={{ background: "#000" }}
      data-ocid="new_live.page"
    >
      {/* ═══ CAMERA VIDEO — ALWAYS MOUNTED ═══ */}
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

      {/* ─── Tap area (covers the whole screen for heart taps) ─── */}
      {isLive && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Double-tap to send hearts"
          data-ocid="live.double_tap.canvas_target"
          onClick={handleScreenTap}
          onTouchStart={handleScreenTap}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              const rect = (e.target as HTMLDivElement).getBoundingClientRect();
              const synth = {
                clientX: rect.width / 2,
                clientY: rect.height / 2,
              } as React.MouseEvent;
              handleScreenTap(synth);
            }
          }}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 5,
            cursor: "pointer",
          }}
        />
      )}

      {/* ─── Floating hearts (from taps) ─── */}
      <AnimatePresence>
        {floatingHearts.map((heart) => (
          <motion.div
            key={heart.id}
            initial={{ opacity: 1, y: 0, x: 0, scale: heart.scale }}
            animate={{
              opacity: [1, 1, 0],
              y: -(150 + Math.random() * 100),
              x: heart.drift,
              scale: heart.scale * 1.3,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: heart.x,
              top: heart.y,
              fontSize: 28,
              zIndex: 25,
              pointerEvents: "none",
              transformOrigin: "center bottom",
            }}
          >
            ❤️
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ─── Heart Rain ─── */}
      <AnimatePresence>
        {isHeartRaining && (
          <div
            data-ocid="live.heart_rain.panel"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 20,
              pointerEvents: "none",
              overflow: "hidden",
            }}
          >
            {rainHearts.map((rh) => (
              <motion.div
                key={rh.id}
                initial={{ y: "110vh", opacity: 0.9 }}
                animate={{ y: "-20vh", opacity: [0.9, 0.9, 0] }}
                transition={{
                  duration: rh.duration,
                  delay: rh.delay,
                  ease: "linear",
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: 0.2,
                }}
                style={{
                  position: "absolute",
                  left: `${rh.x}%`,
                  fontSize: rh.size,
                  filter: "drop-shadow(0 0 6px rgba(255,45,45,0.7))",
                }}
              >
                ❤️
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* ─── Center floating controls (mic + flip) ─── */}
      {isLive && (
        <div
          style={{
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 28,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <motion.button
            type="button"
            data-ocid="new_live.mic.toggle"
            onClick={() => setMicEnabled((v) => !v)}
            whileTap={{ scale: 0.9 }}
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: micEnabled
                ? "rgba(0,0,0,0.6)"
                : "rgba(255,45,45,0.6)",
              border: "1px solid rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              backdropFilter: "blur(8px)",
            }}
          >
            {micEnabled ? (
              <Mic className="w-5 h-5 text-white" strokeWidth={1.5} />
            ) : (
              <MicOff
                className="w-5 h-5"
                style={{ color: "#ff6b6b" }}
                strokeWidth={1.5}
              />
            )}
          </motion.button>

          <motion.button
            type="button"
            data-ocid="new_live.flip_camera.button"
            onClick={handleFlipCamera}
            whileTap={{ scale: 0.9 }}
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              backdropFilter: "blur(8px)",
            }}
          >
            <FlipHorizontal className="w-5 h-5 text-white" strokeWidth={1.5} />
          </motion.button>
        </div>
      )}

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

      {/* ═══ PRE-LIVE UI ═══ */}
      {cameraReady && !isLive && !countdownActive && (
        <>
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

      {/* ═══ COUNTDOWN OVERLAY ═══ */}
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
                      ? "0 0 60px rgba(255,45,45,0.9)"
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
                  style={{ width: 8, height: 8, borderRadius: "50%" }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ LIVE TOP BAR ═══ */}
      {isLive && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 30,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)",
            pointerEvents: "none",
          }}
          data-ocid="new_live.top_bar.panel"
        >
          {/* Row 1: Avatar, LIVE badge, viewers, earnings */}
          <div
            style={{
              padding: "calc(env(safe-area-inset-top) + 10px) 14px 8px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              pointerEvents: "auto",
            }}
          >
            <button
              type="button"
              data-ocid="new_live.back.button"
              onClick={onBack}
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <ArrowLeft className="w-4 h-4 text-white" strokeWidth={2} />
            </button>

            {/* Avatar + username */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "#FF2D2D",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "2px solid rgba(255,255,255,0.3)",
                }}
              >
                <span
                  style={{
                    color: "white",
                    fontSize: 10,
                    fontWeight: 900,
                    fontFamily: "'Sora', sans-serif",
                  }}
                >
                  ME
                </span>
              </div>
              <span
                style={{
                  color: "white",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                You ❤️
              </span>
            </div>

            {/* LIVE badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 9px",
                borderRadius: 20,
                background: "#FF2D2D",
                boxShadow: "0 0 12px rgba(255,45,45,0.5)",
              }}
            >
              <span
                className="animate-pulse"
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "white",
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  color: "white",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                LIVE
              </span>
            </div>

            {/* Viewers */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 9px",
                borderRadius: 20,
                background: "rgba(0,0,0,0.55)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <span style={{ fontSize: 11 }}>👁</span>
              <span
                style={{
                  color: "white",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                {viewerCount.toLocaleString()}
              </span>
            </div>

            {/* Coins + USD */}
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 9px",
                borderRadius: 20,
                background: "rgba(255,180,0,0.15)",
                border: "1px solid rgba(255,180,0,0.3)",
              }}
            >
              <span style={{ fontSize: 11 }}>💰</span>
              <span
                style={{
                  color: "#FFB400",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                {totalCoinsReceived} (${earningsUSD.toFixed(2)})
              </span>
            </div>
          </div>

          {/* Row 2: Engagement strip */}
          <div
            style={{
              padding: "0 14px 10px",
              display: "flex",
              flexDirection: "column",
              gap: 5,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Heart counter */}
              <div
                data-ocid="live.hearts.counter"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 13 }}>❤️</span>
                <span
                  style={{
                    color: "white",
                    fontSize: 12,
                    fontWeight: 800,
                    fontFamily: "'Sora', sans-serif",
                  }}
                >
                  x{fmtHearts(heartCount)}
                </span>
              </div>

              {/* Progress bar */}
              <div
                data-ocid="live.engagement.progress_bar"
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  background: "rgba(255,255,255,0.15)",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <motion.div
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  style={{
                    height: "100%",
                    background: "linear-gradient(to right, #FF2D2D, #ff6b9d)",
                    borderRadius: 3,
                    boxShadow: "0 0 8px rgba(255,45,45,0.6)",
                  }}
                />
              </div>

              {/* Percentage */}
              <span
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: "'Sora', sans-serif",
                  flexShrink: 0,
                  minWidth: 30,
                }}
              >
                {Math.floor(progressPct)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ BATTLE HUD (when active, show score overlay under top bar) ═══ */}
      <AnimatePresence>
        {battleActive && !battlePanelOpen && isLive && (
          <motion.div
            key="battle-hud"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              top: 110,
              left: 0,
              right: 0,
              zIndex: 29,
              padding: "0 14px",
              pointerEvents: "none",
            }}
          >
            {/* Battle layout with chairs */}
            <div
              style={{
                display: "flex",
                alignItems: "stretch",
                gap: 6,
                background: "rgba(0,0,0,0.55)",
                borderRadius: 16,
                padding: "10px 12px",
                border: "1px solid rgba(255,45,45,0.2)",
                backdropFilter: "blur(6px)",
              }}
            >
              {/* YOUR side */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      color: "white",
                      fontSize: 10,
                      fontWeight: 800,
                      fontFamily: "'Sora', sans-serif",
                    }}
                  >
                    YOU
                  </span>
                  <span
                    style={{
                      color: "#FF2D2D",
                      fontSize: 13,
                      fontWeight: 900,
                      fontFamily: "'Sora', sans-serif",
                    }}
                  >
                    {battleScoreA}
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: "rgba(255,255,255,0.1)",
                    overflow: "hidden",
                  }}
                >
                  <motion.div
                    animate={{
                      width: `${Math.min(100, (battleScoreA / Math.max(1, battleScoreA + battleScoreB)) * 100)}%`,
                    }}
                    style={{
                      height: "100%",
                      background: "#FF2D2D",
                      borderRadius: 2,
                    }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
                {/* Chairs */}
                <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
                  {[0, 1, 2].map((i) => {
                    const host = coHosts[i];
                    return (
                      <div
                        key={i}
                        data-ocid={`live.battle.chair.${i + 1}` as string}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          background: host ? "#FF2D2D" : "transparent",
                          border: `1.5px ${host ? "solid rgba(255,45,45,0.8)" : "dashed rgba(255,255,255,0.3)"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {host ? (
                          <span
                            style={{
                              color: "white",
                              fontSize: 9,
                              fontWeight: 900,
                              fontFamily: "'Sora', sans-serif",
                            }}
                          >
                            {host.username.slice(0, 2).toUpperCase()}
                          </span>
                        ) : (
                          <span
                            style={{
                              color: "rgba(255,255,255,0.3)",
                              fontSize: 14,
                            }}
                          >
                            +
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* VS + Timer */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  padding: "0 6px",
                }}
              >
                <span style={{ fontSize: 14 }}>⚔️</span>
                <span
                  style={{
                    color: "#FF2D2D",
                    fontSize: 10,
                    fontWeight: 900,
                    fontFamily: "'Sora', sans-serif",
                  }}
                >
                  {fmtTime(battleTimeLeft)}
                </span>
              </div>

              {/* OPPONENT side */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      color: "#5B8DEF",
                      fontSize: 13,
                      fontWeight: 900,
                      fontFamily: "'Sora', sans-serif",
                    }}
                  >
                    {battleScoreB}
                  </span>
                  <span
                    style={{
                      color: "rgba(255,255,255,0.7)",
                      fontSize: 10,
                      fontWeight: 800,
                      fontFamily: "'Sora', sans-serif",
                    }}
                  >
                    @{selectedOpponent.username}
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: "rgba(255,255,255,0.1)",
                    overflow: "hidden",
                  }}
                >
                  <motion.div
                    animate={{
                      width: `${Math.min(100, (battleScoreB / Math.max(1, battleScoreA + battleScoreB)) * 100)}%`,
                    }}
                    style={{
                      height: "100%",
                      background: "#5B8DEF",
                      borderRadius: 2,
                    }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
                {/* Empty opponent chairs */}
                <div
                  style={{
                    display: "flex",
                    gap: 5,
                    marginTop: 2,
                    justifyContent: "flex-end",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        border: "1.5px dashed rgba(91,141,239,0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{ color: "rgba(91,141,239,0.4)", fontSize: 14 }}
                      >
                        +
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ GIFT NOTIFICATIONS (slide in from right) ═══ */}
      <div
        style={{
          position: "absolute",
          top: isLive ? 120 : 80,
          left: 14,
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          pointerEvents: "none",
          maxWidth: "calc(100% - 80px)",
        }}
      >
        <AnimatePresence>
          {giftNotifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 22,
                background: "rgba(0,0,0,0.78)",
                border:
                  notif.coins >= 100
                    ? "1px solid rgba(255,180,0,0.5)"
                    : "1px solid rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
                boxShadow:
                  notif.coins >= 100 ? "0 0 16px rgba(255,180,0,0.3)" : "none",
              }}
            >
              <span style={{ fontSize: 20 }}>{notif.giftEmoji}</span>
              <span
                style={{
                  color: "white",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Sora', sans-serif",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {notif.sender} sent {notif.giftName}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ═══ PREMIUM GIFT FULLSCREEN OVERLAY ═══ */}
      <AnimatePresence>
        {premiumGiftActive && (
          <motion.div
            key="premium-gift"
            data-ocid="live.premium_gift.modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 80,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              pointerEvents: "none",
            }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              style={{
                fontSize: 120,
                lineHeight: 1,
                filter: "drop-shadow(0 0 30px rgba(255,180,0,0.8))",
              }}
            >
              {premiumGiftActive.emoji}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                marginTop: 20,
                textAlign: "center",
              }}
            >
              <p
                style={{
                  color: "white",
                  fontSize: 18,
                  fontWeight: 900,
                  fontFamily: "'Sora', sans-serif",
                  textShadow: "0 0 20px rgba(255,180,0,0.8)",
                }}
              >
                {premiumGiftActive.sender} sent {premiumGiftActive.name}!
              </p>
              <p
                style={{
                  color: "#FFB400",
                  fontSize: 13,
                  fontFamily: "'Sora', sans-serif",
                  marginTop: 4,
                }}
              >
                ✨ Premium Gift ✨
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ CELEBRATION OVERLAY ═══ */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            key="celebration"
            data-ocid="live.celebration.panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 75,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            {/* Confetti pieces */}
            {CONFETTI_ITEMS.map((item) => (
              <motion.div
                key={item.id}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                animate={{
                  x: item.tx,
                  y: item.ty,
                  scale: [0, 1.2, 0.8],
                  opacity: [1, 1, 0],
                  rotate: item.rotateDeg,
                }}
                transition={{
                  duration: 1.2,
                  ease: "easeOut",
                  delay: item.delay,
                }}
                style={{
                  position: "absolute",
                  width: item.width,
                  height: item.height,
                  borderRadius: item.isCircle ? "50%" : 2,
                  background: item.color,
                  boxShadow: `0 0 6px ${item.color}`,
                }}
              />
            ))}

            {/* Burst hearts */}
            {BURST_HEARTS.map((bh) => (
              <motion.span
                key={bh.id}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{
                  x: bh.tx,
                  y: bh.ty,
                  scale: [0, 1.5, 0],
                  opacity: [1, 1, 0],
                }}
                transition={{
                  duration: 1.0,
                  ease: "easeOut",
                  delay: bh.delay,
                }}
                style={{
                  position: "absolute",
                  fontSize: bh.fontSize,
                  pointerEvents: "none",
                }}
              >
                ❤️
              </motion.span>
            ))}

            {/* Main text */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.15, 1], opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{
                textAlign: "center",
                zIndex: 1,
              }}
            >
              <p
                style={{
                  fontSize: 42,
                  fontWeight: 900,
                  color: "white",
                  fontFamily: "'Sora', sans-serif",
                  textShadow:
                    "0 0 30px rgba(255,45,45,0.8), 0 0 60px rgba(255,180,0,0.5)",
                  lineHeight: 1,
                }}
              >
                🎊
              </p>
              <p
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: "white",
                  fontFamily: "'Sora', sans-serif",
                  textShadow: "0 0 20px rgba(255,45,45,0.8)",
                  letterSpacing: "0.05em",
                  marginTop: 8,
                }}
              >
                CELEBRATION!
              </p>
              <p
                style={{
                  color: "#FFB400",
                  fontSize: 13,
                  fontFamily: "'Sora', sans-serif",
                  marginTop: 4,
                }}
              >
                ❤️ 1 Million Reached!
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ LIVE CONTROLS BOTTOM ═══ */}
      {isLive && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 30,
            padding: "8px 14px calc(env(safe-area-inset-bottom) + 10px)",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.92) 65%, transparent)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
          data-ocid="new_live.controls.panel"
        >
          {/* ── Pinned message ── */}
          <AnimatePresence>
            {pinnedMessage && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 12,
                  background: "rgba(255,45,45,0.15)",
                  border: "1px solid rgba(255,45,45,0.3)",
                }}
              >
                <span style={{ fontSize: 13 }}>📌</span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 12,
                    fontFamily: "'Sora', sans-serif",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {pinnedMessage}
                </span>
                <button
                  type="button"
                  onClick={() => setPinnedMessage(null)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 2,
                  }}
                >
                  <X className="w-3 h-3 text-white/50" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Chat messages ── */}
          <div
            ref={chatListRef}
            style={{
              maxHeight: 140,
              overflowY: "scroll",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              scrollbarWidth: "none",
            }}
            className="[&::-webkit-scrollbar]:hidden"
          >
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                style={{ display: "flex", alignItems: "flex-start", gap: 5 }}
              >
                {msg.isSystem ? (
                  <span
                    style={{
                      color: "#FFB400",
                      fontSize: 11,
                      fontFamily: "'Sora', sans-serif",
                      opacity: 0.85,
                    }}
                  >
                    ✨ {msg.text}
                  </span>
                ) : (
                  <>
                    <span
                      style={{
                        color: "#FF2D2D",
                        fontSize: 11,
                        fontWeight: 800,
                        fontFamily: "'Sora', sans-serif",
                        flexShrink: 0,
                      }}
                    >
                      {msg.username}
                    </span>
                    {msg.isMod && (
                      <span
                        style={{
                          fontSize: 8,
                          fontWeight: 800,
                          color: "white",
                          background: "#FF2D2D",
                          padding: "1px 4px",
                          borderRadius: 4,
                          flexShrink: 0,
                          alignSelf: "center",
                          fontFamily: "'Sora', sans-serif",
                        }}
                      >
                        MOD
                      </span>
                    )}
                    <span
                      style={{
                        color: "rgba(255,255,255,0.82)",
                        fontSize: 12,
                        fontFamily: "'Sora', sans-serif",
                        lineHeight: 1.4,
                      }}
                    >
                      {msg.text}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* ── Chat input row ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendChat();
              }}
              placeholder="Type a message..."
              data-ocid="new_live.chat.input"
              style={{
                flex: 1,
                height: 38,
                borderRadius: 19,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "white",
                fontSize: 13,
                padding: "0 14px",
                outline: "none",
                fontFamily: "'Sora', sans-serif",
              }}
              className="placeholder:text-white/30"
            />
            <motion.button
              type="button"
              data-ocid="new_live.chat.send.button"
              onClick={handleSendChat}
              whileTap={{ scale: 0.92 }}
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                flexShrink: 0,
                background: chatInput.trim()
                  ? "#FF2D2D"
                  : "rgba(255,255,255,0.1)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s",
              }}
            >
              <Send className="w-4 h-4 text-white" strokeWidth={2} />
            </motion.button>
          </div>

          {/* ── Action row: Quick gift, Gift panel, Share, Settings, End Live ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
              paddingTop: 2,
            }}
          >
            {/* Quick gift (Rose) */}
            <motion.button
              type="button"
              data-ocid="live.quick_gift.button"
              onClick={handleQuickGift}
              whileTap={{ scale: 0.9 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(255,45,45,0.15)",
                  border: "1px solid rgba(255,45,45,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                🌹
              </div>
              <span
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 9,
                  fontWeight: 700,
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                Gift
              </span>
            </motion.button>

            {/* Gift panel */}
            <motion.button
              type="button"
              data-ocid="live.gift_panel.open_modal_button"
              onClick={() => setGiftPanelOpen(true)}
              whileTap={{ scale: 0.9 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(255,180,0,0.15)",
                  border: "1px solid rgba(255,180,0,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                }}
              >
                🎁
              </div>
              <span
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 9,
                  fontWeight: 700,
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                Gifts
              </span>
            </motion.button>

            {/* Share */}
            <motion.button
              type="button"
              data-ocid="new_live.share.button"
              onClick={() => toast("Link copied!", { icon: "🔗" })}
              whileTap={{ scale: 0.9 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Share2 className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
              <span
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 9,
                  fontWeight: 700,
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                Share
              </span>
            </motion.button>

            {/* Settings */}
            <motion.button
              type="button"
              data-ocid="live.settings.button"
              onClick={() => setSettingsPanelOpen(true)}
              whileTap={{ scale: 0.9 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Settings className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
              <span
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 9,
                  fontWeight: 700,
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                Settings
              </span>
            </motion.button>

            {/* End Live */}
            <motion.button
              type="button"
              data-ocid="new_live.end_live.button"
              onClick={() => void handleEndLive()}
              disabled={isEndingLive}
              whileTap={{ scale: 0.9 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(255,45,45,0.5)",
                  border: "2px solid rgba(255,45,45,0.6)",
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
                  color: "rgba(255,45,45,0.8)",
                  fontSize: 9,
                  fontWeight: 700,
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                End
              </span>
            </motion.button>
          </div>

          {/* ── Second row: Battle, Co-Host, Mod ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
            }}
          >
            {/* Battle */}
            <motion.button
              type="button"
              data-ocid="new_live.battle.open_modal_button"
              onClick={() => setBattlePanelOpen(true)}
              whileTap={{ scale: 0.92 }}
              animate={battleActive ? { scale: [1, 1.06, 1] } : {}}
              transition={
                battleActive
                  ? { duration: 1.2, repeat: Number.POSITIVE_INFINITY }
                  : {}
              }
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
              <div style={btnStyle(battleActive)}>
                <Zap
                  className="w-5 h-5"
                  style={{ color: battleActive ? "#FF2D2D" : "white" }}
                  strokeWidth={1.5}
                />
              </div>
              <span
                style={{
                  color: battleActive ? "#FF2D2D" : "rgba(255,255,255,0.7)",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                BATTLE
              </span>
            </motion.button>

            {/* Co-Host */}
            <motion.button
              type="button"
              data-ocid="new_live.cohost.open_modal_button"
              onClick={() => setCoHostPanelOpen(true)}
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
              <div style={btnStyle(coHosts.length > 0)}>
                <Users className="w-5 h-5 text-white" strokeWidth={1.5} />
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
                CO-HOST
              </span>
            </motion.button>

            {/* Mod */}
            <motion.button
              type="button"
              data-ocid="new_live.mod.open_modal_button"
              onClick={() => setModPanelOpen(true)}
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
              <div style={btnStyle(mods.size > 0)}>
                <Shield className="w-5 h-5 text-white" strokeWidth={1.5} />
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
                MOD
              </span>
            </motion.button>
          </div>
        </div>
      )}

      {/* ═══ GIFT PICKER PANEL ═══ */}
      <AnimatePresence>
        {giftPanelOpen && (
          <>
            <motion.div
              key="gift-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGiftPanelOpen(false)}
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 55,
                background: "rgba(0,0,0,0.5)",
              }}
            />
            <motion.div
              key="gift-panel"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              data-ocid="new_live.gift_panel.panel"
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 60,
                background: "rgba(10,10,10,0.97)",
                borderRadius: "24px 24px 0 0",
                padding: "16px 20px calc(env(safe-area-inset-bottom) + 24px)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.2)",
                  margin: "0 auto 16px",
                }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <h3
                  style={{
                    color: "white",
                    fontSize: 16,
                    fontWeight: 800,
                    fontFamily: "'Sora', sans-serif",
                    margin: 0,
                  }}
                >
                  Send a Gift
                </h3>
                <span
                  style={{
                    color: "rgba(255,180,0,0.8)",
                    fontSize: 12,
                    fontFamily: "'Sora', sans-serif",
                  }}
                >
                  Balance: ∞ coins
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  overflowX: "auto",
                  paddingBottom: 4,
                }}
                className="[&::-webkit-scrollbar]:hidden"
              >
                {GIFTS.map((gift) => (
                  <motion.button
                    key={gift.name}
                    type="button"
                    data-ocid={`new_live.gift.${gift.name.toLowerCase()}.button`}
                    onClick={() => handleSendGift(gift)}
                    whileTap={{ scale: 0.93 }}
                    style={{
                      flexShrink: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      padding: "14px 16px",
                      borderRadius: 16,
                      background:
                        gift.coins >= 100
                          ? "rgba(255,180,0,0.08)"
                          : "rgba(255,255,255,0.06)",
                      border:
                        gift.coins >= 100
                          ? "1px solid rgba(255,180,0,0.25)"
                          : "1px solid rgba(255,255,255,0.1)",
                      cursor: "pointer",
                      position: "relative",
                    }}
                  >
                    {gift.coins >= 100 && (
                      <span
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          fontSize: 8,
                          fontWeight: 800,
                          color: "#FFB400",
                          fontFamily: "'Sora', sans-serif",
                          background: "rgba(255,180,0,0.15)",
                          padding: "1px 4px",
                          borderRadius: 6,
                        }}
                      >
                        PREMIUM
                      </span>
                    )}
                    <span style={{ fontSize: 36 }}>{gift.emoji}</span>
                    <span
                      style={{
                        color: "white",
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "'Sora', sans-serif",
                      }}
                    >
                      {gift.name}
                    </span>
                    <span
                      style={{
                        color: "#FFB400",
                        fontSize: 11,
                        fontWeight: 800,
                        fontFamily: "'Sora', sans-serif",
                      }}
                    >
                      {gift.coins} 💰
                    </span>
                  </motion.button>
                ))}
              </div>

              <p
                style={{
                  color: "rgba(255,255,255,0.35)",
                  fontSize: 10,
                  fontFamily: "'Sora', sans-serif",
                  textAlign: "center",
                  marginTop: 14,
                }}
              >
                100 coins = $1 USD creator earnings
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ SETTINGS PANEL ═══ */}
      <AnimatePresence>
        {settingsPanelOpen && (
          <>
            <motion.div
              key="settings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettingsPanelOpen(false)}
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 55,
                background: "rgba(0,0,0,0.5)",
              }}
            />
            <motion.div
              key="settings-panel"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 60,
                background: "rgba(10,10,10,0.97)",
                borderRadius: "24px 24px 0 0",
                padding: "16px 20px calc(env(safe-area-inset-bottom) + 24px)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.2)",
                  margin: "0 auto 16px",
                }}
              />
              <h3
                style={{
                  color: "white",
                  fontSize: 16,
                  fontWeight: 800,
                  fontFamily: "'Sora', sans-serif",
                  margin: "0 0 20px",
                }}
              >
                Stream Settings
              </h3>

              {[
                { label: "Enable Comments", value: true },
                { label: "Save Live Replay", value: true },
                { label: "Allow Gifts", value: true },
                { label: "Show Viewer Count", value: true },
              ].map((setting) => (
                <div
                  key={setting.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span
                    style={{
                      color: "rgba(255,255,255,0.8)",
                      fontSize: 14,
                      fontFamily: "'Sora', sans-serif",
                    }}
                  >
                    {setting.label}
                  </span>
                  <div
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      background: "#FF2D2D",
                      position: "relative",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        right: 2,
                        top: 2,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "white",
                      }}
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setSettingsPanelOpen(false)}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "'Sora', sans-serif",
                  marginTop: 16,
                }}
              >
                Done
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ BATTLE PANEL ═══ */}
      <AnimatePresence>
        {battlePanelOpen && (
          <motion.div
            key="battle-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 70,
              background: "rgba(0,0,0,0.92)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
            data-ocid="new_live.battle.panel"
          >
            {battleWinner ? (
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  textAlign: "center",
                }}
              >
                <motion.div
                  animate={{
                    rotate: [0, -10, 10, -10, 10, 0],
                    scale: [1, 1.15, 1],
                  }}
                  transition={{ duration: 0.8 }}
                  style={{ fontSize: 72 }}
                >
                  🏆
                </motion.div>
                <h2
                  style={{
                    color:
                      battleWinner === "A"
                        ? "#FF2D2D"
                        : "rgba(255,255,255,0.6)",
                    fontSize: 28,
                    fontWeight: 900,
                    fontFamily: "'Sora', sans-serif",
                    margin: 0,
                  }}
                >
                  {battleWinner === "A" ? "YOU WIN! 🎉" : "YOU LOST"}
                </h2>
                <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        color: "#FF2D2D",
                        fontSize: 22,
                        fontWeight: 900,
                        fontFamily: "'Sora', sans-serif",
                      }}
                    >
                      {battleScoreA}
                    </div>
                    <div
                      style={{
                        color: "rgba(255,255,255,0.4)",
                        fontSize: 11,
                        fontFamily: "'Sora', sans-serif",
                      }}
                    >
                      Your score
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        color: "#5B8DEF",
                        fontSize: 22,
                        fontWeight: 900,
                        fontFamily: "'Sora', sans-serif",
                      }}
                    >
                      {battleScoreB}
                    </div>
                    <div
                      style={{
                        color: "rgba(255,255,255,0.4)",
                        fontSize: 11,
                        fontFamily: "'Sora', sans-serif",
                      }}
                    >
                      {selectedOpponent.username}
                    </div>
                  </div>
                </div>
                <motion.button
                  type="button"
                  onClick={() => {
                    setBattleWinner(null);
                    setBattlePanelOpen(false);
                  }}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    marginTop: 16,
                    padding: "12px 32px",
                    borderRadius: 16,
                    background: "#FF2D2D",
                    border: "none",
                    color: "white",
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "'Sora', sans-serif",
                  }}
                >
                  Close
                </motion.button>
              </motion.div>
            ) : battleActive ? (
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 18px",
                      borderRadius: 20,
                      background: "rgba(255,45,45,0.2)",
                      border: "1px solid rgba(255,45,45,0.4)",
                    }}
                  >
                    <span
                      style={{
                        color: "#FF2D2D",
                        fontSize: 20,
                        fontWeight: 900,
                        fontFamily: "'Sora', sans-serif",
                      }}
                    >
                      ⚔️ {fmtTime(battleTimeLeft)}
                    </span>
                  </div>
                </div>

                <div
                  style={{ display: "flex", gap: 12, alignItems: "stretch" }}
                >
                  {/* You */}
                  <div
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: 14,
                      background: "rgba(255,45,45,0.1)",
                      border: "1px solid rgba(255,45,45,0.3)",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 4 }}>🔴</div>
                    <div
                      style={{
                        color: "white",
                        fontSize: 13,
                        fontWeight: 800,
                        fontFamily: "'Sora', sans-serif",
                      }}
                    >
                      YOU
                    </div>
                    <div
                      style={{
                        color: "#FF2D2D",
                        fontSize: 28,
                        fontWeight: 900,
                        fontFamily: "'Sora', sans-serif",
                        marginTop: 8,
                      }}
                    >
                      {battleScoreA}
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        background: "rgba(255,255,255,0.1)",
                        marginTop: 8,
                        overflow: "hidden",
                      }}
                    >
                      <motion.div
                        animate={{
                          width: `${Math.min(100, (battleScoreA / Math.max(1, battleScoreA + battleScoreB)) * 100)}%`,
                        }}
                        style={{
                          height: "100%",
                          background: "#FF2D2D",
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    {/* Chairs */}
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        justifyContent: "center",
                        marginTop: 12,
                      }}
                    >
                      {[0, 1, 2].map((i) => {
                        const host = coHosts[i];
                        return (
                          <div
                            key={i}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              background: host ? "#FF2D2D" : "transparent",
                              border: `1.5px ${host ? "solid rgba(255,45,45,0.8)" : "dashed rgba(255,255,255,0.25)"}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {host ? (
                              <span
                                style={{
                                  color: "white",
                                  fontSize: 8,
                                  fontWeight: 900,
                                }}
                              >
                                {host.username.slice(0, 2).toUpperCase()}
                              </span>
                            ) : (
                              <span
                                style={{
                                  color: "rgba(255,255,255,0.25)",
                                  fontSize: 12,
                                }}
                              >
                                +
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Opponent */}
                  <div
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: 14,
                      background: "rgba(91,141,239,0.1)",
                      border: "1px solid rgba(91,141,239,0.3)",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 4 }}>🔵</div>
                    <div
                      style={{
                        color: "rgba(255,255,255,0.8)",
                        fontSize: 12,
                        fontWeight: 800,
                        fontFamily: "'Sora', sans-serif",
                      }}
                    >
                      {selectedOpponent.username}
                    </div>
                    <div
                      style={{
                        color: "#5B8DEF",
                        fontSize: 28,
                        fontWeight: 900,
                        fontFamily: "'Sora', sans-serif",
                        marginTop: 8,
                      }}
                    >
                      {battleScoreB}
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        background: "rgba(255,255,255,0.1)",
                        marginTop: 8,
                        overflow: "hidden",
                      }}
                    >
                      <motion.div
                        animate={{
                          width: `${Math.min(100, (battleScoreB / Math.max(1, battleScoreA + battleScoreB)) * 100)}%`,
                        }}
                        style={{
                          height: "100%",
                          background: "#5B8DEF",
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    {/* Empty chairs */}
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        justifyContent: "center",
                        marginTop: 12,
                      }}
                    >
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            border: "1.5px dashed rgba(91,141,239,0.35)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span
                            style={{
                              color: "rgba(91,141,239,0.4)",
                              fontSize: 12,
                            }}
                          >
                            +
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <motion.button
                  type="button"
                  data-ocid="new_live.battle.end.button"
                  onClick={() => {
                    setBattleWinner(battleScoreA >= battleScoreB ? "A" : "B");
                    setBattleActive(false);
                  }}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    padding: "14px",
                    borderRadius: 16,
                    background: "rgba(255,45,45,0.2)",
                    border: "1px solid rgba(255,45,45,0.4)",
                    color: "#FF2D2D",
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "'Sora', sans-serif",
                    width: "100%",
                  }}
                >
                  End Battle
                </motion.button>
              </div>
            ) : (
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>⚔️</div>
                  <h2
                    style={{
                      color: "white",
                      fontSize: 22,
                      fontWeight: 900,
                      fontFamily: "'Sora', sans-serif",
                      margin: "0 0 6px",
                    }}
                  >
                    Battle Mode
                  </h2>
                  <p
                    style={{
                      color: "rgba(255,255,255,0.45)",
                      fontSize: 13,
                      fontFamily: "'Sora', sans-serif",
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    Compete against another streamer. Viewers send gifts —
                    highest score wins!
                  </p>
                </div>

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <p
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "'Sora', sans-serif",
                      margin: "0 0 4px",
                    }}
                  >
                    Choose opponent
                  </p>
                  {MOCK_OPPONENTS.map((opp) => (
                    <motion.button
                      key={opp.id}
                      type="button"
                      onClick={() => setSelectedOpponent(opp)}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: 14,
                        background:
                          selectedOpponent.id === opp.id
                            ? "rgba(255,45,45,0.15)"
                            : "rgba(255,255,255,0.05)",
                        border: `1px solid ${selectedOpponent.id === opp.id ? "rgba(255,45,45,0.4)" : "rgba(255,255,255,0.08)"}`,
                        cursor: "pointer",
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span
                          style={{
                            color: "white",
                            fontSize: 12,
                            fontWeight: 900,
                            fontFamily: "'Sora', sans-serif",
                          }}
                        >
                          {opp.initials}
                        </span>
                      </div>
                      <span
                        style={{
                          color: "white",
                          fontSize: 14,
                          fontWeight: 700,
                          fontFamily: "'Sora', sans-serif",
                        }}
                      >
                        @{opp.username}
                      </span>
                      {selectedOpponent.id === opp.id && (
                        <span
                          style={{
                            marginLeft: "auto",
                            color: "#FF2D2D",
                            fontSize: 16,
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </motion.button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <motion.button
                    type="button"
                    data-ocid="new_live.battle.cancel.button"
                    onClick={() => setBattlePanelOpen(false)}
                    whileTap={{ scale: 0.96 }}
                    style={{
                      flex: 1,
                      padding: "14px",
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.7)",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "'Sora', sans-serif",
                    }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="button"
                    data-ocid="new_live.battle.start.button"
                    onClick={handleStartBattle}
                    whileTap={{ scale: 0.96 }}
                    style={{
                      flex: 2,
                      padding: "14px",
                      borderRadius: 16,
                      background: "#FF2D2D",
                      border: "none",
                      color: "white",
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: "pointer",
                      fontFamily: "'Sora', sans-serif",
                      boxShadow: "0 4px 20px rgba(255,45,45,0.4)",
                    }}
                  >
                    Start Battle ⚔️
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ CO-HOST PANEL ═══ */}
      <AnimatePresence>
        {coHostPanelOpen && (
          <>
            <motion.div
              key="cohost-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCoHostPanelOpen(false)}
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 55,
                background: "rgba(0,0,0,0.5)",
              }}
            />
            <motion.div
              key="cohost-panel"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              data-ocid="new_live.cohost.panel"
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 60,
                background: "rgba(10,10,10,0.97)",
                borderRadius: "24px 24px 0 0",
                padding: "16px 20px calc(env(safe-area-inset-bottom) + 24px)",
                border: "1px solid rgba(255,255,255,0.08)",
                maxHeight: "62%",
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.2)",
                  margin: "0 auto 16px",
                }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <h3
                  style={{
                    color: "white",
                    fontSize: 16,
                    fontWeight: 800,
                    fontFamily: "'Sora', sans-serif",
                    margin: 0,
                  }}
                >
                  Co-Host
                </h3>
                <span
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: 12,
                    fontFamily: "'Sora', sans-serif",
                  }}
                >
                  Up to 3 guests
                </span>
              </div>

              {/* Chairs grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                  marginBottom: 20,
                }}
              >
                {[0, 1, 2].map((slot) => {
                  const host = coHosts[slot];
                  return (
                    <div
                      key={slot}
                      style={{
                        padding: "14px 10px",
                        borderRadius: 14,
                        background: host
                          ? "rgba(255,45,45,0.08)"
                          : "rgba(255,255,255,0.03)",
                        border: `1px dashed ${host ? "rgba(255,45,45,0.3)" : "rgba(255,255,255,0.12)"}`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                        position: "relative",
                      }}
                    >
                      {host ? (
                        <>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: "50%",
                              background: "#FF2D2D",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <span
                              style={{
                                color: "white",
                                fontSize: 13,
                                fontWeight: 900,
                                fontFamily: "'Sora', sans-serif",
                              }}
                            >
                              {host.username.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <span
                            style={{
                              color: "white",
                              fontSize: 10,
                              fontWeight: 700,
                              fontFamily: "'Sora', sans-serif",
                              textAlign: "center",
                              wordBreak: "break-all",
                            }}
                          >
                            {host.username}
                          </span>
                          <button
                            type="button"
                            data-ocid={`new_live.cohost.remove.button.${slot + 1}`}
                            onClick={() => handleRemoveCoHost(host.id)}
                            style={{
                              position: "absolute",
                              top: 5,
                              right: 5,
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                              background: "rgba(255,45,45,0.7)",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <X className="w-2.5 h-2.5 text-white" />
                          </button>
                        </>
                      ) : (
                        <>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: "50%",
                              border: "1px dashed rgba(255,255,255,0.2)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <span
                              style={{
                                color: "rgba(255,255,255,0.2)",
                                fontSize: 20,
                              }}
                            >
                              +
                            </span>
                          </div>
                          <span
                            style={{
                              color: "rgba(255,255,255,0.25)",
                              fontSize: 11,
                              fontFamily: "'Sora', sans-serif",
                            }}
                          >
                            Empty
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <p
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "'Sora', sans-serif",
                  marginBottom: 10,
                }}
              >
                Invite a Viewer
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {MOCK_VIEWERS_COHOST.map((viewer, idx) => {
                  const isJoined = coHosts.some((h) => h.id === viewer.id);
                  return (
                    <div
                      key={viewer.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            color: "white",
                            fontSize: 11,
                            fontWeight: 800,
                            fontFamily: "'Sora', sans-serif",
                          }}
                        >
                          {viewer.username.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <span
                        style={{
                          flex: 1,
                          color: "white",
                          fontSize: 13,
                          fontWeight: 600,
                          fontFamily: "'Sora', sans-serif",
                        }}
                      >
                        @{viewer.username}
                      </span>
                      <button
                        type="button"
                        data-ocid={`new_live.cohost.invite.button.${idx + 1}`}
                        onClick={() => !isJoined && handleInviteCoHost(viewer)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 20,
                          background: isJoined
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(255,45,45,0.2)",
                          border: `1px solid ${isJoined ? "rgba(255,255,255,0.1)" : "rgba(255,45,45,0.4)"}`,
                          color: isJoined
                            ? "rgba(255,255,255,0.35)"
                            : "#FF2D2D",
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: isJoined ? "default" : "pointer",
                          fontFamily: "'Sora', sans-serif",
                        }}
                      >
                        {isJoined ? "Joined" : "Invite"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ MODERATOR PANEL ═══ */}
      <AnimatePresence>
        {modPanelOpen && (
          <>
            <motion.div
              key="mod-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModPanelOpen(false)}
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 55,
                background: "rgba(0,0,0,0.5)",
              }}
            />
            <motion.div
              key="mod-panel"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              data-ocid="new_live.mod.panel"
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 60,
                background: "rgba(10,10,10,0.97)",
                borderRadius: "24px 24px 0 0",
                padding: "16px 20px calc(env(safe-area-inset-bottom) + 24px)",
                border: "1px solid rgba(255,255,255,0.08)",
                maxHeight: "70%",
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.2)",
                  margin: "0 auto 16px",
                }}
              />
              <h3
                style={{
                  color: "white",
                  fontSize: 16,
                  fontWeight: 800,
                  fontFamily: "'Sora', sans-serif",
                  margin: "0 0 16px",
                }}
              >
                Moderators
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {MOCK_VIEWERS_COHOST.map((viewer, idx) => {
                  const isMod = mods.has(viewer.username);
                  return (
                    <div
                      key={viewer.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          background: isMod
                            ? "rgba(255,45,45,0.3)"
                            : "rgba(255,255,255,0.1)",
                          border: isMod
                            ? "1px solid rgba(255,45,45,0.5)"
                            : "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            color: "white",
                            fontSize: 11,
                            fontWeight: 800,
                            fontFamily: "'Sora', sans-serif",
                          }}
                        >
                          {viewer.username.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              color: "white",
                              fontSize: 13,
                              fontWeight: 600,
                              fontFamily: "'Sora', sans-serif",
                            }}
                          >
                            @{viewer.username}
                          </span>
                          {isMod && (
                            <span
                              style={{
                                fontSize: 8,
                                fontWeight: 800,
                                color: "white",
                                background: "#FF2D2D",
                                padding: "2px 5px",
                                borderRadius: 4,
                                fontFamily: "'Sora', sans-serif",
                              }}
                            >
                              MOD
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          data-ocid={`new_live.mod.make_mod.button.${idx + 1}`}
                          onClick={() => handleMakeMod(viewer.username)}
                          style={{
                            padding: "5px 10px",
                            borderRadius: 10,
                            background: isMod
                              ? "rgba(255,45,45,0.15)"
                              : "rgba(255,255,255,0.07)",
                            border: `1px solid ${isMod ? "rgba(255,45,45,0.4)" : "rgba(255,255,255,0.1)"}`,
                            color: isMod ? "#FF2D2D" : "rgba(255,255,255,0.7)",
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: "pointer",
                            fontFamily: "'Sora', sans-serif",
                          }}
                        >
                          {isMod ? "Remove Mod" : "Make Mod"}
                        </button>
                        <button
                          type="button"
                          data-ocid={`new_live.mod.kick.button.${idx + 1}`}
                          onClick={() => handleKick(viewer.username)}
                          style={{
                            padding: "5px 10px",
                            borderRadius: 10,
                            background: "rgba(255,45,45,0.08)",
                            border: "1px solid rgba(255,45,45,0.2)",
                            color: "rgba(255,100,100,0.8)",
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: "pointer",
                            fontFamily: "'Sora', sans-serif",
                          }}
                        >
                          Kick
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ ERROR OVERLAY ═══ */}
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
            Camera unavailable. Enable camera permission.
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
