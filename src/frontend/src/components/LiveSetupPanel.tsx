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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Loader2, Radio, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";

interface LiveSetupPanelProps {
  open: boolean;
  onClose: () => void;
  onGoLive: (streamId: bigint) => void;
}

export function LiveSetupPanel({
  open,
  onClose,
  onGoLive,
}: LiveSetupPanelProps) {
  const { actor } = useActor();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("entertainment");
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState<
    "public" | "subscribers_only" | "private"
  >("public");
  const [monetization, setMonetization] = useState(false);
  const [enableReplay, setEnableReplay] = useState(true);
  const [enableChat, setEnableChat] = useState(true);
  const [scheduled, setScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleTagsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = tagsInput.trim().replace(/,/g, "");
      if (newTag && !tags.includes(newTag) && tags.length < 10) {
        setTags((prev) => [...prev, newTag]);
        setTagsInput("");
      }
    }
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleGoLive = async () => {
    if (!title.trim()) {
      toast.error("Please enter a stream title");
      return;
    }

    setIsCreating(true);
    try {
      const scheduledAt =
        scheduled && scheduledDate
          ? BigInt(new Date(scheduledDate).getTime() * 1_000_000)
          : null;

      if (!actor) throw new Error("Not connected");
      const streamId = await actor.createLiveStream(
        title.trim(),
        description.trim(),
        category,
        tags,
        privacy,
        enableChat,
        enableReplay,
        monetization,
        scheduledAt,
      );

      onGoLive(streamId);
    } catch (err) {
      console.error("Failed to create stream:", err);
      // Fallback: use a mock streamId for demo
      const mockStreamId = BigInt(Date.now());
      toast.info("Using demo stream mode");
      onGoLive(mockStreamId);
    } finally {
      setIsCreating(false);
    }
  };

  const privacyOptions = [
    { value: "public", label: "Public" },
    { value: "subscribers_only", label: "Subscribers Only" },
    { value: "private", label: "Private" },
  ] as const;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl p-0 border-0"
        style={{
          background: "#0f0f0f",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <SheetHeader
          className="px-5 pt-5 pb-3 sticky top-0 z-10"
          style={{ background: "#0f0f0f" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "#FF2D2D22" }}
              >
                <Radio className="w-4 h-4" style={{ color: "#FF2D2D" }} />
              </div>
              <SheetTitle className="text-white text-lg font-bold">
                Set Up Your Live
              </SheetTitle>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "#1a1a1a" }}
              data-ocid="live_setup.close_button"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-5 pb-8">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-gray-300">
              Live Title <span style={{ color: "#FF2D2D" }}>*</span>
            </Label>
            <Input
              data-ocid="live_setup.title.input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your stream about?"
              maxLength={100}
              className="text-white placeholder:text-gray-600 border-[#2a2a2a] focus:border-[#FF2D2D]"
              style={{ background: "#1a1a1a" }}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-gray-300">
              Description
            </Label>
            <Textarea
              data-ocid="live_setup.description.textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your live stream..."
              rows={2}
              maxLength={300}
              className="resize-none text-white placeholder:text-gray-600 border-[#2a2a2a] focus:border-[#FF2D2D]"
              style={{ background: "#1a1a1a" }}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-gray-300">
              Category
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                data-ocid="live_setup.category.select"
                className="text-white border-[#2a2a2a]"
                style={{ background: "#1a1a1a" }}
              >
                <SelectValue />
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

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-gray-300">Tags</Label>
            <Input
              data-ocid="live_setup.tags.input"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onKeyDown={handleTagsKeyDown}
              placeholder="Add tags (press Enter)"
              className="text-white placeholder:text-gray-600 border-[#2a2a2a] focus:border-[#FF2D2D]"
              style={{ background: "#1a1a1a" }}
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                    style={{
                      background: "#FF2D2D22",
                      border: "1px solid #FF2D2D44",
                    }}
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 opacity-70 hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Privacy */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-gray-300">Privacy</Label>
            <div className="flex gap-2">
              {privacyOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  data-ocid={`live_setup.privacy_${opt.value}.toggle`}
                  onClick={() => setPrivacy(opt.value)}
                  className="flex-1 py-2 rounded-full text-xs font-semibold transition-all duration-200"
                  style={{
                    background: privacy === opt.value ? "#FF2D2D" : "#1a1a1a",
                    border: `1px solid ${privacy === opt.value ? "#FF2D2D" : "#2a2a2a"}`,
                    color: privacy === opt.value ? "#fff" : "#9ca3af",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div
            className="rounded-xl p-4 flex flex-col gap-4"
            style={{ background: "#111111", border: "1px solid #1e1e1e" }}
          >
            {[
              {
                label: "Monetization",
                desc: "Earn from gifts & donations",
                value: monetization,
                set: setMonetization,
                ocid: "live_setup.monetization.switch",
              },
              {
                label: "Enable Replay",
                desc: "Save stream for later viewing",
                value: enableReplay,
                set: setEnableReplay,
                ocid: "live_setup.replay.switch",
              },
              {
                label: "Enable Chat",
                desc: "Allow viewer messages",
                value: enableChat,
                set: setEnableChat,
                ocid: "live_setup.chat.switch",
              },
              {
                label: "Schedule",
                desc: "Set a future start time",
                value: scheduled,
                set: setScheduled,
                ocid: "live_setup.schedule.switch",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
                <Switch
                  data-ocid={item.ocid}
                  checked={item.value}
                  onCheckedChange={item.set}
                  className="data-[state=checked]:bg-[#FF2D2D]"
                />
              </div>
            ))}
          </div>

          {/* Schedule date/time */}
          {scheduled && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Scheduled Date & Time
              </Label>
              <Input
                data-ocid="live_setup.schedule_date.input"
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="text-white border-[#2a2a2a] focus:border-[#FF2D2D]"
                style={{ background: "#1a1a1a", colorScheme: "dark" }}
              />
            </div>
          )}

          {/* GO LIVE button */}
          <Button
            data-ocid="live_setup.go_live.primary_button"
            onClick={() => void handleGoLive()}
            disabled={isCreating}
            className="w-full h-14 text-base font-bold text-white rounded-2xl mt-2 flex items-center justify-center gap-3"
            style={{
              background: "#FF2D2D",
              boxShadow: "0 0 28px rgba(255,45,45,0.4)",
            }}
          >
            {isCreating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span className="relative flex w-3 h-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full w-3 h-3 bg-white" />
                </span>
                GO LIVE
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
