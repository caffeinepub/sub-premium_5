import { motion } from "motion/react";
import type { BattleType } from "../hooks/useLiveBattle";

interface BattleMultiplierBadgeProps {
  battleType: BattleType;
  multiplier: 1 | 2 | 3;
}

export function BattleMultiplierBadge({
  battleType,
  multiplier,
}: BattleMultiplierBadgeProps) {
  if (battleType === "Extreme") {
    return (
      <motion.div
        animate={{
          boxShadow: [
            "0 0 8px rgba(255,45,45,0.4)",
            "0 0 18px rgba(255,100,0,0.7)",
            "0 0 8px rgba(255,45,45,0.4)",
          ],
        }}
        transition={{
          duration: 1.4,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black text-white"
        style={{
          background: "linear-gradient(135deg, #FF2D2D, #FF6B00)",
        }}
        data-ocid="battle.multiplier.badge"
      >
        🔥 EXTREME x{multiplier}
      </motion.div>
    );
  }

  if (battleType === "Power") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black text-white"
        style={{
          background: "linear-gradient(135deg, #7B2FFF, #4FACFE)",
        }}
        data-ocid="battle.multiplier.badge"
      >
        ⚡ POWER x{multiplier}
      </motion.div>
    );
  }

  // Normal
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black"
      style={{
        background: "#333",
        color: "#aaa",
      }}
      data-ocid="battle.multiplier.badge"
    >
      NORMAL x{multiplier}
    </motion.div>
  );
}
