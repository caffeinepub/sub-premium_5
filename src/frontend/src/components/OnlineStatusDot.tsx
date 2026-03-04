import { formatActiveStatus } from "../utils/activeStatus";

interface OnlineStatusDotProps {
  lastActiveAt?: number | null;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function OnlineStatusDot({
  lastActiveAt,
  size = "sm",
  showLabel = false,
}: OnlineStatusDotProps) {
  const { isOnline, label } = formatActiveStatus(lastActiveAt ?? null);

  const dotSize = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`
          ${dotSize}
          rounded-full
          ring-2 ring-background
          transition-colors duration-500
          ${isOnline ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.7)]" : "bg-gray-500"}
        `}
        aria-label={label}
        title={label}
      />
      {showLabel && (
        <span
          className={`text-xs font-medium ${isOnline ? "text-green-400" : "text-muted-foreground"}`}
        >
          {label}
        </span>
      )}
    </span>
  );
}
