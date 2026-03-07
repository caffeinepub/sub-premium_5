import {
  ArrowLeft,
  Camera,
  Layout,
  Radio,
  Sparkles,
  Wand2,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

interface ShortsCreatePageProps {
  onBack: () => void;
  onGoLive: (streamId: bigint) => void;
}

type Tab = "camera" | "templates" | "effects" | "live";

const EFFECT_CIRCLES = [
  { label: "Beauty", color: "#FF6B9D" },
  { label: "Vintage", color: "#F5A623" },
  { label: "Neon", color: "#7B2FFF" },
  { label: "Bokeh", color: "#00C6FF" },
  { label: "Warm", color: "#FF8C42" },
  { label: "Cool", color: "#4FACFE" },
  { label: "Dramatic", color: "#2C3E50" },
  { label: "Glitter", color: "#FFD700" },
];

const TEMPLATES = [
  {
    label: "Tutorial",
    bg: "linear-gradient(135deg, #1a1a2e, #16213e)",
    emoji: "🎓",
  },
  {
    label: "Vlog",
    bg: "linear-gradient(135deg, #2d1b69, #1a0533)",
    emoji: "🎬",
  },
  {
    label: "Music",
    bg: "linear-gradient(135deg, #0f3460, #533483)",
    emoji: "🎵",
  },
  {
    label: "Comedy",
    bg: "linear-gradient(135deg, #2c1810, #4a1930)",
    emoji: "😂",
  },
];

export default function ShortsCreatePage({
  onBack,
  onGoLive,
}: ShortsCreatePageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("camera");

  const tabs: {
    id: Tab;
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  }[] = [
    { id: "camera", label: "Camera", icon: Camera },
    { id: "templates", label: "Templates", icon: Layout },
    { id: "effects", label: "Effects", icon: Sparkles },
    { id: "live", label: "LIVE", icon: Radio },
  ];

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "#0f0f0f" }}
      data-ocid="shorts_create.page"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button
          type="button"
          onClick={onBack}
          data-ocid="shorts_create.back.button"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "#1a1a1a" }}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-base font-bold text-white">Create</h1>
        <div className="w-10" />
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-ocid={`shorts_create.${tab.id}.tab`}
            onClick={() => handleTabChange(tab.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-bold transition-all duration-200"
            style={{
              background:
                tab.id === "live"
                  ? activeTab === "live"
                    ? "#FF2D2D"
                    : "#2d0000"
                  : activeTab === tab.id
                    ? "#1e1e1e"
                    : "transparent",
              border: `1px solid ${
                tab.id === "live"
                  ? "#FF2D2D"
                  : activeTab === tab.id
                    ? "#333"
                    : "transparent"
              }`,
              color:
                tab.id === "live"
                  ? "#fff"
                  : activeTab === tab.id
                    ? "#fff"
                    : "#6b7280",
            }}
          >
            {tab.id === "live" && (
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full w-2 h-2 bg-white" />
              </span>
            )}
            <tab.icon style={{ width: 12, height: 12 }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {activeTab === "camera" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4"
          >
            {/* Camera Preview */}
            <div
              className="w-full rounded-3xl flex flex-col items-center justify-center gap-3"
              style={{
                aspectRatio: "9/16",
                maxHeight: "55vh",
                background:
                  "linear-gradient(145deg, #1a1a1a 0%, #111 50%, #1a1a1a 100%)",
                border: "1px solid #222",
              }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "#1e1e1e" }}
              >
                <Camera className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-gray-500 text-sm font-medium">
                Camera Preview
              </p>
              <p className="text-gray-700 text-xs">Camera access required</p>
            </div>

            {/* Capture button */}
            <button
              type="button"
              data-ocid="shorts_create.capture.button"
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                border: "4px solid #FF2D2D",
                background: "transparent",
                boxShadow: "0 0 20px rgba(255,45,45,0.3)",
              }}
            >
              <div
                className="w-14 h-14 rounded-full"
                style={{ background: "#FF2D2D" }}
              />
            </button>
          </motion.div>
        )}

        {activeTab === "templates" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="text-sm font-semibold text-gray-400 mb-3">
              Choose a Template
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  data-ocid={`shorts_create.template_${tpl.label.toLowerCase()}.button`}
                  className="rounded-2xl flex flex-col items-center justify-center gap-2 transition-transform active:scale-95"
                  style={{
                    aspectRatio: "9/16",
                    maxHeight: "200px",
                    background: tpl.bg,
                    border: "1px solid #222",
                  }}
                >
                  <span className="text-3xl">{tpl.emoji}</span>
                  <span className="text-xs font-bold text-white">
                    {tpl.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "effects" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="text-sm font-semibold text-gray-400 mb-4">
              Effects & Filters
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-3 no-scrollbar">
              {EFFECT_CIRCLES.map((effect) => (
                <button
                  key={effect.label}
                  type="button"
                  data-ocid={`shorts_create.effect_${effect.label.toLowerCase()}.button`}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-95 transition-transform"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{
                      background: `${effect.color}22`,
                      border: `2px solid ${effect.color}44`,
                    }}
                  >
                    <Wand2
                      className="w-6 h-6"
                      style={{ color: effect.color }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 font-medium">
                    {effect.label}
                  </span>
                </button>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-gray-400 mb-3 mt-6">
              AI Effects
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                "Background Replace",
                "Face Enhance",
                "Color Grade",
                "Sky Replace",
                "Glow Effect",
                "Cinematic",
              ].map((effect) => (
                <button
                  key={effect}
                  type="button"
                  className="py-3 px-2 rounded-xl text-xs font-medium text-center transition-colors"
                  style={{
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    color: "#ccc",
                  }}
                >
                  {effect}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "live" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center gap-4 py-12"
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "#FF2D2D22" }}
            >
              <Radio className="w-10 h-10" style={{ color: "#FF2D2D" }} />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-2">Go Live</h3>
              <p className="text-sm text-gray-500">
                Stream in real-time to your audience
              </p>
            </div>
            <button
              type="button"
              data-ocid="shorts_create.go_live.primary_button"
              onClick={() => onGoLive(BigInt(Date.now()))}
              className="flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-white text-sm"
              style={{
                background: "#FF2D2D",
                boxShadow: "0 0 24px rgba(255,45,45,0.5)",
              }}
            >
              <span className="relative flex w-2.5 h-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-white" />
              </span>
              Go Live
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
