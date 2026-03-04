import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type React from "react";

interface MVPBadgeProps {
  lastBattleWon?: boolean;
  winStreak?: number;
  mvpCount?: number;
  size?: "sm" | "md";
  children?: React.ReactNode;
}

export function MVPBadge({
  lastBattleWon = false,
  winStreak = 0,
  mvpCount = 0,
  size = "md",
  children,
}: MVPBadgeProps) {
  const badgeSize =
    size === "sm" ? "w-4 h-4 text-[8px]" : "w-5 h-5 text-[10px]";

  return (
    <div className="relative inline-block">
      {children}

      {/* 🥇 Bottom-right: last battle won */}
      {lastBattleWon && (
        <div
          className={`absolute -bottom-1 -right-1 ${badgeSize} rounded-full flex items-center justify-center font-black z-10`}
          style={{
            background: "linear-gradient(135deg, #FFD700, #FF6B00)",
            border: "1.5px solid #0f0f0f",
            boxShadow: "0 0 6px rgba(255,215,0,0.5)",
          }}
          data-ocid="profile.mvp_badge.panel"
          aria-label="Battle Winner"
        >
          🥇
        </div>
      )}

      {/* 🔥 Top-right: win streak >= 5 */}
      {winStreak >= 5 && (
        <div
          className={`absolute -top-1 -right-1 ${badgeSize} rounded-full flex items-center justify-center font-black z-10`}
          style={{
            background: "#FF2D2D",
            border: "1.5px solid #0f0f0f",
            boxShadow: "0 0 6px rgba(255,45,45,0.5)",
          }}
          aria-label={`Hot Streak: ${winStreak} wins`}
        >
          🔥
        </div>
      )}

      {/* ⭐ Top-left: MVP count > 50 */}
      {mvpCount > 50 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`absolute -top-1 -left-1 ${badgeSize} rounded-full flex items-center justify-center font-black z-10`}
                style={{
                  background: "linear-gradient(135deg, #FFD700, #FFB300)",
                  border: "1.5px solid #0f0f0f",
                  boxShadow: "0 0 8px rgba(255,215,0,0.6)",
                }}
                aria-label="Elite Battler"
              >
                ⭐
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="text-xs font-semibold"
              style={{
                background: "#1a1a1a",
                border: "1px solid #333",
                color: "#FFD700",
              }}
            >
              Elite Battler
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
