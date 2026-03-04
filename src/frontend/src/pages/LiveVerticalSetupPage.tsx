import { Slider } from "@/components/ui/slider";
import {
  Aperture,
  ArrowLeft,
  BarChart2,
  Camera,
  FlipHorizontal,
  Gift,
  HelpCircle,
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  Music,
  Share2,
  Smile,
  Sparkles,
  Sun,
  Type,
  UserPlus,
  Wand2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

interface LiveVerticalSetupPageProps {
  streamId: bigint;
  onBack: () => void;
  onGoLive: () => void;
}

interface ActivePopup {
  type: "smooth" | "lighting" | "poll" | "goal" | null;
}

export default function LiveVerticalSetupPage({
  onBack,
  onGoLive,
}: LiveVerticalSetupPageProps) {
  const [micEnabled, setMicEnabled] = useState(true);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [backgroundBlur, setBackgroundBlur] = useState(false);
  const [smoothValue, setSmoothValue] = useState([50]);
  const [lightingValue, setLightingValue] = useState([60]);
  const [activePopup, setActivePopup] = useState<ActivePopup["type"]>(null);
  const [pollQuestion, setPollQuestion] = useState("");
  const [giftGoal, setGiftGoal] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  const togglePopup = (popup: ActivePopup["type"]) => {
    setActivePopup((prev) => (prev === popup ? null : popup));
  };

  const handleGoLive = async () => {
    setIsStarting(true);
    await new Promise((r) => setTimeout(r, 800));
    setIsStarting(false);
    onGoLive();
  };

  const leftControls = [
    { icon: FlipHorizontal, label: "Flip", action: () => {} },
    { icon: Sparkles, label: "Beauty", action: () => {} },
    { icon: Sun, label: "Smooth", action: () => togglePopup("smooth") },
    {
      icon: Aperture,
      label: "Blur",
      action: () => setBackgroundBlur((v) => !v),
      active: backgroundBlur,
    },
    { icon: Sun, label: "Light", action: () => togglePopup("lighting") },
  ];

  const rightControls = [
    { icon: Wand2, label: "Effects", action: () => {} },
    { icon: Smile, label: "Stickers", action: () => {} },
    { icon: Type, label: "Text", action: () => {} },
    { icon: BarChart2, label: "Poll", action: () => togglePopup("poll") },
    { icon: HelpCircle, label: "Q&A", action: () => {} },
    { icon: Gift, label: "Goal", action: () => togglePopup("goal") },
    { icon: Music, label: "Music", action: () => {} },
  ];

  return (
    <div
      className="relative flex flex-col h-full"
      style={{ background: "#000" }}
      data-ocid="live_vertical_setup.page"
    >
      {/* Camera Preview Background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(145deg, #0a0a0a 0%, #1a1a1a 30%, #0d0d0d 60%, #111 100%)",
          ...(backgroundBlur ? { filter: "blur(4px)" } : {}),
        }}
      />

      {/* Camera Icon Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center gap-3 opacity-30">
          <Camera className="w-16 h-16 text-white" strokeWidth={1} />
          <p className="text-white text-sm font-medium">Camera Preview</p>
        </div>
      </div>

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-5 pb-3">
        <button
          type="button"
          onClick={onBack}
          data-ocid="live_vertical_setup.back.button"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div
          className="px-4 py-1.5 rounded-full text-xs font-bold text-white"
          style={{ background: "rgba(0,0,0,0.6)", border: "1px solid #333" }}
        >
          Live Setup
        </div>
        <div className="w-10" />
      </div>

      {/* Left Controls */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
        {leftControls.map((ctrl) => (
          <button
            key={ctrl.label}
            type="button"
            onClick={ctrl.action}
            data-ocid={`live_setup.${ctrl.label.toLowerCase()}.button`}
            className="flex flex-col items-center gap-1"
          >
            <motion.div
              whileTap={{ scale: 0.85 }}
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{
                background: ctrl.active
                  ? "rgba(255,45,45,0.3)"
                  : "rgba(0,0,0,0.6)",
                border: `1px solid ${ctrl.active ? "#FF2D2D" : "rgba(255,255,255,0.15)"}`,
              }}
            >
              <ctrl.icon
                className="w-5 h-5"
                style={{ color: ctrl.active ? "#FF2D2D" : "white" }}
                strokeWidth={1.5}
              />
            </motion.div>
            <span className="text-[9px] text-white/70 font-medium">
              {ctrl.label}
            </span>
          </button>
        ))}
      </div>

      {/* Right Controls */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
        {rightControls.map((ctrl) => (
          <button
            key={ctrl.label}
            type="button"
            onClick={ctrl.action}
            data-ocid={`live_setup.right_${ctrl.label.toLowerCase()}.button`}
            className="flex flex-col items-center gap-1"
          >
            <motion.div
              whileTap={{ scale: 0.85 }}
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <ctrl.icon className="w-5 h-5 text-white" strokeWidth={1.5} />
            </motion.div>
            <span className="text-[9px] text-white/70 font-medium">
              {ctrl.label}
            </span>
          </button>
        ))}
      </div>

      {/* Popup panels */}
      <AnimatePresence>
        {activePopup === "smooth" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute left-20 top-1/3 z-30 p-4 rounded-2xl"
            style={{
              background: "rgba(0,0,0,0.85)",
              border: "1px solid #333",
              width: 180,
            }}
          >
            <p className="text-xs text-white font-semibold mb-3">Skin Smooth</p>
            <Slider
              value={smoothValue}
              onValueChange={setSmoothValue}
              max={100}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-gray-400 mt-2 text-right">
              {smoothValue[0]}%
            </p>
          </motion.div>
        )}
        {activePopup === "lighting" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute left-20 top-1/2 z-30 p-4 rounded-2xl"
            style={{
              background: "rgba(0,0,0,0.85)",
              border: "1px solid #333",
              width: 180,
            }}
          >
            <p className="text-xs text-white font-semibold mb-3">Lighting</p>
            <Slider
              value={lightingValue}
              onValueChange={setLightingValue}
              max={100}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-gray-400 mt-2 text-right">
              {lightingValue[0]}%
            </p>
          </motion.div>
        )}
        {activePopup === "poll" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute left-1/2 -translate-x-1/2 top-1/4 z-30 p-4 rounded-2xl w-64"
            style={{ background: "rgba(0,0,0,0.9)", border: "1px solid #333" }}
          >
            <p className="text-sm text-white font-semibold mb-3">Create Poll</p>
            <input
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="Ask your audience..."
              className="w-full bg-[#1a1a1a] text-white text-sm rounded-lg px-3 py-2 border border-[#2a2a2a] placeholder:text-gray-600 outline-none focus:border-[#FF2D2D] mb-2"
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => togglePopup(null)}
                className="flex-1 py-2 rounded-lg text-xs text-gray-400"
                style={{ background: "#1a1a1a" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => togglePopup(null)}
                className="flex-1 py-2 rounded-lg text-xs text-white font-bold"
                style={{ background: "#FF2D2D" }}
              >
                Add Poll
              </button>
            </div>
          </motion.div>
        )}
        {activePopup === "goal" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute left-1/2 -translate-x-1/2 top-1/3 z-30 p-4 rounded-2xl w-64"
            style={{ background: "rgba(0,0,0,0.9)", border: "1px solid #333" }}
          >
            <p className="text-sm text-white font-semibold mb-3">Gift Goal</p>
            <input
              type="number"
              value={giftGoal}
              onChange={(e) => setGiftGoal(e.target.value)}
              placeholder="Target coins (e.g. 1000)"
              className="w-full bg-[#1a1a1a] text-white text-sm rounded-lg px-3 py-2 border border-[#2a2a2a] placeholder:text-gray-600 outline-none focus:border-[#FF2D2D] mb-2"
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => togglePopup(null)}
                className="flex-1 py-2 rounded-lg text-xs text-gray-400"
                style={{ background: "#1a1a1a" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => togglePopup(null)}
                className="flex-1 py-2 rounded-lg text-xs text-white font-bold"
                style={{ background: "#FF2D2D" }}
              >
                Set Goal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      <div className="absolute bottom-28 left-0 right-0 z-20 flex items-center justify-center gap-8 px-8">
        {[
          {
            icon: micEnabled ? Mic : MicOff,
            label: micEnabled ? "Mic On" : "Mic Off",
            active: !micEnabled,
            action: () => setMicEnabled((v) => !v),
            ocid: "live_setup.mic.toggle",
          },
          {
            icon: chatEnabled ? MessageCircle : MessageCircle,
            label: chatEnabled ? "Chat On" : "Chat Off",
            active: !chatEnabled,
            action: () => setChatEnabled((v) => !v),
            ocid: "live_setup.chat.toggle",
          },
          {
            icon: Share2,
            label: "Preview",
            action: () => {},
            ocid: "live_setup.share.button",
          },
          {
            icon: UserPlus,
            label: "Moderator",
            action: () => {},
            ocid: "live_setup.moderator.button",
          },
        ].map((ctrl) => (
          <button
            key={ctrl.label}
            type="button"
            onClick={ctrl.action}
            data-ocid={ctrl.ocid}
            className="flex flex-col items-center gap-1.5"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: ctrl.active
                  ? "rgba(255,45,45,0.2)"
                  : "rgba(0,0,0,0.6)",
                border: `1px solid ${ctrl.active ? "#FF2D2D" : "rgba(255,255,255,0.2)"}`,
              }}
            >
              <ctrl.icon
                className="w-5 h-5"
                style={{ color: ctrl.active ? "#FF2D2D" : "white" }}
                strokeWidth={1.5}
              />
            </div>
            <span className="text-[9px] text-white/60">{ctrl.label}</span>
          </button>
        ))}
      </div>

      {/* GO LIVE NOW Button */}
      <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center px-8">
        <motion.button
          type="button"
          data-ocid="live_vertical_setup.go_live.primary_button"
          onClick={() => void handleGoLive()}
          disabled={isStarting}
          whileTap={{ scale: 0.96 }}
          className="w-full h-14 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-3"
          style={{
            background: "#FF2D2D",
            boxShadow: "0 0 30px rgba(255,45,45,0.5)",
          }}
        >
          {isStarting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span className="relative flex w-3 h-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full w-3 h-3 bg-white" />
              </span>
              GO LIVE NOW
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
