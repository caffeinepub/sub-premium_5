import { useUploadManager } from "@/contexts/UploadManagerContext";
import { UploadCloud } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface UploadProgressBubbleProps {
  onPress: () => void;
}

export function UploadProgressBubble({ onPress }: UploadProgressBubbleProps) {
  const { drafts } = useUploadManager();

  const active = drafts.filter(
    (d) => d.stage === "uploading" || d.stage === "processing",
  );

  const avgProgress =
    active.length > 0
      ? Math.round(
          active.reduce((sum, d) => sum + d.progress, 0) / active.length,
        )
      : 0;

  return (
    <AnimatePresence>
      {active.length > 0 && (
        <motion.button
          type="button"
          data-ocid="upload_bubble.button"
          key="upload-bubble"
          initial={{ opacity: 0, scale: 0.75, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.75, y: 12 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          onClick={onPress}
          className="fixed bottom-24 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold text-white shadow-lg"
          style={{
            background: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <UploadCloud className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span>{active.length}</span>
          <span className="text-white/50">·</span>
          <span className="text-blue-400">{avgProgress}%</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
