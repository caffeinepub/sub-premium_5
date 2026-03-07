import { Camera, Radio } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface LiveStream {
  id: bigint;
  username: string;
  title: string;
  viewers: number;
  color: string;
}

const INITIAL_STREAMS: LiveStream[] = [
  {
    id: 1n,
    username: "alexgaming",
    title: "Late Night Gaming Session",
    viewers: 2847,
    color: "#FF2D2D",
  },
  {
    id: 2n,
    username: "musicvibes",
    title: "Chill Beats & Chat",
    viewers: 1234,
    color: "#7C3AED",
  },
  {
    id: 3n,
    username: "fitnessguru",
    title: "Morning Workout Live",
    viewers: 891,
    color: "#0EA5E9",
  },
  {
    id: 4n,
    username: "cookmasters",
    title: "Italian Pasta Night",
    viewers: 567,
    color: "#F97316",
  },
  {
    id: 5n,
    username: "techtalks",
    title: "AI & Future of Coding",
    viewers: 432,
    color: "#10B981",
  },
  {
    id: 6n,
    username: "dancefloor",
    title: "TikTok Dance Challenge",
    viewers: 318,
    color: "#EC4899",
  },
];

interface LiveDiscoveryPageProps {
  onJoinStream: (streamId: bigint) => void;
}

function PulsingDot({ color = "#FF2D2D" }: { color?: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ background: color }}
      />
      <span
        className="relative inline-flex rounded-full h-2.5 w-2.5"
        style={{ background: color }}
      />
    </span>
  );
}

function LiveStreamCard({
  stream,
  index,
  onJoin,
}: {
  stream: LiveStream;
  index: number;
  onJoin: () => void;
}) {
  const initials = stream.username.slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35, ease: "easeOut" }}
      data-ocid={`live_discovery.stream_card.${index + 1}`}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: "14px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 12,
          background: `linear-gradient(135deg, ${stream.color}55 0%, ${stream.color}22 100%)`,
          border: `1px solid ${stream.color}44`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at 40% 40%, ${stream.color}66, transparent 70%)`,
          }}
        />
        <span
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: stream.color,
            fontFamily: "'Sora', sans-serif",
            position: "relative",
            zIndex: 1,
          }}
        >
          {initials}
        </span>
        {/* Small LIVE tag on thumbnail */}
        <div
          style={{
            position: "absolute",
            bottom: 5,
            left: 5,
            padding: "2px 5px",
            borderRadius: 4,
            background: "#FF2D2D",
            display: "flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          <span
            style={{
              color: "white",
              fontSize: 8,
              fontWeight: 800,
              letterSpacing: "0.08em",
              fontFamily: "'Sora', sans-serif",
            }}
          >
            LIVE
          </span>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 5,
        }}
      >
        {/* Top row: LIVE badge + viewer count */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "2px 7px",
              borderRadius: 8,
              background: "rgba(255,45,45,0.18)",
              border: "1px solid rgba(255,45,45,0.3)",
            }}
          >
            <PulsingDot />
            <span
              style={{
                color: "#FF2D2D",
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.12em",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              LIVE
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 11 }}>👁</span>
            <span
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "'Sora', sans-serif",
              }}
            >
              {stream.viewers.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Username */}
        <p
          style={{
            color: "white",
            fontSize: 14,
            fontWeight: 800,
            fontFamily: "'Sora', sans-serif",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.2,
          }}
        >
          @{stream.username}
        </p>

        {/* Title */}
        <p
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 11,
            fontWeight: 500,
            fontFamily: "'Sora', sans-serif",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {stream.title}
        </p>

        {/* Join button */}
        <motion.button
          type="button"
          data-ocid={`live_discovery.join.button.${index + 1}`}
          onClick={(e) => {
            e.stopPropagation();
            onJoin();
          }}
          whileTap={{ scale: 0.95 }}
          style={{
            alignSelf: "flex-start",
            padding: "5px 14px",
            borderRadius: 20,
            background: "#FF2D2D",
            border: "none",
            color: "white",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.05em",
            cursor: "pointer",
            fontFamily: "'Sora', sans-serif",
            boxShadow: "0 2px 12px rgba(255,45,45,0.3)",
          }}
        >
          Join
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function LiveDiscoveryPage({
  onJoinStream,
}: LiveDiscoveryPageProps) {
  const [streams, setStreams] = useState<LiveStream[]>(
    [...INITIAL_STREAMS].sort((a, b) => b.viewers - a.viewers),
  );

  // Auto-refresh viewer counts every 10 seconds
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setStreams((prev) =>
        [...prev]
          .map((s) => ({
            ...s,
            viewers: s.viewers + Math.floor(Math.random() * 16),
          }))
          .sort((a, b) => b.viewers - a.viewers),
      );
    }, 10_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div
      data-ocid="live_discovery.page"
      style={{
        minHeight: "100%",
        background: "#0E0E0E",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "calc(env(safe-area-inset-top) + 20px) 20px 0",
          flexShrink: 0,
        }}
      >
        {/* Title row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 6,
          }}
        >
          <h1
            style={{
              color: "white",
              fontSize: 26,
              fontWeight: 900,
              fontFamily: "'Sora', sans-serif",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Live Now
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 10,
              background: "rgba(255,45,45,0.15)",
              border: "1px solid rgba(255,45,45,0.3)",
            }}
          >
            <PulsingDot />
            <span
              style={{
                color: "#FF2D2D",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.12em",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              {streams.length} LIVE
            </span>
          </div>
        </div>
        <p
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 13,
            fontFamily: "'Sora', sans-serif",
            margin: "0 0 20px",
          }}
        >
          Join a stream or go live yourself
        </p>
      </div>

      {/* Stream list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 16px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <AnimatePresence>
          {streams.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              data-ocid="live_discovery.empty_state"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "80px 24px",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "rgba(255,45,45,0.08)",
                  border: "1px solid rgba(255,45,45,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Camera
                  className="w-9 h-9"
                  style={{ color: "rgba(255,45,45,0.6)" }}
                  strokeWidth={1.5}
                />
              </div>
              <p
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 15,
                  fontWeight: 700,
                  textAlign: "center",
                  fontFamily: "'Sora', sans-serif",
                }}
              >
                No live streams right now
              </p>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                style={{
                  padding: "12px 28px",
                  borderRadius: 20,
                  background: "#FF2D2D",
                  border: "none",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "'Sora', sans-serif",
                  boxShadow: "0 4px 20px rgba(255,45,45,0.4)",
                }}
              >
                Go Live
              </motion.button>
            </motion.div>
          ) : (
            streams.map((stream, i) => (
              <LiveStreamCard
                key={stream.id.toString()}
                stream={stream}
                index={i}
                onJoin={() => onJoinStream(stream.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* "Go Live" sticky footer */}
      <div
        style={{
          padding: "12px 16px calc(env(safe-area-inset-bottom) + 12px)",
          background: "linear-gradient(to top, #0E0E0E 70%, transparent)",
          flexShrink: 0,
        }}
      >
        <motion.button
          type="button"
          data-ocid="live_discovery.go_live.primary_button"
          whileTap={{ scale: 0.97 }}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 16,
            background: "#FF2D2D",
            border: "none",
            color: "white",
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: "0.06em",
            cursor: "pointer",
            fontFamily: "'Sora', sans-serif",
            boxShadow: "0 0 30px rgba(255,45,45,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
          onClick={() => onJoinStream(BigInt(Date.now()))}
        >
          <Radio className="w-4 h-4" strokeWidth={2} />
          Go Live
        </motion.button>
      </div>
    </div>
  );
}
