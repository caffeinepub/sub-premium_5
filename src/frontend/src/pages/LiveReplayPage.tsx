import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Bookmark,
  DollarSign,
  Heart,
  MessageCircle,
  Pause,
  Play,
  Scissors,
  Share2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { LiveChatMessage, LiveStream } from "../backend.d";
import { useActor } from "../hooks/useActor";

interface LiveReplayPageProps {
  streamId: bigint;
  onBack: () => void;
}

export default function LiveReplayPage({
  streamId,
  onBack,
}: LiveReplayPageProps) {
  const { actor } = useActor();
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [monetizeReplay, setMonetizeReplay] = useState(false);
  const [activeChatIdx, setActiveChatIdx] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulated total duration in seconds
  const totalDuration = 3600; // 1 hour

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!actor) throw new Error("not ready");
        const [s, msgs] = await Promise.all([
          actor.getLiveStream(streamId),
          actor.getChatMessages(streamId),
        ]);
        setStream(s);
        setMessages(msgs);
      } catch {
        // Mock fallback
        setStream({
          id: streamId,
          status: "ended",
          title: "Replay: My Live Stream",
          description: "Watch the full replay of this amazing live stream.",
          category: "Entertainment",
          tags: [],
          privacy: "public",
          creatorId: { toString: () => "" } as never,
          startedAt: BigInt(Date.now() - 3600000),
          endedAt: BigInt(Date.now()),
          viewerCount: BigInt(842),
          peakViewers: BigInt(1234),
          totalLikes: BigInt(5678),
          totalGifts: BigInt(23),
          totalRevenue: BigInt(4500),
          newFollowers: BigInt(87),
          chatEnabled: true,
          replayEnabled: true,
          monetizationEnabled: false,
          scheduledAt: undefined,
        });

        // Mock chat messages
        const mockMessages: LiveChatMessage[] = [
          {
            id: BigInt(1),
            text: "This is so amazing!",
            senderUsername: "alex_v",
            sender: { toString: () => "" } as never,
            messageType: "chat",
            streamId,
            timestamp: BigInt(0),
          },
          {
            id: BigInt(2),
            text: "Can't stop watching 🔥",
            senderUsername: "sarah_m",
            sender: { toString: () => "" } as never,
            messageType: "chat",
            streamId,
            timestamp: BigInt(1000),
          },
          {
            id: BigInt(3),
            text: "This content is insane",
            senderUsername: "james_k",
            sender: { toString: () => "" } as never,
            messageType: "chat",
            streamId,
            timestamp: BigInt(2000),
          },
          {
            id: BigInt(4),
            text: "Let's GOOO!",
            senderUsername: "priya_d",
            sender: { toString: () => "" } as never,
            messageType: "chat",
            streamId,
            timestamp: BigInt(3000),
          },
          {
            id: BigInt(5),
            text: "Followed! Don't miss your content 💯",
            senderUsername: "tony_r",
            sender: { toString: () => "" } as never,
            messageType: "chat",
            streamId,
            timestamp: BigInt(4000),
          },
        ];
        setMessages(mockMessages);
      }
    };
    void fetchData();
  }, [actor, streamId]);

  // Simulate playback progress
  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        setProgress((prev) => {
          const next = prev + 100 / totalDuration;
          if (next >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return next;
        });
      }, 1000);
    } else if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [isPlaying]);

  // Scroll chat replay based on progress
  useEffect(() => {
    if (messages.length > 0) {
      const idx = Math.floor((progress / 100) * messages.length);
      setActiveChatIdx(Math.min(idx, messages.length - 1));
    }
  }, [progress, messages.length]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on index change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChatIdx]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0)
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const currentSeconds = Math.floor((progress / 100) * totalDuration);

  const chatColors = [
    "#FF6B6B",
    "#4FACFE",
    "#43E97B",
    "#FA8231",
    "#A55EEA",
    "#FD9644",
  ];
  const getChatColor = (username: string) =>
    chatColors[username.charCodeAt(0) % chatColors.length];

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "#0f0f0f" }}
      data-ocid="live_replay.page"
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 pt-5 pb-3"
        style={{ background: "#0f0f0f" }}
      >
        <button
          type="button"
          onClick={onBack}
          data-ocid="live_replay.back.button"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "#1a1a1a" }}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div className="flex items-center gap-2">
          <span
            className="px-3 py-1 rounded-full text-xs font-black"
            style={{ background: "#f59e0b", color: "#000" }}
          >
            REPLAY
          </span>
          <h1
            className="text-sm font-bold text-white truncate max-w-[120px]"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {stream?.title || "Live Replay"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-ocid="live_replay.share.button"
            onClick={() => toast.success("Link copied!")}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "#1a1a1a" }}
          >
            <Share2 className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Video Player */}
        <div
          className="relative mx-4 rounded-2xl overflow-hidden mb-4"
          style={{
            aspectRatio: "9/16",
            maxHeight: "40vh",
            background: "linear-gradient(145deg, #0a0a1a, #1a1a2e)",
          }}
        >
          {/* Play/Pause overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence>
              {!isPlaying && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,45,45,0.9)" }}
                >
                  <Play className="w-8 h-8 text-white ml-1" fill="white" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Click to play/pause */}
          <button
            type="button"
            data-ocid="live_replay.player.button"
            className="absolute inset-0 w-full h-full"
            onClick={() => setIsPlaying((v) => !v)}
          />

          {/* Controls overlay */}
          <div
            className="absolute bottom-0 left-0 right-0 p-3"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
            }}
          >
            {/* Progress bar */}
            <div
              className="relative w-full h-1.5 rounded-full mb-2"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all"
                style={{ width: `${progress}%`, background: "#FF2D2D" }}
              />
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                data-ocid="live_replay.scrubber.input"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-ocid="live_replay.play_pause.button"
                  onClick={() => setIsPlaying((v) => !v)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 text-white" fill="white" />
                  ) : (
                    <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
                  )}
                </button>
                <span className="text-white text-xs font-mono">
                  {formatTime(currentSeconds)} / {formatTime(totalDuration)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center justify-end gap-3 px-4 mb-4">
          <motion.button
            type="button"
            data-ocid="live_replay.like.button"
            whileTap={{ scale: 0.85 }}
            onClick={() => setLiked((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full"
            style={{
              background: liked ? "#FF2D2D22" : "#1a1a1a",
              border: `1px solid ${liked ? "#FF2D2D" : "#2a2a2a"}`,
            }}
          >
            <Heart
              className="w-4 h-4"
              style={{ color: liked ? "#FF2D2D" : "#9ca3af" }}
              fill={liked ? "#FF2D2D" : "none"}
            />
            <span
              className="text-xs font-semibold"
              style={{ color: liked ? "#FF2D2D" : "#9ca3af" }}
            >
              {Number(stream?.totalLikes || 0).toLocaleString()}
            </span>
          </motion.button>

          <button
            type="button"
            data-ocid="live_replay.save.button"
            onClick={() => setSaved((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full"
            style={{
              background: saved ? "#3b82f622" : "#1a1a1a",
              border: `1px solid ${saved ? "#3b82f6" : "#2a2a2a"}`,
            }}
          >
            <Bookmark
              className="w-4 h-4"
              style={{ color: saved ? "#3b82f6" : "#9ca3af" }}
              fill={saved ? "#3b82f6" : "none"}
            />
            <span
              className="text-xs font-semibold"
              style={{ color: saved ? "#3b82f6" : "#9ca3af" }}
            >
              Save
            </span>
          </button>

          <button
            type="button"
            data-ocid="live_replay.clip.button"
            onClick={() => toast.info("Clip highlights feature coming soon")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          >
            <Scissors className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-semibold text-gray-400">Clip</span>
          </button>
        </div>

        {/* Monetize replay toggle (creator only) */}
        <div
          className="mx-4 mb-4 flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: "#111", border: "1px solid #1e1e1e" }}
        >
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-yellow-400" />
            <div>
              <p className="text-sm font-semibold text-white">
                Monetize Replay
              </p>
              <p className="text-xs text-gray-500">Earn from replay views</p>
            </div>
          </div>
          <Switch
            data-ocid="live_replay.monetize.switch"
            checked={monetizeReplay}
            onCheckedChange={(v) => {
              setMonetizeReplay(v);
              toast.success(v ? "Replay monetized!" : "Monetization disabled");
            }}
            className="data-[state=checked]:bg-[#FF2D2D]"
          />
        </div>

        {/* Chat Replay section */}
        <div className="px-4 pb-8">
          <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4" />
            Chat Replay
          </h3>

          <div
            className="rounded-2xl p-3 flex flex-col gap-2 overflow-y-auto"
            style={{
              background: "#111",
              border: "1px solid #1e1e1e",
              maxHeight: "200px",
            }}
          >
            {messages.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-4">
                No chat messages
              </p>
            ) : (
              messages.slice(0, activeChatIdx + 1).map((msg) => (
                <div key={msg.id.toString()} className="flex gap-2 items-start">
                  <span
                    className="text-xs font-bold flex-shrink-0"
                    style={{ color: getChatColor(msg.senderUsername) }}
                  >
                    {msg.senderUsername}
                  </span>
                  <span className="text-xs text-white/80 break-words">
                    {msg.text}
                  </span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
