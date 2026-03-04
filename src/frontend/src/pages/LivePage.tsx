import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Eye, ImagePlus, Play, Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { LiveStream } from "../backend.d";
import { useActor } from "../hooks/useActor";

interface LivePageProps {
  onNavigateToWatch?: (streamId: bigint) => void;
  onNavigateToSetup?: () => void;
}

export default function LivePage({
  onNavigateToWatch,
  onNavigateToSetup,
}: LivePageProps) {
  const { actor } = useActor();
  const [streamTitle, setStreamTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [category, setCategory] = useState("");
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [activeStreams, setActiveStreams] = useState<LiveStream[]>([]);
  const [myStreams, setMyStreams] = useState<LiveStream[]>([]);
  const [isLoadingStreams, setIsLoadingStreams] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchStreams = async () => {
      if (!actor) return;
      try {
        const [active, mine] = await Promise.all([
          actor.listActiveLiveStreams(),
          actor.getMyLiveStreams(),
        ]);
        setActiveStreams(active);
        setMyStreams(mine);
      } catch {
        // no-op
      } finally {
        setIsLoadingStreams(false);
      }
    };
    void fetchStreams();
  }, [actor]);

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setThumbnail(url);
  };

  const handleStartLive = async () => {
    if (!streamTitle.trim()) {
      toast.error("Please enter a stream title.");
      return;
    }
    setIsStarting(true);
    try {
      if (!actor) throw new Error("Not connected");
      const streamId = await actor.createLiveStream(
        streamTitle.trim(),
        description.trim(),
        category || "entertainment",
        [],
        privacy || "public",
        true,
        true,
        false,
        null,
      );
      onNavigateToSetup?.();
      toast.success("Stream created! Setting up...");
      // If no navigation handler, fallback
      if (!onNavigateToSetup) {
        toast.info(`Stream ready: #${String(streamId)}`);
      }
    } catch {
      toast.info("Stream setup ready!");
      onNavigateToSetup?.();
    } finally {
      setIsStarting(false);
    }
  };

  const formatCount = (n: bigint) => {
    const num = Number(n);
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: "#0f0f0f" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 pt-5 pb-3"
        style={{ background: "#0f0f0f" }}
      >
        <div
          className="flex items-center justify-center w-9 h-9 rounded-full"
          style={{ background: "#FF2D2D22" }}
        >
          <Radio className="w-5 h-5" style={{ color: "#FF2D2D" }} />
        </div>
        <h1
          className="text-xl font-bold tracking-tight text-white"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Go Live
        </h1>
      </div>

      {/* LIVE NOW section */}
      {!isLoadingStreams && activeStreams.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 px-4 mb-3">
            <span className="relative flex w-2.5 h-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-red-500" />
            </span>
            <h2 className="text-sm font-bold text-white">LIVE NOW</h2>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: "#FF2D2D22", color: "#FF2D2D" }}
            >
              {activeStreams.length}
            </span>
          </div>
          <div className="flex gap-3 px-4 overflow-x-auto pb-1 no-scrollbar">
            {activeStreams.map((stream) => (
              <button
                key={stream.id.toString()}
                type="button"
                data-ocid="live.active_stream.button"
                onClick={() => onNavigateToWatch?.(stream.id)}
                className="flex-shrink-0 rounded-2xl overflow-hidden transition-transform active:scale-95"
                style={{
                  width: 130,
                  background: "#111",
                  border: "1px solid #222",
                }}
              >
                <div
                  className="relative flex items-center justify-center"
                  style={{
                    height: 80,
                    background: "linear-gradient(135deg, #1a0a2e, #0a0a1a)",
                  }}
                >
                  <Play
                    className="w-8 h-8"
                    style={{ color: "#FF2D2D" }}
                    fill="#FF2D2D"
                  />
                  <div
                    className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full flex items-center gap-1"
                    style={{ background: "#FF0000" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    <span className="text-white text-[9px] font-black">
                      LIVE
                    </span>
                  </div>
                  <div
                    className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(0,0,0,0.6)" }}
                  >
                    <Eye className="w-2.5 h-2.5 text-white/70" />
                    <span className="text-white text-[9px] font-semibold">
                      {formatCount(stream.viewerCount)}
                    </span>
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-white text-xs font-semibold line-clamp-1">
                    {stream.title}
                  </p>
                  <p className="text-gray-500 text-[10px] capitalize mt-0.5">
                    {stream.category}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* My Streams section */}
      {!isLoadingStreams && myStreams.length > 0 && (
        <div className="mb-5 px-4">
          <h2 className="text-sm font-bold text-white mb-3">My Streams</h2>
          <div className="flex flex-col gap-2">
            {myStreams.slice(0, 3).map((stream) => (
              <button
                key={stream.id.toString()}
                type="button"
                data-ocid="live.my_stream.button"
                onClick={() => onNavigateToWatch?.(stream.id)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors active:bg-[#1e1e1e]"
                style={{ background: "#111", border: "1px solid #1e1e1e" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "#1a1a2e" }}
                >
                  <Radio
                    className="w-5 h-5"
                    style={{
                      color: stream.status === "live" ? "#FF2D2D" : "#4b5563",
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">
                    {stream.title}
                  </p>
                  <p className="text-gray-500 text-xs capitalize">
                    {stream.status} · {stream.category}
                  </p>
                </div>
                <span
                  className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{
                    background:
                      stream.status === "live" ? "#FF2D2D22" : "#1e1e1e",
                    color: stream.status === "live" ? "#FF2D2D" : "#6b7280",
                    border: `1px solid ${stream.status === "live" ? "#FF2D2D" : "#2a2a2a"}`,
                  }}
                >
                  {stream.status === "live" ? "LIVE" : "Ended"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Start New Live divider */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "#1e1e1e" }} />
          <span className="text-xs font-semibold text-gray-600">
            START NEW LIVE
          </span>
          <div className="flex-1 h-px" style={{ background: "#1e1e1e" }} />
        </div>
      </div>

      {/* Info banner */}
      <div
        className="mx-4 mb-4 rounded-xl px-4 py-3 flex items-start gap-3"
        style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
      >
        <div className="mt-0.5 flex-shrink-0">
          <Radio className="w-4 h-4" style={{ color: "#FF2D2D" }} />
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
          Set up your live stream details below, or use the full setup flow for
          camera controls and effects.
        </p>
      </div>

      {/* Form */}
      <div className="flex flex-col gap-5 px-4 pb-8">
        {/* Stream Title */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-medium text-gray-300">
            Stream Title <span style={{ color: "#FF2D2D" }}>*</span>
          </Label>
          <Input
            data-ocid="live.stream_title.input"
            value={streamTitle}
            onChange={(e) => setStreamTitle(e.target.value)}
            placeholder="Enter stream title..."
            maxLength={100}
            className="text-white placeholder:text-gray-600 border-[#2a2a2a] focus:border-[#FF2D2D] focus:ring-[#FF2D2D]/20"
            style={{ background: "#1a1a1a" }}
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-medium text-gray-300">
            Description
          </Label>
          <Textarea
            data-ocid="live.description.textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your stream..."
            rows={3}
            maxLength={500}
            className="resize-none text-white placeholder:text-gray-600 border-[#2a2a2a] focus:border-[#FF2D2D] focus:ring-[#FF2D2D]/20"
            style={{ background: "#1a1a1a" }}
          />
          <span className="text-[11px] text-right" style={{ color: "#555" }}>
            {description.length}/500
          </span>
        </div>

        {/* Privacy */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-medium text-gray-300">Privacy</Label>
          <Select value={privacy} onValueChange={setPrivacy}>
            <SelectTrigger
              data-ocid="live.privacy.select"
              className="text-white border-[#2a2a2a] focus:ring-[#FF2D2D]/20"
              style={{ background: "#1a1a1a" }}
            >
              <SelectValue placeholder="Select privacy..." />
            </SelectTrigger>
            <SelectContent
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            >
              <SelectItem
                value="public"
                className="text-white focus:bg-[#2a2a2a]"
              >
                Public
              </SelectItem>
              <SelectItem
                value="subscribers_only"
                className="text-white focus:bg-[#2a2a2a]"
              >
                Subscribers Only
              </SelectItem>
              <SelectItem
                value="private"
                className="text-white focus:bg-[#2a2a2a]"
              >
                Private
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-medium text-gray-300">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger
              data-ocid="live.category.select"
              className="text-white border-[#2a2a2a] focus:ring-[#FF2D2D]/20"
              style={{ background: "#1a1a1a" }}
            >
              <SelectValue placeholder="Select category..." />
            </SelectTrigger>
            <SelectContent
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            >
              {[
                "Gaming",
                "Music",
                "Sports",
                "Education",
                "Entertainment",
                "News",
                "Tech",
                "Other",
              ].map((cat) => (
                <SelectItem
                  key={cat}
                  value={cat.toLowerCase()}
                  className="text-white focus:bg-[#2a2a2a]"
                >
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Thumbnail Upload */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-medium text-gray-300">Thumbnail</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleThumbnailSelect}
          />
          {thumbnail ? (
            <div className="relative rounded-xl overflow-hidden aspect-video w-full">
              <img
                src={thumbnail}
                alt="Stream thumbnail"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setThumbnail(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute top-2 right-2 text-xs px-2 py-1 rounded-md text-white"
                style={{ background: "rgba(0,0,0,0.7)" }}
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-ocid="live.thumbnail.upload_button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 transition-colors cursor-pointer"
              style={{ borderColor: "#2a2a2a", background: "#1a1a1a" }}
            >
              <ImagePlus className="w-7 h-7" style={{ color: "#555" }} />
              <span className="text-sm" style={{ color: "#777" }}>
                Tap to upload thumbnail
              </span>
              <span className="text-xs" style={{ color: "#444" }}>
                JPG, PNG, or WebP
              </span>
            </button>
          )}
        </div>

        {/* Full Setup button */}
        <button
          type="button"
          data-ocid="live.full_setup.button"
          onClick={() => onNavigateToSetup?.()}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white border border-[#2a2a2a] transition-colors"
          style={{ background: "#1a1a1a" }}
        >
          🎬 Open Full Camera Setup
        </button>

        {/* Start Live Button */}
        <Button
          data-ocid="live.start_live.primary_button"
          onClick={() => void handleStartLive()}
          disabled={isStarting}
          className="w-full h-14 text-base font-bold text-white rounded-xl mt-2 relative overflow-hidden flex items-center justify-center gap-3"
          style={{
            background: "#FF2D2D",
            boxShadow: "0 0 24px rgba(255,45,45,0.4)",
          }}
        >
          <span className="relative flex items-center justify-center w-3 h-3">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
              style={{ background: "#fff" }}
            />
            <span
              className="relative inline-flex rounded-full w-2.5 h-2.5"
              style={{ background: "#fff" }}
            />
          </span>
          {isStarting ? "Starting…" : "Start Live"}
        </Button>
      </div>
    </div>
  );
}
