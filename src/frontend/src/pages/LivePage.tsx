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
import { ImagePlus, Radio } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export default function LivePage() {
  const [streamTitle, setStreamTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [category, setCategory] = useState("");
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    await new Promise((r) => setTimeout(r, 1500));
    setIsStarting(false);
    toast.info("Live streaming is coming soon! Your stream is ready to go.");
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

      {/* Info banner */}
      <div
        className="mx-4 mb-4 rounded-xl px-4 py-3 flex items-start gap-3"
        style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
      >
        <div className="mt-0.5 flex-shrink-0">
          <Radio className="w-4 h-4" style={{ color: "#FF2D2D" }} />
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
          Live streaming will be available soon. Set up your stream now and be
          ready to go live!
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
              <SelectItem
                value="gaming"
                className="text-white focus:bg-[#2a2a2a]"
              >
                Gaming
              </SelectItem>
              <SelectItem
                value="music"
                className="text-white focus:bg-[#2a2a2a]"
              >
                Music
              </SelectItem>
              <SelectItem
                value="sports"
                className="text-white focus:bg-[#2a2a2a]"
              >
                Sports
              </SelectItem>
              <SelectItem
                value="education"
                className="text-white focus:bg-[#2a2a2a]"
              >
                Education
              </SelectItem>
              <SelectItem
                value="entertainment"
                className="text-white focus:bg-[#2a2a2a]"
              >
                Entertainment
              </SelectItem>
              <SelectItem
                value="news"
                className="text-white focus:bg-[#2a2a2a]"
              >
                News
              </SelectItem>
              <SelectItem
                value="tech"
                className="text-white focus:bg-[#2a2a2a]"
              >
                Tech
              </SelectItem>
              <SelectItem
                value="other"
                className="text-white focus:bg-[#2a2a2a]"
              >
                Other
              </SelectItem>
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
                JPG, PNG, or WebP recommended
              </span>
            </button>
          )}
        </div>

        {/* Start Live Button */}
        <Button
          data-ocid="live.start_live.primary_button"
          onClick={handleStartLive}
          disabled={isStarting}
          className="w-full h-14 text-base font-bold text-white rounded-xl mt-2 relative overflow-hidden flex items-center justify-center gap-3"
          style={{
            background: "#FF2D2D",
            boxShadow: "0 0 24px rgba(255,45,45,0.4)",
          }}
        >
          {/* Pulsing red dot */}
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
