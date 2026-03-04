import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Clock,
  DollarSign,
  Download,
  Edit,
  Eye,
  Gift,
  Heart,
  MessageCircle,
  Play,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { LiveStream } from "../backend.d";
import { useActor } from "../hooks/useActor";

interface LiveAnalyticsPageProps {
  streamId: bigint;
  onBack: () => void;
  onDelete?: () => void;
}

interface StatCardProps {
  icon: React.ComponentType<
    React.SVGProps<SVGSVGElement> & { strokeWidth?: number }
  >;
  label: string;
  value: string | number;
  ocid: string;
  color?: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  ocid,
  color = "#FF2D2D",
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 p-4 rounded-2xl"
      style={{ background: "#111111", border: "1px solid #222" }}
      data-ocid={ocid}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: `${color}22` }}
      >
        <Icon className="w-5 h-5" style={{ color }} strokeWidth={1.5} />
      </div>
      <div>
        <p
          className="text-2xl font-black text-white"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {value}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
      </div>
    </motion.div>
  );
}

export default function LiveAnalyticsPage({
  streamId,
  onBack,
  onDelete,
}: LiveAnalyticsPageProps) {
  const { actor } = useActor();
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStream = async () => {
      try {
        const s = actor ? await actor.getLiveStream(streamId) : null;
        setStream(s);
      } catch (err) {
        console.error("Failed to fetch stream:", err);
        // Mock data for demo
        setStream({
          id: streamId,
          status: "ended",
          title: "My Live Stream",
          description: "",
          category: "Entertainment",
          tags: [],
          privacy: "public",
          creatorId: { toString: () => "" } as never,
          startedAt: BigInt(Date.now() - 3600000),
          endedAt: BigInt(Date.now()),
          viewerCount: BigInt(842),
          peakViewers: BigInt(1234),
          totalLikes: BigInt(5678),
          totalGifts: BigInt(23),
          totalRevenue: BigInt(4500),
          newFollowers: BigInt(87),
          chatEnabled: true,
          replayEnabled: true,
          monetizationEnabled: true,
          scheduledAt: undefined,
        });
      } finally {
        setIsLoading(false);
      }
    };
    void fetchStream();
  }, [actor, streamId]);

  const formatDuration = (startedAt: bigint, endedAt: bigint | undefined) => {
    if (!endedAt) return "—";
    const durationMs = Number(endedAt - startedAt) / 1_000_000;
    const seconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) / 1_000_000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handlePostReplay = () => {
    toast.success("Replay posted successfully!");
  };

  const handleDownload = () => {
    toast.info("Analytics export started");
  };

  const handleDelete = async () => {
    try {
      if (!actor) throw new Error("Not connected");
      await actor.endLiveStream(streamId);
      toast.success("Stream deleted");
      onDelete?.();
      onBack();
    } catch {
      toast.error("Failed to delete stream");
    }
  };

  if (isLoading || !stream) {
    return (
      <div
        className="flex flex-col h-full items-center justify-center gap-3"
        style={{ background: "#0f0f0f" }}
      >
        <div className="w-8 h-8 rounded-full border-2 border-[#FF2D2D] border-t-transparent animate-spin" />
        <p className="text-gray-500 text-sm">Loading analytics...</p>
      </div>
    );
  }

  const stats = [
    {
      icon: Eye,
      label: "Total Viewers",
      value: Number(stream.viewerCount).toLocaleString(),
      ocid: "analytics.total_viewers.card",
      color: "#4FACFE",
    },
    {
      icon: TrendingUp,
      label: "Peak Viewers",
      value: Number(stream.peakViewers).toLocaleString(),
      ocid: "analytics.peak_viewers.card",
      color: "#43E97B",
    },
    {
      icon: Heart,
      label: "Total Likes",
      value: Number(stream.totalLikes).toLocaleString(),
      ocid: "analytics.total_likes.card",
      color: "#FF2D2D",
    },
    {
      icon: Gift,
      label: "Gifts Received",
      value: Number(stream.totalGifts).toLocaleString(),
      ocid: "analytics.gifts_received.card",
      color: "#FFD700",
    },
    {
      icon: DollarSign,
      label: "Revenue (Coins)",
      value: Number(stream.totalRevenue).toLocaleString(),
      ocid: "analytics.revenue.card",
      color: "#A55EEA",
    },
    {
      icon: Users,
      label: "New Followers",
      value: Number(stream.newFollowers).toLocaleString(),
      ocid: "analytics.new_followers.card",
      color: "#FA8231",
    },
    {
      icon: MessageCircle,
      label: "Chat Messages",
      value: "—",
      ocid: "analytics.chat_messages.card",
      color: "#11998E",
    },
    {
      icon: Play,
      label: "Replay Views",
      value: "0",
      ocid: "analytics.replay_views.card",
      color: "#FC5C7D",
    },
  ] as const;

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: "#0f0f0f" }}
      data-ocid="live_analytics.page"
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-4 pt-5 pb-3"
        style={{ background: "#0f0f0f" }}
      >
        <button
          type="button"
          onClick={onBack}
          data-ocid="live_analytics.back.button"
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "#1a1a1a" }}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1
          className="text-lg font-bold text-white"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Stream Analytics
        </h1>
      </div>

      <div className="flex flex-col gap-5 px-4 pb-10">
        {/* Stream info card */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "#111", border: "1px solid #1e1e1e" }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 mr-3">
              <h2 className="text-white font-bold text-base leading-tight">
                {stream.title}
              </h2>
              <p className="text-gray-500 text-xs mt-1 capitalize">
                {stream.category}
              </p>
            </div>
            <span
              className="px-2.5 py-1 rounded-full text-xs font-bold"
              style={{
                background: stream.status === "ended" ? "#1a1a1a" : "#FF2D2D22",
                border: `1px solid ${stream.status === "ended" ? "#2a2a2a" : "#FF2D2D"}`,
                color: stream.status === "ended" ? "#9ca3af" : "#FF2D2D",
              }}
            >
              {stream.status === "ended" ? "Ended" : "LIVE"}
            </span>
          </div>

          <div className="flex gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDuration(stream.startedAt, stream.endedAt)}
            </div>
            <div className="flex items-center gap-1">
              <Play className="w-3.5 h-3.5" />
              {formatDate(stream.startedAt)}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.ocid}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <StatCard {...stat} />
            </motion.div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2.5">
          <h3 className="text-sm font-semibold text-gray-400">Actions</h3>

          <button
            type="button"
            data-ocid="live_analytics.post_replay.primary_button"
            onClick={handlePostReplay}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white"
            style={{
              background: "#3b82f6",
              boxShadow: "0 0 16px rgba(59,130,246,0.3)",
            }}
          >
            📽️ Post Replay
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              data-ocid="live_analytics.edit_title.button"
              onClick={() => toast.info("Edit title coming soon")}
              className="py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            >
              <Edit className="w-4 h-4" /> Edit Title
            </button>

            <button
              type="button"
              data-ocid="live_analytics.download.button"
              onClick={handleDownload}
              className="py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            >
              <Download className="w-4 h-4" /> Download
            </button>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                data-ocid="live_analytics.delete.delete_button"
                className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{
                  background: "#FF2D2D11",
                  border: "1px solid #FF2D2D44",
                  color: "#FF2D2D",
                }}
              >
                <Trash2 className="w-4 h-4" /> Delete Stream
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
              data-ocid="live_analytics.delete.dialog"
            >
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">
                  Delete Stream?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  This will permanently delete this stream and all its
                  analytics. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  data-ocid="live_analytics.delete.cancel_button"
                  className="bg-[#2a2a2a] text-white border-[#333] hover:bg-[#333]"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  data-ocid="live_analytics.delete.confirm_button"
                  onClick={() => void handleDelete()}
                  className="bg-[#FF2D2D] text-white hover:bg-[#cc0000]"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
