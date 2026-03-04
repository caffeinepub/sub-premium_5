import { AnimatePresence, motion } from "motion/react";

interface ConfettiBurstProps {
  active: boolean;
}

const CONFETTI_COLORS = [
  "#FF2D2D",
  "#FF6B6B",
  "#FFD700",
  "#FF69B4",
  "#FF4500",
  "#FFF",
  "#FF8C00",
  "#FF1493",
  "#FFB347",
  "#FF6347",
];

const CONFETTI_COUNT = 24;

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

// Pre-generate stable confetti data so it doesn't re-randomize on re-render
const confettiData = Array.from({ length: CONFETTI_COUNT }, (_, i) => {
  const angle = (i / CONFETTI_COUNT) * 360 + randomBetween(-15, 15);
  const distance = randomBetween(80, 180);
  const rad = (angle * Math.PI) / 180;
  return {
    id: i,
    x: Math.cos(rad) * distance,
    y: Math.sin(rad) * distance,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: randomBetween(6, 12),
    rotate: randomBetween(0, 360),
    delay: randomBetween(0, 0.15),
  };
});

export function ConfettiBurst({ active }: ConfettiBurstProps) {
  return (
    <AnimatePresence>
      {active && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            zIndex: 50,
            pointerEvents: "none",
            width: 0,
            height: 0,
          }}
        >
          {confettiData.map((dot) => (
            <motion.span
              key={dot.id}
              initial={{
                opacity: 1,
                x: 0,
                y: 0,
                scale: 0,
                rotate: 0,
              }}
              animate={{
                opacity: 0,
                x: dot.x,
                y: dot.y,
                scale: 1,
                rotate: dot.rotate,
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{
                duration: 1.1,
                delay: dot.delay,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                position: "absolute",
                width: dot.size,
                height: dot.size,
                borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                background: dot.color,
                boxShadow: `0 0 6px ${dot.color}`,
                display: "block",
                transformOrigin: "center",
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
