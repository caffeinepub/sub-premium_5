import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface TapEvent {
  id: number;
  x: number;
  y: number;
}

interface HeartParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotate: number;
  driftX: number;
  driftY: number;
  delay: number;
  duration: number;
}

export interface HeartAnimationProps {
  taps: TapEvent[];
  comboMultiplier?: number;
}

const HEART_COLORS = [
  "#FF2D2D",
  "#FF6B6B",
  "#FF8E8E",
  "#FFB3B3",
  "#FF4757",
  "#ff6b81",
  "#FF69B4",
  "#FF1493",
];

let particleIdCounter = 0;

function createParticlesForTap(tap: TapEvent): HeartParticle[] {
  // 4–8 hearts per tap in a fan spread
  const count = 4 + Math.floor(Math.random() * 5);
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const spread = 30 + Math.random() * 40;
    return {
      id: particleIdCounter++,
      x: tap.x + Math.cos(angle) * spread * 0.4,
      y: tap.y + Math.sin(angle) * spread * 0.4,
      color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
      size: 24 + Math.floor(Math.random() * 25), // 24–48px
      rotate: (Math.random() - 0.5) * 60,
      driftX: (Math.random() - 0.5) * 80,
      driftY: -(100 + Math.random() * 140),
      delay: Math.random() * 0.12,
      duration: 1.2 + Math.random() * 0.6,
    };
  });
}

// SVG heart path
function HeartSvg({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      aria-hidden="true"
      style={{ filter: `drop-shadow(0 2px 6px ${color}88)` }}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function HeartAnimation({
  taps,
  comboMultiplier = 1,
}: HeartAnimationProps) {
  const [particles, setParticles] = useState<HeartParticle[]>([]);
  const processedTapIds = useRef<Set<number>>(new Set());

  // Spawn particles when new taps arrive
  useEffect(() => {
    const newTaps = taps.filter((tap) => !processedTapIds.current.has(tap.id));
    if (newTaps.length === 0) return;

    const newParticles: HeartParticle[] = [];
    for (const tap of newTaps) {
      processedTapIds.current.add(tap.id);
      newParticles.push(...createParticlesForTap(tap));
    }

    setParticles((prev) => [...prev, ...newParticles]);

    // Remove after longest animation completes
    const maxDuration =
      Math.max(...newParticles.map((p) => (p.duration + p.delay) * 1000)) + 200;
    const timeout = setTimeout(() => {
      const ids = new Set(newParticles.map((p) => p.id));
      setParticles((prev) => prev.filter((p) => !ids.has(p.id)));
    }, maxDuration);

    return () => clearTimeout(timeout);
  }, [taps]);

  // Determine combo burst position (center of last few taps)
  const lastTap = taps[taps.length - 1];
  const showComboBurst = comboMultiplier > 2 && lastTap;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ pointerEvents: "none", zIndex: 30 }}
      aria-hidden="true"
    >
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{
              opacity: 1,
              scale: 0,
              x: particle.x - particle.size / 2,
              y: particle.y - particle.size / 2,
              rotate: particle.rotate,
            }}
            animate={{
              opacity: 0,
              scale: 1,
              x: particle.x - particle.size / 2 + particle.driftX,
              y: particle.y - particle.size / 2 + particle.driftY,
              rotate: particle.rotate + (Math.random() - 0.5) * 40,
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              ease: "easeOut",
            }}
            style={{ position: "absolute", pointerEvents: "none" }}
          >
            <HeartSvg size={particle.size} color={particle.color} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Combo burst: big glowing heart in center */}
      <AnimatePresence>
        {showComboBurst && lastTap && (
          <motion.div
            key={`combo-burst-${comboMultiplier}-${lastTap.id}`}
            initial={{ opacity: 0.9, scale: 0.5 }}
            animate={{ opacity: 0, scale: 2.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: lastTap.x - 32,
              top: lastTap.y - 32,
              pointerEvents: "none",
            }}
          >
            <svg
              width={64}
              height={64}
              viewBox="0 0 24 24"
              fill="#FF2D2D"
              aria-hidden="true"
              style={{
                filter:
                  "drop-shadow(0 0 16px #FF2D2D) drop-shadow(0 0 32px #FF6B6B)",
              }}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
