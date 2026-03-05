import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Ban,
  BarChart2,
  Crown,
  DollarSign,
  Eye,
  Flag,
  Gift,
  Heart,
  History,
  Medal,
  MessageCircle,
  Mic,
  MicOff,
  MoreHorizontal,
  Radio,
  Send,
  Settings,
  Share2,
  Shield,
  Smile,
  Sparkles,
  Star,
  Swords,
  Trophy,
  UserPlus,
  Users,
  Wallet,
  Wand2,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Stream state machine ────────────────────────────────────────────────────
type StreamState = "connecting" | "live" | "reconnecting";
import { toast } from "sonner";
import type { LiveChatMessage, LiveGift } from "../backend.d";
import { BattleResultModal } from "../components/BattleResultModal";
import { BattleScoreboardWrapper } from "../components/BattleScoreboard";
import { CoHostInviteModal } from "../components/CoHostInviteModal";
import { ConfettiBurst } from "../components/ConfettiBurst";
import {
  GiftBroadcastOverlay,
  getTier,
} from "../components/GiftBroadcastOverlay";
import type { PendingGift } from "../components/GiftBroadcastOverlay";
import { HeartAnimation } from "../components/HeartAnimation";
import { LiveCoHostLayout } from "../components/LiveCoHostLayout";
import { LiveEffectsPanel } from "../components/LiveEffectsPanel";
import { TopEngagementChairs } from "../components/TopEngagementChairs";
import { UserProfileModal } from "../components/UserProfileModal";
import { ViewerListPanel } from "../components/ViewerListPanel";
import { useActor } from "../hooks/useActor";
import { useCoHostSystem } from "../hooks/useCoHostSystem";
import { useEngagementStore } from "../hooks/useEngagementStore";
import { useHeartTapSystem } from "../hooks/useHeartTapSystem";
import { useLiveBattle } from "../hooks/useLiveBattle";
import { useUserProfile } from "../hooks/useUserProfile";

interface LiveWatchPageProps {
  streamId: bigint;
  onBack: () => void;
  onEndStream?: () => void;
  onNavigateToWallet?: () => void;
  onBattleHistory?: () => void;
  onWeeklyLeaderboard?: () => void;
  isCreator?: boolean;
  /** True when the creator just completed the Go Live countdown — skip the 3-second connecting delay */
  isCreatorGoingLive?: boolean;
  streamTitle?: string;
  /** Principal string of the creator — used to open their profile */
  creatorPrincipal?: string;
  /** Current logged-in user's principal string */
  currentUserPrincipal?: string;
}

// ─── Full 12-gift catalog ─────────────────────────────────────────────────────

const GIFT_TIERS = [
  {
    tier: "Small Gifts",
    gifts: [
      { type: "rose", emoji: "🌹", label: "Rose", coins: 10 },
      { type: "heart", emoji: "❤️", label: "Heart", coins: 25 },
      { type: "coffee", emoji: "☕", label: "Coffee", coins: 50 },
      { type: "fire", emoji: "🔥", label: "Fire", coins: 100 },
    ],
  },
  {
    tier: "Medium Gifts",
    gifts: [
      { type: "diamond", emoji: "💎", label: "Diamond", coins: 500 },
      { type: "crown", emoji: "👑", label: "Crown", coins: 1000 },
    ],
  },
  {
    tier: "Large Gifts ✨",
    gifts: [
      { type: "lion", emoji: "🦁", label: "Lion", coins: 5000 },
      { type: "supercar", emoji: "🚗", label: "Supercar", coins: 8000 },
      { type: "moneyrain", emoji: "💰", label: "Money Rain", coins: 10000 },
      { type: "yacht", emoji: "🛥️", label: "Yacht", coins: 20000 },
    ],
  },
  {
    tier: "Ultra Rare 👑",
    gifts: [
      { type: "castle", emoji: "🏰", label: "Castle", coins: 50000 },
      { type: "globalstar", emoji: "🌍", label: "Global Star", coins: 100000 },
    ],
  },
] as const;

type GiftEntry = (typeof GIFT_TIERS)[number]["gifts"][number];

const SYSTEM_USERNAMES = [
  "alex_v",
  "sarah_m",
  "james_k",
  "priya_d",
  "tony_r",
  "luna_s",
  "max_c",
  "belle_w",
  "carlos_g",
  "yuki_t",
];

const MOCK_TOP_SUPPORTERS = [
  { name: "luna_s", taps: 8420, rank: 1 },
  { name: "alex_v", taps: 6103, rank: 2 },
  { name: "priya_d", taps: 4850, rank: 3 },
  { name: "max_c", taps: 3217, rank: 4 },
  { name: "yuki_t", taps: 1944, rank: 5 },
];

function generateSystemMessage(
  type: "join" | "follow" | "gift",
  giftText?: string,
): LiveChatMessage {
  const name =
    SYSTEM_USERNAMES[Math.floor(Math.random() * SYSTEM_USERNAMES.length)];
  const text =
    type === "join"
      ? `${name} joined the live`
      : type === "follow"
        ? `${name} followed`
        : (giftText ?? `${name} sent a gift 🎁`);
  return {
    id: BigInt(Date.now() + Math.random() * 1000),
    text,
    senderUsername: type === "gift" ? "gift_system" : "system",
    sender: { toString: () => "system" } as never,
    messageType: type === "gift" ? "gift" : "system",
    streamId: BigInt(0),
    timestamp: BigInt(Date.now()),
  };
}

function getGiftTierMultiplier(coins: number): number {
  if (coins <= 100) return 1; // Small
  if (coins <= 1000) return 2; // Medium
  if (coins <= 20000) return 3; // Large
  return 5; // Ultra
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 200;
  const height = 40;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="#FF2D2D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Creator Live Balance Panel ───────────────────────────────────────────────

function CreatorLiveBalancePanel({
  streamId,
  onWalletClick,
  onWithdrawClick,
}: {
  streamId: bigint;
  onWalletClick?: () => void;
  onWithdrawClick?: () => void;
}) {
  const { actor } = useActor();
  const [sessionGifts, setSessionGifts] = useState<LiveGift[]>([]);

  useEffect(() => {
    if (!actor) return;
    actor
      .getLiveGifts(streamId)
      .then(setSessionGifts)
      .catch(() => {});
    const interval = setInterval(() => {
      actor
        .getLiveGifts(streamId)
        .then(setSessionGifts)
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [actor, streamId]);

  const totalCoins = useMemo(
    () => sessionGifts.reduce((acc, g) => acc + Number(g.coinValue), 0),
    [sessionGifts],
  );
  const usdEarned = (totalCoins / 1000) * 0.7;

  return (
    <div
      className="mb-4 p-4 rounded-2xl"
      style={{ background: "#111", border: "1px solid rgba(255,215,0,0.2)" }}
      data-ocid="live_watch.creator_balance.panel"
    >
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-4 h-4 text-yellow-400" />
        <span className="text-white text-sm font-bold">Live Earnings</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div
          className="p-3 rounded-xl"
          style={{ background: "rgba(255,215,0,0.08)" }}
        >
          <p className="text-yellow-400/70 text-[10px] font-semibold uppercase mb-1">
            Gifts Earned
          </p>
          <p className="text-yellow-300 font-black text-lg">
            🪙 {totalCoins.toLocaleString()}
          </p>
        </div>
        <div
          className="p-3 rounded-xl"
          style={{ background: "rgba(34,197,94,0.08)" }}
        >
          <p className="text-green-400/70 text-[10px] font-semibold uppercase mb-1">
            USD Est.
          </p>
          <p className="text-green-300 font-black text-lg">
            ${usdEarned.toFixed(2)}
          </p>
        </div>
      </div>

      <p className="text-gray-600 text-[10px] mb-3">
        Rate: 1,000 coins = $0.70 · {30}% platform fee applied
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onWalletClick}
          className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            color: "#ccc",
          }}
          data-ocid="live_watch.creator_balance.wallet_button"
        >
          <Wallet className="w-3.5 h-3.5" />
          Wallet
        </button>
        <button
          type="button"
          onClick={onWithdrawClick}
          className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
          style={{
            background: "rgba(34,197,94,0.15)",
            border: "1px solid rgba(34,197,94,0.3)",
          }}
          data-ocid="live_watch.creator_balance.withdraw_button"
        >
          <DollarSign className="w-3.5 h-3.5 text-green-400" />
          Withdraw
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LiveWatchPage({
  streamId,
  onBack,
  onEndStream,
  onNavigateToWallet,
  onBattleHistory,
  onWeeklyLeaderboard,
  isCreator = false,
  isCreatorGoingLive = false,
  streamTitle = "Live Stream",
  creatorPrincipal,
  currentUserPrincipal,
}: LiveWatchPageProps) {
  const [viewerCount, setViewerCount] = useState(
    Math.floor(Math.random() * 800 + 200),
  );
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [giftDrawerOpen, setGiftDrawerOpen] = useState(false);
  const [controlPanelOpen, setControlPanelOpen] = useState(false);
  const [selectedGift, setSelectedGift] = useState<GiftEntry | null>(null);
  const [coinBalance, setCoinBalance] = useState(0);
  const [giftSending, setGiftSending] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [giftLeaderboard, setGiftLeaderboard] = useState<LiveGift[]>([]);
  const [micEnabled, setMicEnabled] = useState(true);
  const [chatLocked, setChatLocked] = useState(false);

  // Stream state machine — never shows blank screen.
  // When the creator just finished the countdown, start immediately in "live" state.
  const [streamState, setStreamState] = useState<StreamState>(
    isCreatorGoingLive ? "live" : "connecting",
  );
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Co-host + battle modals
  const [coHostModalOpen, setCoHostModalOpen] = useState(false);
  const [viewerListOpen, setViewerListOpen] = useState(false);
  const [effectsPanelOpen, setEffectsPanelOpen] = useState(false);
  const [showBattleResult, setShowBattleResult] = useState(false);

  // Battle timer selector
  const [selectedBattleDuration, setSelectedBattleDuration] = useState<
    60 | 180 | 300
  >(60);

  // Gift broadcast queue
  const [pendingGifts, setPendingGifts] = useState<PendingGift[]>([]);

  // Viewer-side join request state
  const [joinRequestStatus, setJoinRequestStatus] = useState<
    "idle" | "pending" | "accepted" | "declined"
  >("idle");

  // Co-host system
  const {
    pendingInvites,
    joinRequests,
    coHosts,
    layoutMode,
    sendInvite,
    acceptJoinRequest,
    declineRequest,
    removeCoHost,
    simulateViewerJoinRequest,
  } = useCoHostSystem();

  // Battle system
  const {
    startBattle,
    addScore,
    addSupporter,
    resetBattle,
    recordWin,
    battleState,
    battleStats,
  } = useLiveBattle();

  // Engagement store
  const { addTapPoints, addCommentPoints, addGiftPoints, getTop3 } =
    useEngagementStore(streamId);
  const top3 = getTop3();

  // Heart tap system
  const [recentTaps, setRecentTaps] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);
  const tapIdCounterRef = useRef(0);
  const tapClearTimeoutsRef = useRef<
    Map<number, ReturnType<typeof setTimeout>>
  >(new Map());

  // Confetti + level up
  const [showConfetti, setShowConfetti] = useState(false);
  const [serverHistory, setServerHistory] = useState<number[]>([]);
  const lastTapTimeRef = useRef<number>(0);

  const { actor } = useActor();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { profileState, openProfile, closeProfile } = useUserProfile();

  const currentUserRef = useRef<string>("You");

  const handleTapAnimated = useCallback((x: number, y: number) => {
    const id = tapIdCounterRef.current++;
    setRecentTaps((prev) => [...prev, { id, x, y }]);
    const timeout = setTimeout(() => {
      setRecentTaps((prev) => prev.filter((t) => t.id !== id));
      tapClearTimeoutsRef.current.delete(id);
    }, 2000);
    tapClearTimeoutsRef.current.set(id, timeout);
  }, []);

  const {
    localCount,
    serverCount,
    comboMultiplier,
    showCombo,
    recordTap,
    resetSession,
  } = useHeartTapSystem({
    streamId,
    actor,
    onTapAnimated: handleTapAnimated,
  });

  // When battle ends, show result modal and record win
  const battleEndedRef = useRef(false);
  useEffect(() => {
    if (battleState.mode === "ended" && !showBattleResult) {
      setShowBattleResult(true);
      if (!battleEndedRef.current) {
        battleEndedRef.current = true;
        recordWin(battleState.winner === "left");
      }
    }
    if (battleState.mode === "active") {
      battleEndedRef.current = false;
    }
  }, [battleState.mode, battleState.winner, showBattleResult, recordWin]);

  // Track server count history for sparkline
  useEffect(() => {
    setServerHistory((prev) => [...prev, serverCount].slice(-20));
  }, [serverCount]);

  // Level up detection
  const prevServerCountRef = useRef(serverCount);
  useEffect(() => {
    const prevLevel = Math.floor(prevServerCountRef.current / 10000);
    const newLevel = Math.floor(serverCount / 10000);
    if (newLevel > prevLevel && prevServerCountRef.current > 0) {
      setShowConfetti(true);
      toast.success(`Support Level Up! 🎉 Level ${newLevel}`, {
        duration: 5000,
        style: {
          background: "#1a0a2e",
          border: "1px solid #FF2D2D",
          color: "white",
        },
      });
      setTimeout(() => setShowConfetti(false), 1500);
    }
    prevServerCountRef.current = serverCount;
  }, [serverCount]);

  // Load coin balance & leaderboard
  useEffect(() => {
    if (!actor) return;
    actor
      .getCoinBalance()
      .then((bal) => setCoinBalance(Number(bal)))
      .catch(() => {});
    actor
      .getGiftLeaderboard(streamId)
      .then(setGiftLeaderboard)
      .catch(() => {});
  }, [actor, streamId]);

  // Viewer increment
  useEffect(() => {
    if (!actor) return;
    actor.incrementLiveViewers(streamId).catch(() => {});
    return () => {
      actor.decrementLiveViewers(streamId).catch(() => {});
      resetSession();
    };
  }, [actor, streamId, resetSession]);

  // Cleanup tap timeouts
  useEffect(() => {
    return () => {
      for (const t of tapClearTimeoutsRef.current.values()) clearTimeout(t);
    };
  }, []);

  // Poll chat
  useEffect(() => {
    if (!actor) return;
    const fetchMessages = async () => {
      try {
        const msgs = await actor.getChatMessages(streamId);
        if (msgs.length > 0) setMessages(msgs.slice(-50));
      } catch {
        // no-op
      }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [actor, streamId]);

  // Simulate viewer fluctuations + system messages
  useEffect(() => {
    const viewerInterval = setInterval(() => {
      setViewerCount((prev) =>
        Math.max(50, prev + Math.floor((Math.random() - 0.45) * 15)),
      );
    }, 4000);
    const systemMsgInterval = setInterval(() => {
      const types: Array<"join" | "follow" | "gift"> = [
        "join",
        "join",
        "join",
        "follow",
        "gift",
      ];
      const type = types[Math.floor(Math.random() * types.length)];
      const msg = generateSystemMessage(type);
      setMessages((prev) => [...prev.slice(-49), msg]);
    }, 12000);
    return () => {
      clearInterval(viewerInterval);
      clearInterval(systemMsgInterval);
    };
  }, []);

  // Auto-scroll chat
  // biome-ignore lint/correctness/useExhaustiveDependencies: only scroll on count change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Initial messages
  useEffect(() => {
    setMessages([
      generateSystemMessage("join"),
      generateSystemMessage("join"),
      generateSystemMessage("follow"),
    ]);
  }, []);

  // Stream state machine: connecting → live after 3s.
  // Skip entirely when creator just finished the Go Live countdown — already live.
  useEffect(() => {
    if (isCreatorGoingLive) return; // Already live — no connecting delay
    const connectTimer = setTimeout(() => {
      setStreamState("live");
    }, 3000);
    return () => clearTimeout(connectTimer);
  }, [isCreatorGoingLive]);

  // Reconnect retry logic — auto-retries every 3s, succeeds after 3 attempts
  useEffect(() => {
    if (streamState !== "reconnecting") {
      if (reconnectTimerRef.current) {
        clearInterval(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      return;
    }
    reconnectTimerRef.current = setInterval(() => {
      setReconnectAttempts((prev) => {
        const next = prev + 1;
        if (next >= 3) {
          setStreamState("live");
          if (reconnectTimerRef.current) {
            clearInterval(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
          }
          return 0;
        }
        return next;
      });
    }, 3000);
    return () => {
      if (reconnectTimerRef.current) {
        clearInterval(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [streamState]);

  // Double-tap detection — always triggers (shadow throttling is server-side)
  const handleTap = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTimeRef.current;
      if (timeSinceLastTap < 300) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const clientX =
          "touches" in e
            ? ((e as React.TouchEvent).changedTouches[0]?.clientX ??
              (e as unknown as React.MouseEvent).clientX)
            : (e as React.MouseEvent).clientX;
        const clientY =
          "touches" in e
            ? ((e as React.TouchEvent).changedTouches[0]?.clientY ??
              (e as unknown as React.MouseEvent).clientY)
            : (e as React.MouseEvent).clientY;
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        recordTap(x, y);
        // Engagement points for "You"
        addTapPoints(currentUserRef.current);
        // Battle score for left side (if battle active)
        if (battleState.mode === "active") {
          addScore("left", 1, "tap");
          addSupporter("left", currentUserRef.current, 1);
        }
      }
      lastTapTimeRef.current = now;
    },
    [recordTap, addTapPoints, battleState.mode, addScore, addSupporter],
  );

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLocked) return;
    const text = chatInput.trim();
    setChatInput("");
    try {
      if (!actor) throw new Error("Not connected");
      await actor.sendChatMessage(streamId, text, "chat");
      const newMsg: LiveChatMessage = {
        id: BigInt(Date.now()),
        text,
        senderUsername: "You",
        sender: { toString: () => "me" } as never,
        messageType: "chat",
        streamId,
        timestamp: BigInt(Date.now()),
      };
      setMessages((prev) => [...prev.slice(-49), newMsg]);
      // Engagement points for comments
      addCommentPoints(currentUserRef.current);
    } catch {
      toast.error("Could not send message");
    }
  };

  const handleSendGift = async () => {
    if (!selectedGift) return;
    if (coinBalance < selectedGift.coins) {
      toast.error(
        `Need ${selectedGift.coins.toLocaleString()} coins. You have ${coinBalance.toLocaleString()}. Recharge to send gifts.`,
      );
      return;
    }
    if (!actor) {
      toast.error("Not connected");
      return;
    }

    // Close drawer and show sending state
    setGiftDrawerOpen(false);
    setGiftSending(true);

    try {
      // STRICT: sendLiveGift is the single atomic call — server verifies balance,
      // deducts coins, and records the transaction. Only call once.
      await actor.sendLiveGift(
        streamId,
        selectedGift.type,
        BigInt(selectedGift.coins),
      );

      // Only after server confirms success:
      setCoinBalance((prev) => prev - selectedGift.coins);

      // Engagement points
      addGiftPoints(currentUserRef.current, selectedGift.coins);

      // Battle score — gift battle points = coinValue * tierMultiplier
      // The hook will further multiply by the battle multiplier (x1/x2/x3)
      if (battleState.mode === "active") {
        const giftTierMult = getGiftTierMultiplier(selectedGift.coins);
        const giftBattlePoints = selectedGift.coins * giftTierMult;
        addScore("left", giftBattlePoints, "gift");
        addSupporter("left", currentUserRef.current, giftBattlePoints);
      }

      // Queue gift broadcast animation ONLY after server success
      const pendingGift: PendingGift = {
        id: `${Date.now()}-${selectedGift.type}`,
        username: "You",
        giftName: selectedGift.label,
        giftEmoji: selectedGift.emoji,
        coinValue: selectedGift.coins,
        tier: getTier(selectedGift.coins),
      };
      setPendingGifts([pendingGift]);

      // Chat gift message ONLY after server success
      const giftMsg = generateSystemMessage(
        "gift",
        `@You sent ${selectedGift.emoji} ${selectedGift.label} (${selectedGift.coins.toLocaleString()} coins)`,
      );
      setMessages((prev) => [...prev.slice(-49), giftMsg]);

      toast.success(`Sent ${selectedGift.emoji} ${selectedGift.label}!`);
    } catch (err) {
      // Server rejected — do NOT show animation, do NOT add chat message
      const errMsg = err instanceof Error ? err.message : "Failed to send gift";
      if (errMsg.includes("Insufficient coins")) {
        toast.error("Insufficient coins. Please recharge your wallet.");
      } else {
        toast.error(`Gift failed: ${errMsg}`);
      }
    } finally {
      setGiftSending(false);
    }
  };

  const handleRequestToJoin = () => {
    if (joinRequestStatus !== "idle") return;
    setJoinRequestStatus("pending");
    simulateViewerJoinRequest();
    toast("Request to join sent! Waiting for host approval…", {
      style: {
        background: "#1a1a1a",
        border: "1px solid #2a2a2a",
        color: "#fff",
      },
    });
    // Simulate host response after 4-8s
    const delay = 4000 + Math.random() * 4000;
    const accepted = Math.random() > 0.3;
    setTimeout(() => {
      if (accepted) {
        setJoinRequestStatus("accepted");
        toast.success("Your request was accepted! You're now co-hosting.");
      } else {
        setJoinRequestStatus("declined");
        toast.error("Your join request was declined.");
        setTimeout(() => setJoinRequestStatus("idle"), 4000);
      }
    }, delay);
  };

  const handleEndLive = async () => {
    try {
      if (!actor) throw new Error("Not connected");
      await actor.endLiveStream(streamId);
      toast.success("Stream ended");
      onEndStream?.();
    } catch {
      toast.error("Failed to end stream");
    }
  };

  const handleStartBattle = () => {
    if (coHosts.length === 0) {
      toast.error("Invite a co-host first to start a battle");
      return;
    }
    const opponent = coHosts[0]?.username ?? "Opponent";
    startBattle("You", opponent, selectedBattleDuration);
    setControlPanelOpen(false);
    toast.success("⚔️ Battle started!");
  };

  const handleRematch = () => {
    setShowBattleResult(false);
    const leftUser = battleState.leftUsername;
    const rightUser = battleState.rightUsername;
    const dur = battleState.timerDuration;
    resetBattle();
    setTimeout(() => {
      startBattle(leftUser, rightUser, dur);
    }, 100);
  };

  const handleEndBattle = () => {
    setShowBattleResult(false);
    resetBattle();
  };

  const chatColors = [
    "#FF6B6B",
    "#4FACFE",
    "#43E97B",
    "#FA8231",
    "#A55EEA",
    "#FD9644",
    "#26DE81",
    "#FC5C7D",
    "#6A3093",
    "#11998E",
  ];
  const getChatColor = (username: string) => {
    if (username === "system" || username === "gift_system") return "#FFD700";
    const idx = username.charCodeAt(0) % chatColors.length;
    return chatColors[idx];
  };

  const badgeLevel = Math.floor(serverCount / 10000);
  const badgeProgress = ((serverCount % 10000) / 10000) * 100;
  const toNextLevel = 10000 - (serverCount % 10000);

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-3.5 h-3.5 text-yellow-400" />;
    if (rank === 2) return <Trophy className="w-3.5 h-3.5 text-gray-300" />;
    if (rank === 3)
      return <Medal className="w-3.5 h-3.5" style={{ color: "#CD7F32" }} />;
    return (
      <span className="text-[10px] font-bold text-gray-500 w-3.5">#{rank}</span>
    );
  };

  const hasCoHosts = coHosts.length > 0;

  return (
    <div
      className="relative flex flex-col h-full overflow-hidden"
      style={{ background: "#000" }}
      data-ocid="live_watch.page"
    >
      {/* Confetti */}
      <ConfettiBurst active={showConfetti} />

      {/* Gift Broadcast Overlay */}
      <GiftBroadcastOverlay
        pendingGifts={pendingGifts}
        onGiftConsumed={(id) =>
          setPendingGifts((prev) => prev.filter((g) => g.id !== id))
        }
      />

      {/* Battle result modal */}
      {showBattleResult && battleState.mode === "ended" && (
        <BattleResultModal
          battleState={battleState}
          battleStats={battleStats}
          onRematch={handleRematch}
          onEnd={handleEndBattle}
        />
      )}

      {/* Video / Stream Area — co-host layout when active */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: video tap area */}
      <div
        className="absolute inset-0"
        onClick={handleTap}
        onTouchEnd={handleTap}
        style={{ cursor: "pointer" }}
      >
        {hasCoHosts ? (
          <LiveCoHostLayout
            layoutMode={layoutMode}
            creator={{ username: "Creator", avatarLetter: "S" }}
            coHosts={coHosts}
            isCreator={isCreator}
            onRemoveCoHost={removeCoHost}
          />
        ) : (
          <>
            {/* Background gradient — ALWAYS rendered, never unmounted.
                Creator gets a warmer, more vivid red-tinted background so the
                screen never looks dark or inactive after going live. */}
            <div
              className="w-full h-full"
              style={{
                background: isCreator
                  ? "radial-gradient(ellipse at 30% 40%, #2a0a0a 0%, #1a0505 50%, #0a0000 100%)"
                  : "radial-gradient(ellipse at 30% 40%, #1a0a2e 0%, #0a0a1a 50%, #000 100%)",
              }}
            />
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: isCreator
                  ? "radial-gradient(ellipse at 50% 30%, rgba(255,45,45,0.18) 0%, transparent 60%)"
                  : "radial-gradient(ellipse at 50% 30%, rgba(255,45,45,0.08) 0%, transparent 70%)",
              }}
            />

            {/* YOU ARE LIVE watermark — creator only, shown once stream is live */}
            {isCreator && streamState === "live" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ top: "30%" }}
              >
                <div className="flex flex-col items-center gap-2 select-none">
                  <motion.div
                    animate={{ opacity: [0.55, 0.9, 0.55] }}
                    transition={{
                      duration: 1.8,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                    className="flex items-center gap-2"
                  >
                    <span className="relative flex w-3 h-3" aria-hidden="true">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex rounded-full w-3 h-3 bg-red-500" />
                    </span>
                    <span
                      className="font-black text-sm tracking-[0.25em] uppercase"
                      style={{
                        color: "rgba(255,255,255,0.65)",
                        textShadow: "0 0 16px rgba(255,45,45,0.6)",
                      }}
                    >
                      YOU ARE LIVE
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* Double-tap hint — viewer only, visible when stream is live */}
            {!isCreator && streamState === "live" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-3 opacity-20">
                  <div className="w-20 h-20 rounded-full border-2 border-white/30 flex items-center justify-center">
                    <Zap className="w-10 h-10 text-white" strokeWidth={1} />
                  </div>
                  <p className="text-white/60 text-xs font-medium">
                    Double tap to ❤️
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Stream state overlay — shown over background, never replaces it */}
        {(streamState === "connecting" || streamState === "reconnecting") && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
            style={{ background: "rgba(0,0,0,0.4)" }}
            data-ocid={
              streamState === "connecting"
                ? "live_watch.stream_connecting.loading_state"
                : "live_watch.stream_reconnecting.loading_state"
            }
          >
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-12 h-12 rounded-full animate-spin"
                style={{
                  border: "3px solid rgba(255,255,255,0.15)",
                  borderTopColor: "#FF2D2D",
                }}
              />
              <p className="text-white text-sm font-medium">
                {streamState === "reconnecting"
                  ? "Reconnecting..."
                  : "Connecting to stream..."}
              </p>
              {streamState === "reconnecting" && (
                <p className="text-white/50 text-xs">
                  Retrying automatically ({reconnectAttempts + 1}/3)
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Heart Animation */}
      <HeartAnimation taps={recentTaps} comboMultiplier={comboMultiplier} />

      {/* Combo label */}
      <AnimatePresence>
        {showCombo && comboMultiplier > 1 && (
          <motion.div
            key={`combo-${comboMultiplier}`}
            initial={{ opacity: 0, scale: 0.5, y: 0 }}
            animate={{ opacity: 1, scale: 1, y: -10 }}
            exit={{ opacity: 0, scale: 0.8, y: -30 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="absolute inset-x-0 z-40 flex justify-center pointer-events-none"
            style={{ top: "42%" }}
            data-ocid="live_watch.combo.panel"
          >
            <div
              className="px-4 py-1.5 rounded-full font-black text-2xl tracking-wider select-none"
              style={{
                background:
                  comboMultiplier >= 5
                    ? "linear-gradient(135deg, #FFD700, #FF6B00)"
                    : "linear-gradient(135deg, #FF2D2D, #FF6B6B)",
                boxShadow:
                  comboMultiplier >= 5
                    ? "0 0 24px rgba(255,215,0,0.7)"
                    : "0 0 20px rgba(255,45,45,0.7)",
                color: "white",
                textShadow: "0 2px 8px rgba(0,0,0,0.4)",
              }}
            >
              x{comboMultiplier}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BATTLE SCOREBOARD — positioned at top, above chat */}
      <div className="absolute top-0 left-0 right-0 z-25 pointer-events-none">
        <div className="pointer-events-auto">
          <BattleScoreboardWrapper
            battleState={battleState}
            onEnd={() => setShowBattleResult(true)}
          />
        </div>
      </div>

      {/* TOP BAR */}
      <div
        className="absolute left-0 right-0 z-20 flex items-center justify-between px-4 pt-5 pb-2"
        style={{ top: battleState.mode !== "idle" ? "88px" : "0" }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            data-ocid="live_watch.back.button"
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.5)" }}
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{ background: "#FF0000" }}
          >
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full w-2 h-2 bg-white" />
            </span>
            <span className="text-white text-xs font-black tracking-wider">
              LIVE
            </span>
          </div>
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full"
            style={{ background: "rgba(0,0,0,0.5)" }}
          >
            <Eye className="w-3 h-3 text-white/70" />
            <motion.span
              key={viewerCount}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-white text-xs font-semibold"
            >
              {formatCount(viewerCount)}
            </motion.span>
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-lg truncate max-w-[80px]">
            {streamTitle}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-ocid="live_watch.follow.button"
            onClick={() => setIsFollowing((v) => !v)}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={{
              background: isFollowing ? "#FF2D2D" : "transparent",
              border: `1px solid ${isFollowing ? "#FF2D2D" : "rgba(255,255,255,0.5)"}`,
              color: "white",
            }}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
          <button
            type="button"
            data-ocid="live_watch.share.button"
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.5)" }}
          >
            <Share2 className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* RIGHT SIDE FLOATING BUTTONS + TOP 3 CHAIRS */}
      <div
        className="absolute right-3 z-20 flex flex-col items-center gap-3"
        style={{ top: battleState.mode !== "idle" ? "170px" : "64px" }}
      >
        {/* Creator avatar — clickable to open profile */}
        <div className="relative">
          <button
            type="button"
            className="w-12 h-12 rounded-full border-2 border-[#FF2D2D] flex items-center justify-center cursor-pointer"
            style={{ background: "linear-gradient(135deg, #FF6B6B, #FF2D2D)" }}
            onClick={() =>
              openProfile(
                creatorPrincipal ?? streamTitle ?? "creator",
                streamTitle,
                "creator",
              )
            }
            data-ocid="live_watch.creator_avatar.button"
            title="View creator profile"
          >
            <span className="text-white font-black text-lg">S</span>
          </button>
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full pointer-events-none"
            style={{ background: "#FF2D2D" }}
          >
            <span className="text-white text-[8px] font-black">LIVE</span>
          </div>
        </div>

        {/* Top 3 Engagement Chairs */}
        <TopEngagementChairs
          top3={top3}
          streamId={streamId}
          onOpenProfile={(userId, username, viewType) =>
            openProfile(userId, username, viewType)
          }
        />

        {/* Heart button */}
        <motion.button
          type="button"
          data-ocid="live_watch.heart_follow.button"
          whileTap={{ scale: 0.8 }}
          onClick={() => setIsFollowing((v) => !v)}
          className="flex flex-col items-center gap-1"
        >
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.5)" }}
          >
            <Heart
              className="w-5 h-5"
              style={{ color: isFollowing ? "#FF6B81" : "white" }}
              fill={isFollowing ? "#FF6B81" : "none"}
            />
          </div>
          <motion.span
            key={Math.floor(localCount / 50)}
            initial={{ scale: 1.15, color: "#FF6B6B" }}
            animate={{ scale: 1, color: "#ccc" }}
            transition={{ duration: 0.3 }}
            className="text-[10px] font-semibold"
            style={{ color: "#ccc" }}
          >
            {formatCount(localCount)}
          </motion.span>
        </motion.button>

        <button
          type="button"
          data-ocid="live_watch.gift.button"
          onClick={() => setGiftDrawerOpen(true)}
          className="flex flex-col items-center gap-1"
        >
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.5)" }}
          >
            <Gift className="w-5 h-5 text-yellow-400" />
          </div>
          <span className="text-[10px] text-white/80 font-semibold">Gift</span>
        </button>

        <button
          type="button"
          data-ocid="live_watch.right_share.button"
          className="flex flex-col items-center gap-1"
        >
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.5)" }}
          >
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-[10px] text-white/80 font-semibold">Share</span>
        </button>

        {/* Request to Join — viewer-only */}
        {!isCreator && (
          <motion.button
            type="button"
            data-ocid="live_watch.request_to_join.button"
            whileTap={{ scale: 0.88 }}
            onClick={handleRequestToJoin}
            disabled={
              joinRequestStatus === "pending" ||
              joinRequestStatus === "accepted"
            }
            className="flex flex-col items-center gap-1"
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{
                background:
                  joinRequestStatus === "accepted"
                    ? "rgba(34,197,94,0.4)"
                    : joinRequestStatus === "pending"
                      ? "rgba(255,165,0,0.3)"
                      : "rgba(255,45,45,0.25)",
                border: `1.5px solid ${
                  joinRequestStatus === "accepted"
                    ? "rgba(34,197,94,0.7)"
                    : joinRequestStatus === "pending"
                      ? "rgba(255,165,0,0.6)"
                      : "rgba(255,45,45,0.5)"
                }`,
              }}
            >
              <Radio
                className="w-5 h-5"
                style={{
                  color:
                    joinRequestStatus === "accepted"
                      ? "#4ade80"
                      : joinRequestStatus === "pending"
                        ? "#fbbf24"
                        : "#FF6B6B",
                }}
              />
            </div>
            <span
              className="text-[9px] font-semibold leading-tight text-center"
              style={{
                color:
                  joinRequestStatus === "accepted"
                    ? "#4ade80"
                    : joinRequestStatus === "pending"
                      ? "#fbbf24"
                      : "#FF9999",
              }}
            >
              {joinRequestStatus === "accepted"
                ? "Co-Host!"
                : joinRequestStatus === "pending"
                  ? "Pending…"
                  : "Join\nLive"}
            </span>
          </motion.button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-ocid="live_watch.more.button"
              className="flex flex-col items-center gap-1"
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.5)" }}
              >
                <MoreHorizontal className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] text-white/80 font-semibold">
                More
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="left"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          >
            <DropdownMenuItem
              className="text-white focus:bg-[#2a2a2a] gap-2"
              data-ocid="live_watch.report.button"
            >
              <Flag className="w-4 h-4" /> Report
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-400 focus:bg-[#2a2a2a] gap-2"
              data-ocid="live_watch.block.button"
            >
              <Ban className="w-4 h-4" /> Block
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Creator Control Panel button */}
      {isCreator && (
        <button
          type="button"
          data-ocid="live_watch.control_panel.button"
          onClick={() => setControlPanelOpen(true)}
          className="absolute top-1/2 left-3 z-20"
          style={{ transform: "translateY(-50%)" }}
        >
          <div
            className="px-2 py-4 rounded-full flex flex-col items-center"
            style={{ background: "rgba(0,0,0,0.5)", border: "1px solid #333" }}
          >
            <Settings className="w-4 h-4 text-white/60" />
          </div>
        </button>
      )}

      {/* CHAT OVERLAY */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 flex flex-col"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.4) 80%, transparent 100%)",
          backdropFilter: "blur(2px)",
        }}
      >
        <div
          className="flex flex-col gap-1.5 px-3 pt-4 overflow-y-auto"
          style={{ maxHeight: "38vh" }}
        >
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id.toString()}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex gap-2 items-start"
              >
                {msg.messageType === "system" ? (
                  <p className="text-xs text-gray-400 italic">{msg.text}</p>
                ) : msg.messageType === "gift" ? (
                  <p
                    className="text-xs font-bold"
                    style={{
                      color: "#FFD700",
                      textShadow: "0 0 8px rgba(255,215,0,0.5)",
                    }}
                  >
                    {/* Parse @username from gift message and make it clickable */}
                    {(() => {
                      const match = msg.text.match(/^@(\S+)/);
                      if (match?.[1]) {
                        const giftUsername = match[1];
                        const rest = msg.text.slice(giftUsername.length + 1);
                        return (
                          <>
                            🎁{" "}
                            <button
                              type="button"
                              className="font-bold hover:underline bg-transparent border-0 p-0 cursor-pointer"
                              style={{ color: "#FFD700" }}
                              onClick={() =>
                                openProfile(
                                  giftUsername,
                                  giftUsername,
                                  "viewer",
                                )
                              }
                            >
                              @{giftUsername}
                            </button>
                            {rest}
                          </>
                        );
                      }
                      return <>🎁 {msg.text}</>;
                    })()}
                  </p>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          msg.senderUsername !== "system" &&
                          msg.senderUsername !== "gift_system" &&
                          msg.senderUsername !== "You"
                        ) {
                          openProfile(
                            msg.sender.toString(),
                            msg.senderUsername,
                            "viewer",
                          );
                        }
                      }}
                      className="text-xs font-bold flex-shrink-0 hover:underline cursor-pointer bg-transparent border-0 p-0"
                      style={{ color: getChatColor(msg.senderUsername) }}
                      data-ocid="live_watch.chat_username.button"
                    >
                      {msg.senderUsername}
                    </button>
                    <span className="text-xs text-white/90 break-words">
                      {msg.text}
                    </span>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Chat input */}
        <div className="flex items-center gap-2 px-3 py-3">
          <button
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <Smile className="w-4 h-4 text-white/60" />
          </button>
          <div className="flex-1">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSendMessage();
              }}
              placeholder={chatLocked ? "Chat locked" : "Say something..."}
              disabled={chatLocked}
              data-ocid="live_watch.chat.input"
              className="w-full text-sm text-white placeholder:text-white/40 rounded-full px-4 py-2 outline-none"
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
          </div>
          <button
            type="button"
            data-ocid="live_watch.chat_send.button"
            onClick={() => void handleSendMessage()}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: chatInput.trim()
                ? "#FF2D2D"
                : "rgba(255,255,255,0.1)",
            }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* ─── GIFT DRAWER (Full catalog) ─── */}
      <Sheet
        open={giftDrawerOpen}
        onOpenChange={(o) => !o && setGiftDrawerOpen(false)}
      >
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-0 p-0"
          style={{ background: "#0f0f0f", maxHeight: "80vh" }}
          data-ocid="live_watch.gift.sheet"
        >
          <SheetHeader className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-white text-base font-bold">
                🎁 Gift Box
              </SheetTitle>
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: "#1a1a1a" }}
              >
                <span className="text-yellow-400 text-sm">🪙</span>
                <span className="text-white text-sm font-bold">
                  {coinBalance.toLocaleString()}
                </span>
              </div>
            </div>
          </SheetHeader>

          <div className="px-5 pb-6 overflow-y-auto scrollbar-hide">
            {GIFT_TIERS.map((tierGroup) => (
              <div key={tierGroup.tier} className="mb-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  {tierGroup.tier}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {tierGroup.gifts.map((gift) => {
                    const isSelected = selectedGift?.type === gift.type;
                    const giftEntry = gift as GiftEntry;
                    const tier = getTier(gift.coins);
                    const tierGlow = {
                      small: "none",
                      medium: "0 0 12px rgba(255,215,0,0.3)",
                      large: "0 0 16px rgba(255,45,45,0.4)",
                      ultra: "0 0 20px rgba(255,215,0,0.6)",
                    }[tier];

                    return (
                      <button
                        key={gift.type}
                        type="button"
                        data-ocid={`live_watch.gift_${gift.type}.button`}
                        onClick={() => setSelectedGift(giftEntry)}
                        className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl transition-all"
                        style={{
                          background: isSelected ? "#FF2D2D22" : "#1a1a1a",
                          border: `1.5px solid ${isSelected ? "#FF2D2D" : tier === "ultra" ? "rgba(255,215,0,0.3)" : "#2a2a2a"}`,
                          boxShadow: isSelected ? tierGlow : "none",
                        }}
                      >
                        <motion.span
                          animate={
                            tier === "ultra" || tier === "large"
                              ? { y: [0, -3, 0] }
                              : {}
                          }
                          transition={{
                            duration: 1.5,
                            repeat: Number.POSITIVE_INFINITY,
                          }}
                          className="text-2xl"
                        >
                          {gift.emoji}
                        </motion.span>
                        <span className="text-[10px] text-white/80 font-medium leading-tight text-center">
                          {gift.label}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <span className="text-yellow-400 text-[9px]">🪙</span>
                          <span
                            className="text-[10px] font-bold"
                            style={{
                              color:
                                tier === "ultra"
                                  ? "#FFD700"
                                  : tier === "large"
                                    ? "#FFA500"
                                    : "#FFD700",
                            }}
                          >
                            {gift.coins >= 1000
                              ? `${(gift.coins / 1000).toFixed(0)}K`
                              : gift.coins}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Send button */}
            {selectedGift && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                type="button"
                data-ocid="live_watch.send_gift.primary_button"
                onClick={() => void handleSendGift()}
                disabled={giftSending}
                className="w-full h-12 rounded-2xl font-bold text-white text-sm mb-3 flex items-center justify-center gap-2 disabled:opacity-70"
                style={{
                  background: giftSending
                    ? "#1a1a1a"
                    : "linear-gradient(135deg, #FF2D2D, #FF6B6B)",
                  boxShadow: giftSending
                    ? "none"
                    : "0 0 20px rgba(255,45,45,0.4)",
                }}
              >
                {giftSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    Send {selectedGift.emoji} {selectedGift.label} — 🪙
                    {selectedGift.coins.toLocaleString()}
                  </>
                )}
              </motion.button>
            )}

            {/* Gift leaderboard */}
            {giftLeaderboard.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-yellow-400" />
                  Top Gifters
                </h4>
                <div className="flex flex-col gap-1.5">
                  {giftLeaderboard.slice(0, 3).map((gift, idx) => (
                    <div
                      key={gift.id.toString()}
                      className="flex items-center justify-between px-3 py-2 rounded-xl"
                      style={{ background: "#111" }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-bold"
                          style={{
                            color:
                              idx === 0
                                ? "#FFD700"
                                : idx === 1
                                  ? "#C0C0C0"
                                  : "#CD7F32",
                          }}
                        >
                          #{idx + 1}
                        </span>
                        <span className="text-white text-xs font-medium">
                          {gift.senderUsername}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400 text-[10px]">🪙</span>
                        <span className="text-yellow-400 text-xs font-bold">
                          {Number(gift.coinValue).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Get more coins */}
            <button
              type="button"
              data-ocid="live_watch.add_coins.button"
              onClick={() => {
                setGiftDrawerOpen(false);
                onNavigateToWallet?.();
              }}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-center transition-colors"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,165,0,0.1))",
                border: "1px solid rgba(255,215,0,0.2)",
                color: "#FFD700",
              }}
            >
              🪙 Get More Coins
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── CREATOR CONTROL PANEL ─── */}
      {isCreator && (
        <Sheet
          open={controlPanelOpen}
          onOpenChange={(o) => !o && setControlPanelOpen(false)}
        >
          <SheetContent
            side="bottom"
            className="rounded-t-3xl border-0 p-0"
            style={{ background: "#0f0f0f", maxHeight: "90vh" }}
            data-ocid="live_watch.control_panel.sheet"
          >
            <SheetHeader className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" style={{ color: "#FF2D2D" }} />
                <SheetTitle className="text-white text-base font-bold">
                  Stream Controls
                </SheetTitle>
              </div>
            </SheetHeader>

            <div className="px-5 pb-8 overflow-y-auto">
              {/* ── Creator Live Balance ── */}
              <CreatorLiveBalancePanel
                streamId={streamId}
                onWalletClick={() => {
                  setControlPanelOpen(false);
                  onNavigateToWallet?.();
                }}
                onWithdrawClick={() => {
                  setControlPanelOpen(false);
                  onNavigateToWallet?.();
                }}
              />

              {/* ── Co-Hosting Section ── */}
              <div
                className="mb-4 p-4 rounded-2xl"
                style={{ background: "#111", border: "1px solid #1e1e1e" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" style={{ color: "#4FACFE" }} />
                    <span className="text-white text-sm font-bold">
                      Co-Hosting
                    </span>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      background: hasCoHosts
                        ? "rgba(79,172,254,0.15)"
                        : "#1a1a1a",
                      color: hasCoHosts ? "#4FACFE" : "#666",
                      border: `1px solid ${hasCoHosts ? "rgba(79,172,254,0.3)" : "#2a2a2a"}`,
                    }}
                  >
                    {layoutMode === "solo"
                      ? "Solo"
                      : layoutMode === "1v1"
                        ? "1v1"
                        : layoutMode === "2v2"
                          ? "2v2"
                          : "4-Way"}
                  </span>
                </div>

                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setControlPanelOpen(false);
                      setCoHostModalOpen(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold"
                    style={{
                      background: "rgba(255,45,45,0.15)",
                      border: "1px solid rgba(255,45,45,0.3)",
                      color: "#FF6B6B",
                    }}
                    data-ocid="live_watch.invite_cohost.button"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Invite Co-Host
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setControlPanelOpen(false);
                      setViewerListOpen(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold"
                    style={{
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      color: "#ccc",
                    }}
                    data-ocid="live_watch.viewer_list.button"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Viewer List
                    {joinRequests.length > 0 && (
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black"
                        style={{ background: "#FF2D2D", color: "white" }}
                      >
                        {joinRequests.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Co-hosts list */}
                {coHosts.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {coHosts.map((ch) => (
                      <div
                        key={ch.id}
                        className="flex items-center justify-between px-3 py-2 rounded-xl"
                        style={{ background: "#1a1a1a" }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                            style={{ background: "#2a2a2a" }}
                          >
                            {ch.avatarLetter}
                          </div>
                          <span className="text-white text-xs">
                            @{ch.username}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCoHost(ch.id)}
                          className="text-red-400 text-[10px] font-semibold"
                          data-ocid="live_watch.remove_cohost.button"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Battle Section ── */}
              <div
                className="mb-4 p-4 rounded-2xl"
                style={{
                  background: "#111",
                  border: "1px solid rgba(255,45,45,0.2)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Swords className="w-4 h-4" style={{ color: "#FF2D2D" }} />
                    <span className="text-white text-sm font-bold">
                      Battle Mode
                    </span>
                  </div>
                  <span
                    className="text-xs font-semibold flex items-center gap-1"
                    style={{ color: "#FF6B6B" }}
                    data-ocid="live_watch.battle_streak.panel"
                  >
                    🔥 Streak: {battleState.streak}
                  </span>
                </div>

                {/* Timer selector */}
                {battleState.mode === "idle" && (
                  <div className="flex gap-2 mb-3">
                    {([60, 180, 300] as const).map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setSelectedBattleDuration(dur)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                        style={{
                          background:
                            selectedBattleDuration === dur
                              ? "#FF2D2D"
                              : "#1a1a1a",
                          color:
                            selectedBattleDuration === dur ? "white" : "#888",
                          border: `1px solid ${selectedBattleDuration === dur ? "#FF2D2D" : "#2a2a2a"}`,
                        }}
                        data-ocid={
                          dur === 60
                            ? "live_watch.battle_timer_1min.button"
                            : dur === 180
                              ? "live_watch.battle_timer_3min.button"
                              : "live_watch.battle_timer_5min.button"
                        }
                      >
                        {dur === 60 ? "1 min" : dur === 180 ? "3 min" : "5 min"}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleStartBattle}
                  disabled={battleState.mode === "active"}
                  className="w-full py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all"
                  style={{
                    background:
                      battleState.mode === "active"
                        ? "#1a1a1a"
                        : "linear-gradient(135deg, #FF2D2D, #FF6B00)",
                    boxShadow:
                      battleState.mode === "active"
                        ? "none"
                        : "0 0 20px rgba(255,45,45,0.4)",
                    opacity: battleState.mode === "active" ? 0.6 : 1,
                  }}
                  data-ocid="live_watch.start_battle.button"
                >
                  <Swords className="w-4 h-4" />
                  {battleState.mode === "active"
                    ? "Battle in Progress…"
                    : "⚔️ Start Battle"}
                </button>

                {!hasCoHosts && battleState.mode === "idle" && (
                  <p className="text-gray-600 text-[11px] text-center mt-2">
                    Invite a co-host first to start a battle
                  </p>
                )}

                {/* Battle & leaderboard links */}
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setControlPanelOpen(false);
                      onBattleHistory?.();
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold"
                    style={{
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      color: "#888",
                    }}
                  >
                    <History className="w-3 h-3" />
                    Battle History
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setControlPanelOpen(false);
                      onWeeklyLeaderboard?.();
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold"
                    style={{
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      color: "#888",
                    }}
                  >
                    <Trophy className="w-3 h-3" />
                    Leaderboard
                  </button>
                </div>
              </div>

              {/* ── Support Stats ── */}
              <div
                className="mb-4 p-4 rounded-2xl"
                style={{ background: "#111", border: "1px solid #1e1e1e" }}
                data-ocid="live_watch.support_stats.panel"
              >
                <div className="flex items-center gap-2 mb-3">
                  <BarChart2 className="w-4 h-4" style={{ color: "#FF2D2D" }} />
                  <span className="text-white text-sm font-bold">
                    Support Stats
                  </span>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-xs">Weighted Hearts</span>
                  <span className="text-white font-bold text-sm">
                    {formatCount(serverCount)}
                  </span>
                </div>

                <div className="mb-3 opacity-90">
                  <Sparkline
                    data={
                      serverHistory.length > 1
                        ? serverHistory
                        : [serverCount, serverCount + 10]
                    }
                  />
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-white text-xs font-semibold">
                        Level {badgeLevel}
                      </span>
                    </div>
                    <span className="text-gray-400 text-[10px]">
                      {(serverCount % 10000).toLocaleString()} / 10,000
                    </span>
                  </div>
                  <Progress
                    value={badgeProgress}
                    className="h-1.5 bg-[#2a2a2a]"
                    style={
                      { "--progress-fill": "#FF2D2D" } as React.CSSProperties
                    }
                  />
                  <p className="text-gray-500 text-[10px] mt-1">
                    {toNextLevel.toLocaleString()} more to Level{" "}
                    {badgeLevel + 1}
                  </p>
                </div>

                <div>
                  <h4 className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-2">
                    Top Supporters
                  </h4>
                  <div className="flex flex-col gap-1.5">
                    {MOCK_TOP_SUPPORTERS.map((supporter) => (
                      <div
                        key={supporter.name}
                        className="flex items-center justify-between"
                        data-ocid={`live_watch.supporter.item.${supporter.rank}`}
                      >
                        <div className="flex items-center gap-2">
                          {rankIcon(supporter.rank)}
                          <span className="text-white text-xs">
                            {supporter.name}
                          </span>
                        </div>
                        <span
                          className="text-[10px] font-semibold"
                          style={{ color: "#FF6B6B" }}
                        >
                          {supporter.taps.toLocaleString()} ❤️
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Stream Controls ── */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  data-ocid="live_watch.end_live.delete_button"
                  onClick={() => void handleEndLive()}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white"
                  style={{
                    background: "#FF2D2D22",
                    border: "1px solid #FF2D2D",
                  }}
                >
                  🔴 End Live Stream
                </button>

                {[
                  {
                    label: "Mute Mic",
                    icon: micEnabled ? Mic : MicOff,
                    value: !micEnabled,
                    set: () => setMicEnabled((v) => !v),
                    ocid: "live_watch.mute_mic.toggle",
                  },
                  {
                    label: "Lock Chat",
                    icon: MessageCircle,
                    value: chatLocked,
                    set: () => setChatLocked((v) => !v),
                    ocid: "live_watch.lock_chat.toggle",
                  },
                ].map((ctrl) => (
                  <div
                    key={ctrl.label}
                    className="flex items-center justify-between px-4 py-3.5 rounded-xl"
                    style={{ background: "#111", border: "1px solid #1e1e1e" }}
                  >
                    <div className="flex items-center gap-3">
                      <ctrl.icon className="w-5 h-5 text-gray-400" />
                      <span className="text-white text-sm font-medium">
                        {ctrl.label}
                      </span>
                    </div>
                    <Switch
                      data-ocid={ctrl.ocid}
                      checked={ctrl.value}
                      onCheckedChange={ctrl.set}
                      className="data-[state=checked]:bg-[#FF2D2D]"
                    />
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-2 mt-1">
                  {[
                    {
                      icon: Wand2,
                      label: "Effects",
                      ocid: "live_watch.effects.button",
                      action: () => {
                        setControlPanelOpen(false);
                        setEffectsPanelOpen(true);
                      },
                    },
                    {
                      icon: Sparkles,
                      label: "Add Filter",
                      ocid: "live_watch.add_filter.button",
                      action: undefined,
                    },
                    {
                      icon: Star,
                      label: "Add Music",
                      ocid: "live_watch.add_music.button",
                      action: undefined,
                    },
                    {
                      icon: BarChart2,
                      label: "Add Poll",
                      ocid: "live_watch.add_poll.button",
                      action: undefined,
                    },
                    {
                      icon: Zap,
                      label: "Add Banner",
                      ocid: "live_watch.add_banner.button",
                      action: undefined,
                    },
                    {
                      icon: Shield,
                      label: "Moderators",
                      ocid: "live_watch.moderators.button",
                      action: undefined,
                    },
                    {
                      icon: Crown,
                      label: "Sub-only Mode",
                      ocid: "live_watch.sub_mode.button",
                      action: undefined,
                    },
                  ].map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      data-ocid={action.ocid}
                      onClick={action.action}
                      className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium text-white"
                      style={{
                        background: "#111",
                        border: "1px solid #1e1e1e",
                      }}
                    >
                      <action.icon className="w-4 h-4 text-gray-400" />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* ─── CO-HOST INVITE MODAL ─── */}
      <CoHostInviteModal
        open={coHostModalOpen}
        onClose={() => setCoHostModalOpen(false)}
        pendingInvites={pendingInvites}
        joinRequests={joinRequests}
        onSendInvite={sendInvite}
        onAcceptJoinRequest={acceptJoinRequest}
        onDeclineRequest={declineRequest}
      />

      {/* ─── VIEWER LIST PANEL ─── */}
      <ViewerListPanel
        open={viewerListOpen}
        onClose={() => setViewerListOpen(false)}
        onInviteToCoHost={(username) => {
          sendInvite(username);
          setViewerListOpen(false);
          setCoHostModalOpen(true);
        }}
        viewers={top3.map((entry) => ({
          name: entry.username,
          score: entry.score,
          joinedAgo: 0,
        }))}
        onOpenProfile={(username) => {
          setViewerListOpen(false);
          openProfile(username, username, "viewer");
        }}
      />

      {/* ─── USER PROFILE MODAL ─── */}
      <UserProfileModal
        open={profileState.open}
        onClose={closeProfile}
        userId={profileState.userId}
        username={profileState.username}
        viewType={profileState.viewType}
        currentUserPrincipal={currentUserPrincipal}
        onOpenGiftDrawer={() => setGiftDrawerOpen(true)}
      />

      {/* ─── EFFECTS PANEL ─── */}
      <LiveEffectsPanel
        open={effectsPanelOpen}
        onClose={() => setEffectsPanelOpen(false)}
      />
    </div>
  );
}
