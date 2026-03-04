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
import { Check, X } from "lucide-react";
import { useState } from "react";

interface LiveEffectsPanelProps {
  open: boolean;
  onClose: () => void;
}

const FACE_EFFECTS = ["🐱", "🌸", "⭐", "🔥", "👽"];
const VOICE_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "robot", label: "🤖 Robot" },
  { value: "echo", label: "🔊 Echo" },
  { value: "deep", label: "🎙️ Deep" },
];

export function LiveEffectsPanel({ open, onClose }: LiveEffectsPanelProps) {
  const [beautyFilter, setBeautyFilter] = useState(false);
  const [selectedFaceEffect, setSelectedFaceEffect] = useState<string | null>(
    null,
  );
  const [backgroundBlur, setBackgroundBlur] = useState(0);
  const [lightingAdj, setLightingAdj] = useState(50);
  const [voiceChanger, setVoiceChanger] = useState("normal");
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [screenShare, setScreenShare] = useState(false);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-0 p-0"
        style={{ background: "#0f0f0f", maxHeight: "85vh" }}
        data-ocid="effects.panel"
      >
        <SheetHeader className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-white text-base font-bold">
              🎨 Live Effects
            </SheetTitle>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "#1a1a1a" }}
              data-ocid="effects.close.button"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>
        </SheetHeader>

        <div
          className="px-5 pb-8 overflow-y-auto"
          style={{ maxHeight: "70vh" }}
        >
          {/* Visual Effects section */}
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
            Visual Effects
          </h3>

          {/* Beauty Filter */}
          <div
            className="flex items-center justify-between px-4 py-3.5 rounded-xl mb-3"
            style={{ background: "#111", border: "1px solid #1e1e1e" }}
          >
            <div>
              <Label className="text-white text-sm font-medium">
                Beauty Filter
              </Label>
              <p className="text-gray-600 text-[11px] mt-0.5">
                Smooth skin & bright eyes
              </p>
            </div>
            <Switch
              checked={beautyFilter}
              onCheckedChange={setBeautyFilter}
              className="data-[state=checked]:bg-[#FF2D2D]"
              data-ocid="effects.beauty.switch"
            />
          </div>

          {/* Face Effects */}
          <div
            className="px-4 py-3.5 rounded-xl mb-3"
            style={{ background: "#111", border: "1px solid #1e1e1e" }}
          >
            <div className="flex items-center justify-between mb-3">
              <Label className="text-white text-sm font-medium">
                Face Effects
              </Label>
              <Switch
                checked={selectedFaceEffect !== null}
                onCheckedChange={(v) => !v && setSelectedFaceEffect(null)}
                className="data-[state=checked]:bg-[#FF2D2D]"
                data-ocid="effects.face.switch"
              />
            </div>
            <div className="flex gap-3">
              {FACE_EFFECTS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() =>
                    setSelectedFaceEffect(
                      selectedFaceEffect === emoji ? null : emoji,
                    )
                  }
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all relative"
                  style={{
                    background:
                      selectedFaceEffect === emoji ? "#FF2D2D22" : "#1a1a1a",
                    border: `1.5px solid ${selectedFaceEffect === emoji ? "#FF2D2D" : "#2a2a2a"}`,
                  }}
                >
                  {emoji}
                  {selectedFaceEffect === emoji && (
                    <div
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: "#FF2D2D" }}
                    >
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Background Blur */}
          <div
            className="px-4 py-3.5 rounded-xl mb-3"
            style={{ background: "#111", border: "1px solid #1e1e1e" }}
          >
            <div className="flex items-center justify-between mb-3">
              <Label className="text-white text-sm font-medium">
                Background Blur
              </Label>
              <Switch
                checked={backgroundBlur > 0}
                onCheckedChange={(v) => setBackgroundBlur(v ? 50 : 0)}
                className="data-[state=checked]:bg-[#FF2D2D]"
                data-ocid="effects.blur.switch"
              />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={backgroundBlur}
              onChange={(e) =>
                setBackgroundBlur(Number.parseInt(e.target.value, 10))
              }
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #FF2D2D ${backgroundBlur}%, #2a2a2a ${backgroundBlur}%)`,
                outline: "none",
              }}
              data-ocid="effects.blur.input"
            />
            <p className="text-gray-600 text-[10px] mt-1 text-right">
              {backgroundBlur}%
            </p>
          </div>

          {/* Lighting Adjustment */}
          <div
            className="px-4 py-3.5 rounded-xl mb-5"
            style={{ background: "#111", border: "1px solid #1e1e1e" }}
          >
            <Label className="text-white text-sm font-medium mb-3 block">
              ☀️ Lighting Adjustment
            </Label>
            <input
              type="range"
              min="0"
              max="100"
              value={lightingAdj}
              onChange={(e) =>
                setLightingAdj(Number.parseInt(e.target.value, 10))
              }
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #FFD700 ${lightingAdj}%, #2a2a2a ${lightingAdj}%)`,
                outline: "none",
              }}
              data-ocid="effects.lighting.input"
            />
            <div className="flex justify-between mt-1">
              <span className="text-gray-600 text-[10px]">Dark</span>
              <span className="text-gray-600 text-[10px]">Bright</span>
            </div>
          </div>

          {/* Audio Effects section */}
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
            Audio Effects
          </h3>

          {/* Voice Changer */}
          <div
            className="px-4 py-3.5 rounded-xl mb-3"
            style={{ background: "#111", border: "1px solid #1e1e1e" }}
          >
            <Label className="text-white text-sm font-medium mb-3 block">
              Voice Changer
            </Label>
            <Select value={voiceChanger} onValueChange={setVoiceChanger}>
              <SelectTrigger
                className="text-white border-0 rounded-xl text-sm"
                style={{ background: "#1a1a1a" }}
                data-ocid="effects.voice.select"
              >
                <SelectValue placeholder="Select voice" />
              </SelectTrigger>
              <SelectContent
                style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
              >
                {VOICE_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-white focus:bg-[#2a2a2a]"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Noise Suppression */}
          <div
            className="flex items-center justify-between px-4 py-3.5 rounded-xl mb-3"
            style={{ background: "#111", border: "1px solid #1e1e1e" }}
          >
            <div>
              <Label className="text-white text-sm font-medium">
                Noise Suppression
              </Label>
              <p className="text-gray-600 text-[11px] mt-0.5">
                Remove background noise
              </p>
            </div>
            <Switch
              checked={noiseSuppression}
              onCheckedChange={setNoiseSuppression}
              className="data-[state=checked]:bg-[#FF2D2D]"
              data-ocid="effects.noise.switch"
            />
          </div>

          {/* Screen Share */}
          <div
            className="flex items-center justify-between px-4 py-3.5 rounded-xl mb-6"
            style={{ background: "#111", border: "1px solid #1e1e1e" }}
          >
            <div>
              <Label className="text-white text-sm font-medium">
                Screen Share
              </Label>
              <p className="text-gray-600 text-[11px] mt-0.5">
                Share your screen with viewers
              </p>
            </div>
            <Switch
              checked={screenShare}
              onCheckedChange={setScreenShare}
              className="data-[state=checked]:bg-[#FF2D2D]"
              data-ocid="effects.screen.switch"
            />
          </div>

          {/* Apply button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-2xl font-bold text-white text-sm"
            style={{
              background: "linear-gradient(135deg, #FF2D2D, #FF6B6B)",
              boxShadow: "0 0 20px rgba(255,45,45,0.3)",
            }}
            data-ocid="effects.apply.button"
          >
            Apply Effects
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
