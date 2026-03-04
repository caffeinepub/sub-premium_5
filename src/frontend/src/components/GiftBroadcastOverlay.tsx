/**
 * GiftBroadcastOverlay — animated gift broadcast system
 * Handles Small / Medium / Large / Ultra tiers with priority queuing.
 */

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export interface PendingGift {
  id: string;
  username: string;
  giftName: string;
  giftEmoji: string;
  coinValue: number;
  tier: "small" | "medium" | "large" | "ultra";
}

interface GiftBroadcastOverlayProps {
  pendingGifts: PendingGift[];
  onGiftConsumed: (id: string) => void;
}

function getTier(coinValue: number): PendingGift["tier"] {
  if (coinValue <= 100) return "small";
  if (coinValue <= 1000) return "medium";
  if (coinValue <= 20000) return "large";
  return "ultra";
}

// Export for use by callers
export { getTier };

function ConfettiParticles({ count = 18 }: { count?: number }) {
  const colors = [
    "#FFD700",
    "#FF2D2D",
    "#00FF88",
    "#4FACFE",
    "#FF6B6B",
    "#FFFFFF",
  ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          // biome-ignore lint/suspicious/noArrayIndexKey: static animation particles
          key={i}
          initial={{
            x: `${10 + Math.random() * 80}%`,
            y: "-10%",
            rotate: 0,
            opacity: 1,
            scale: 1,
          }}
          animate={{
            y: "110%",
            rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
            opacity: 0,
            scale: 0.5 + Math.random() * 0.8,
          }}
          transition={{
            duration: 1.2 + Math.random() * 1.2,
            delay: Math.random() * 0.5,
            ease: "easeIn",
          }}
          className="absolute w-2.5 h-2.5 rounded-sm"
          style={{ background: colors[i % colors.length] }}
        />
      ))}
    </div>
  );
}

function FireworksParticles() {
  const origins = [
    { x: "20%", y: "30%" },
    { x: "80%", y: "20%" },
    { x: "50%", y: "60%" },
    { x: "15%", y: "70%" },
    { x: "85%", y: "65%" },
  ];
  const colors = ["#FFD700", "#FF4500", "#FF2D2D", "#FFA500", "#FFFF00"];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {origins.map((origin, oi) =>
        Array.from({ length: 8 }).map((_, pi) => {
          const angle = (pi / 8) * 360;
          const dist = 60 + Math.random() * 40;
          const dx = Math.cos((angle * Math.PI) / 180) * dist;
          const dy = Math.sin((angle * Math.PI) / 180) * dist;
          return (
            <motion.div
              // biome-ignore lint/suspicious/noArrayIndexKey: static fireworks animation particles
              key={`${oi}-${pi}`}
              initial={{
                left: origin.x,
                top: origin.y,
                opacity: 1,
                scale: 1,
                x: 0,
                y: 0,
              }}
              animate={{ x: dx, y: dy, opacity: 0, scale: 0 }}
              transition={{
                duration: 0.8,
                delay: oi * 0.25 + Math.random() * 0.2,
                ease: "easeOut",
              }}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: colors[oi % colors.length],
                transform: "translate(-50%,-50%)",
              }}
            />
          );
        }),
      )}
    </div>
  );
}

// ─── Tier-specific card components ───────────────────────────────────────────

function SmallGiftCard({ gift }: { gift: PendingGift }) {
  return (
    <motion.div
      key={gift.id}
      initial={{ x: -120, opacity: 0, scale: 0.8 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: -120, opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="absolute bottom-36 left-4 flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{
        background: "rgba(0,0,0,0.75)",
        border: "1px solid rgba(255,255,255,0.15)",
        backdropFilter: "blur(8px)",
        maxWidth: "70%",
      }}
      data-ocid="live_watch.gift_broadcast.panel"
    >
      <motion.span
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 1, repeat: 2 }}
        className="text-2xl"
      >
        {gift.giftEmoji}
      </motion.span>
      <div>
        <p className="text-white text-xs font-bold">@{gift.username}</p>
        <p className="text-white/60 text-xs">
          sent {gift.giftName} · 🪙{gift.coinValue}
        </p>
      </div>
    </motion.div>
  );
}

function MediumGiftCard({ gift }: { gift: PendingGift }) {
  return (
    <motion.div
      key={gift.id}
      initial={{ x: -160, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -160, opacity: 0 }}
      transition={{ type: "spring", stiffness: 250, damping: 22 }}
      className="absolute bottom-36 left-4 flex items-center gap-3 px-5 py-3.5 rounded-2xl"
      style={{
        background: "rgba(20,15,0,0.85)",
        border: "1.5px solid rgba(255,215,0,0.5)",
        boxShadow: "0 0 20px rgba(255,215,0,0.3)",
        backdropFilter: "blur(10px)",
        maxWidth: "80%",
      }}
      data-ocid="live_watch.gift_broadcast.panel"
    >
      <motion.span
        animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
        transition={{ duration: 0.8, repeat: 2 }}
        className="text-3xl"
      >
        {gift.giftEmoji}
      </motion.span>
      <div>
        <p className="text-yellow-300 text-sm font-black">@{gift.username}</p>
        <p className="text-white/80 text-xs font-semibold">
          sent {gift.giftName}
        </p>
        <p className="text-yellow-400 text-xs">
          🪙 {gift.coinValue.toLocaleString()} coins
        </p>
      </div>
    </motion.div>
  );
}

function LargeGiftCard({ gift }: { gift: PendingGift }) {
  return (
    <motion.div
      key={gift.id}
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      exit={{ scaleX: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="absolute inset-x-0 top-1/4 mx-4 flex items-center gap-4 px-6 py-5 rounded-3xl overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,45,45,0.95) 0%, rgba(180,0,0,0.95) 100%)",
        border: "2px solid rgba(255,100,100,0.6)",
        boxShadow: "0 0 40px rgba(255,45,45,0.6)",
      }}
      data-ocid="live_watch.gift_broadcast.panel"
    >
      <ConfettiParticles count={20} />
      <motion.span
        animate={{ scale: [1, 1.4, 0.9, 1.2, 1], rotate: [0, 15, -10, 5, 0] }}
        transition={{ duration: 1, repeat: 1 }}
        className="text-5xl shrink-0 z-10"
      >
        {gift.giftEmoji}
      </motion.span>
      <div className="z-10">
        <p className="text-white text-base font-black leading-tight">
          @{gift.username}
        </p>
        <p className="text-white/90 text-lg font-black">
          sent {gift.giftName}!
        </p>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-yellow-300 font-black text-base">
            🪙 {gift.coinValue.toLocaleString()}
          </span>
          <span className="text-white/60 text-xs">coins</span>
        </div>
      </div>
    </motion.div>
  );
}

function UltraGiftCard({ gift }: { gift: PendingGift }) {
  return (
    <motion.div
      key={gift.id}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: "spring", stiffness: 180, damping: 18 }}
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(255,200,0,0.25) 0%, rgba(0,0,0,0.9) 70%)",
        backdropFilter: "blur(4px)",
      }}
      data-ocid="live_watch.gift_broadcast.panel"
    >
      <FireworksParticles />

      {/* Crown badge */}
      <motion.div
        animate={{ rotate: [0, 5, -5, 0], y: [0, -5, 0] }}
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
        className="text-5xl mb-3"
      >
        👑
      </motion.div>

      {/* Cinematic text */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center px-6"
      >
        <motion.span
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          className="text-6xl block mb-4"
        >
          {gift.giftEmoji}
        </motion.span>
        <p
          className="text-xl font-black mb-1"
          style={{
            background: "linear-gradient(135deg, #FFD700, #FFA500, #FFD700)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          @{gift.username}
        </p>
        <p className="text-white text-2xl font-black">sent {gift.giftName}!</p>
        <div
          className="mt-3 px-6 py-2.5 rounded-2xl inline-flex items-center gap-2"
          style={{
            background: "linear-gradient(135deg, #FFD700, #FF8C00)",
            boxShadow: "0 0 30px rgba(255,215,0,0.6)",
          }}
        >
          <span className="text-black font-black text-lg">
            🪙 {gift.coinValue.toLocaleString()} COINS
          </span>
        </div>
      </motion.div>

      {/* Screen pulse overlay */}
      <motion.div
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="absolute inset-0 pointer-events-none"
        style={{ background: "rgba(255,215,0,0.15)" }}
      />
    </motion.div>
  );
}

// ─── Main Overlay ─────────────────────────────────────────────────────────────

export function GiftBroadcastOverlay({
  pendingGifts,
  onGiftConsumed,
}: GiftBroadcastOverlayProps) {
  const [currentGift, setCurrentGift] = useState<PendingGift | null>(null);
  const queueRef = useRef<PendingGift[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const durations: Record<PendingGift["tier"], number> = {
    small: 2500,
    medium: 4000,
    large: 5500,
    ultra: 7500,
  };

  const showNext = () => {
    if (queueRef.current.length === 0) {
      setCurrentGift(null);
      return;
    }
    const next = queueRef.current.shift()!;
    setCurrentGift(next);
    onGiftConsumed(next.id);
    timerRef.current = setTimeout(showNext, durations[next.tier]);
  };

  // Process incoming gifts
  // biome-ignore lint/correctness/useExhaustiveDependencies: showNext/currentGift intentionally omitted to avoid re-queue loops
  useEffect(() => {
    if (pendingGifts.length === 0) return;

    for (const gift of pendingGifts) {
      // Large/Ultra interrupt current and jump to front
      if (gift.tier === "large" || gift.tier === "ultra") {
        queueRef.current = [gift, ...queueRef.current];
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        showNext();
      } else {
        queueRef.current.push(gift);
        if (!currentGift && !timerRef.current) {
          showNext();
        }
      }
    }
  }, [pendingGifts]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      className="absolute inset-0 pointer-events-none z-30"
      aria-hidden="true"
    >
      <AnimatePresence mode="wait">
        {currentGift && (
          <div key={currentGift.id} className="pointer-events-none">
            {currentGift.tier === "small" && (
              <SmallGiftCard gift={currentGift} />
            )}
            {currentGift.tier === "medium" && (
              <MediumGiftCard gift={currentGift} />
            )}
            {currentGift.tier === "large" && (
              <LargeGiftCard gift={currentGift} />
            )}
            {currentGift.tier === "ultra" && (
              <UltraGiftCard gift={currentGift} />
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
