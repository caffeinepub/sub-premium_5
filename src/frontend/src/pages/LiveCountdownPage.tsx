import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";

interface LiveCountdownPageProps {
  streamId: bigint;
  onCancel: () => void;
  onLive: () => void;
}

type CountdownStep = 3 | 2 | 1 | 0; // 0 = "GO LIVE!"

export default function LiveCountdownPage({
  streamId,
  onCancel,
  onLive,
}: LiveCountdownPageProps) {
  const { actor } = useActor();
  const [step, setStep] = useState<CountdownStep>(3);
  const [micLevel, setMicLevel] = useState(60);

  // Animate mic level
  useEffect(() => {
    const interval = setInterval(() => {
      setMicLevel(30 + Math.random() * 60);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  // Countdown
  useEffect(() => {
    if (step === 0) return;

    const timeout = setTimeout(() => {
      if (step > 1) {
        setStep((prev) => (prev - 1) as CountdownStep);
      } else {
        setStep(0);
        // Trigger go live after short delay
        setTimeout(async () => {
          try {
            if (actor) await actor.updateLiveStreamStatus(streamId, "live");
          } catch (err) {
            console.error("Failed to update stream status:", err);
          }
          toast.success("You're now LIVE!", { duration: 3000 });
          onLive();
        }, 600);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [step, streamId, onLive, actor]);

  const displayValue = step === 0 ? "GO LIVE!" : step.toString();
  const isGoLive = step === 0;

  return (
    <div
      className="flex flex-col h-full items-center justify-between"
      style={{ background: "#000" }}
      data-ocid="live_countdown.page"
    >
      {/* Top: Cancel + mini camera */}
      <div className="w-full flex items-start justify-between px-4 pt-5">
        <button
          type="button"
          onClick={onCancel}
          data-ocid="live_countdown.cancel.button"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Mini camera preview */}
        <div
          className="rounded-2xl flex items-center justify-center"
          style={{
            width: 120,
            height: 80,
            background: "linear-gradient(145deg, #1a1a1a, #111)",
            border: "1px solid #2a2a2a",
          }}
        >
          <p className="text-[10px] text-gray-600 font-medium">PREVIEW</p>
        </div>

        <div className="w-10" />
      </div>

      {/* Center: Countdown number */}
      <div className="flex flex-col items-center gap-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={displayValue}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex items-center justify-center"
          >
            <span
              className="font-black"
              style={{
                fontSize: isGoLive ? "3rem" : "8rem",
                color: isGoLive ? "#FF2D2D" : "#ffffff",
                textShadow: isGoLive
                  ? "0 0 40px rgba(255,45,45,0.8)"
                  : "0 0 30px rgba(255,255,255,0.3)",
                fontFamily: "'Sora', sans-serif",
                lineHeight: 1,
              }}
            >
              {displayValue}
            </span>
          </motion.div>
        </AnimatePresence>

        {!isGoLive && (
          <p className="text-gray-500 text-sm font-medium tracking-widest uppercase">
            Going Live In...
          </p>
        )}
      </div>

      {/* Bottom: Mic level + connection */}
      <div className="w-full px-8 pb-12 flex flex-col gap-6">
        {/* Mic level meter */}
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-500 font-medium">Microphone Level</p>
          <div
            className="w-full h-3 rounded-full overflow-hidden"
            style={{ background: "#1a1a1a" }}
          >
            <motion.div
              animate={{ width: `${micLevel}%` }}
              transition={{ duration: 0.1, ease: "linear" }}
              className="h-full rounded-full"
              style={{
                background:
                  micLevel > 80
                    ? "#FF2D2D"
                    : micLevel > 50
                      ? "#22c55e"
                      : "#3b82f6",
              }}
            />
          </div>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 flex-1 p-3 rounded-xl"
            style={{ background: "#111" }}
          >
            <span className="relative flex w-3 h-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full w-3 h-3 bg-green-500" />
            </span>
            <span className="text-sm text-white font-medium">Connected</span>
            <span className="ml-auto text-xs text-gray-500">HD 1080p</span>
          </div>

          {/* Step dots */}
          <div className="flex gap-1.5">
            {[3, 2, 1].map((n) => (
              <div
                key={n}
                className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                style={{
                  background: n > step || step === 0 ? "#FF2D2D" : "#2a2a2a",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
