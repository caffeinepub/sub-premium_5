import { useUploadManager } from "@/contexts/UploadManagerContext";
import type { DraftStage, DraftUpload } from "@/contexts/UploadManagerContext";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Film,
  Loader2,
  RefreshCw,
  UploadCloud,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

interface ResilientSession {
  uploadedChunks: number;
  totalChunks: number;
}

function readResilientSession(draft: DraftUpload): ResilientSession | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("rUpload_")) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const obj = JSON.parse(raw) as {
        uploadedChunks?: number;
        totalChunks?: number;
        fileName?: string;
        title?: string;
        uploadSessionId?: string;
      };
      const matchSession =
        draft.uploadSessionId && obj.uploadSessionId === draft.uploadSessionId;
      const matchName =
        obj.fileName === draft.fileName || obj.title === draft.title;
      if (matchSession || matchName) {
        if (
          typeof obj.uploadedChunks === "number" &&
          typeof obj.totalChunks === "number"
        ) {
          return {
            uploadedChunks: obj.uploadedChunks,
            totalChunks: obj.totalChunks,
          };
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

const STAGE_CONFIG: Record<
  DraftStage | "interrupted",
  { label: string; color: string; bg: string; icon: typeof Loader2 }
> = {
  uploading: {
    label: "Uploading",
    color: "text-blue-400",
    bg: "bg-blue-500/15",
    icon: Loader2,
  },
  processing: {
    label: "Processing",
    color: "text-yellow-400",
    bg: "bg-yellow-500/15",
    icon: Clock,
  },
  published: {
    label: "Published",
    color: "text-green-400",
    bg: "bg-green-500/15",
    icon: CheckCircle2,
  },
  error: {
    label: "Failed",
    color: "text-red-400",
    bg: "bg-red-500/15",
    icon: AlertCircle,
  },
  interrupted: {
    label: "Interrupted",
    color: "text-orange-400",
    bg: "bg-orange-500/15",
    icon: AlertCircle,
  },
};

function StageBadge({ stage }: { stage: DraftStage }) {
  const cfg = STAGE_CONFIG[stage] ?? STAGE_CONFIG.error;
  const Icon = cfg.icon;
  const isSpinning = stage === "uploading" || stage === "processing";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${cfg.bg} ${cfg.color}`}
    >
      <Icon className={`w-3 h-3 ${isSpinning ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}

function DraftCard({
  draft,
  index,
  onRemove,
  onRetry,
}: {
  draft: DraftUpload;
  index: number;
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
}) {
  const resilient = readResilientSession(draft);
  const isActive = draft.stage === "uploading" || draft.stage === "processing";
  const isFailed = draft.stage === "error";
  const isPublished = draft.stage === "published";
  const ocidIndex = index + 1;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      data-ocid={`uploads_tray.item.${ocidIndex}`}
      className="flex gap-3 p-3 rounded-2xl bg-[#111] border border-white/6 relative"
    >
      {/* Thumbnail */}
      <div className="w-[68px] h-[50px] rounded-xl bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
        <Film className="w-5 h-5 text-white/20" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-snug truncate">
          {draft.title || draft.fileName}
        </p>

        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <StageBadge stage={draft.stage} />
          {draft.chunkInfo && (
            <span className="text-[11px] text-white/40 truncate max-w-[140px]">
              {draft.chunkInfo}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {isActive && (
          <div className="mt-2">
            <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
                initial={{ width: 0 }}
                animate={{ width: `${draft.progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <p className="text-[10px] text-white/40 mt-1">
              {resilient
                ? `${resilient.uploadedChunks} / ${resilient.totalChunks} chunks`
                : `${Math.round(draft.progress)}%`}
            </p>
          </div>
        )}

        {/* Session ID */}
        {draft.uploadSessionId && (
          <p className="mt-1 text-[9px] text-white/20 font-mono">
            {draft.uploadSessionId.substring(0, 8)}
          </p>
        )}

        {/* Actions */}
        <div className="mt-2 flex gap-2">
          {isFailed && onRetry && (
            <button
              type="button"
              data-ocid={`uploads_tray.retry_button.${ocidIndex}`}
              onClick={() => onRetry(draft.id)}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/15 text-orange-400 text-xs font-bold hover:bg-orange-500/25 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}
          {!isPublished && (
            <button
              type="button"
              data-ocid={`uploads_tray.cancel_button.${ocidIndex}`}
              onClick={() => onRemove(draft.id)}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 text-white/50 text-xs font-semibold hover:bg-white/10 hover:text-white/80 transition-colors"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface UploadsTrayPageProps {
  onBack: () => void;
}

export default function UploadsTrayPage({ onBack }: UploadsTrayPageProps) {
  const { drafts, removeDraft } = useUploadManager();
  const [, forceUpdate] = useState(0);

  // Re-render every 2s to keep chunk info fresh from localStorage
  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 2000);
    return () => clearInterval(id);
  }, []);

  const publishedDrafts = drafts.filter((d) => d.stage === "published");

  function clearCompleted() {
    for (const d of publishedDrafts) removeDraft(d.id);
  }

  return (
    <div
      className="h-full flex flex-col bg-background overflow-hidden"
      data-ocid="uploads_tray.page"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white/6 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-white tracking-tight">
          Uploads
        </h1>
        {publishedDrafts.length > 0 && (
          <button
            type="button"
            data-ocid="uploads_tray.clear_button"
            onClick={clearCompleted}
            className="text-xs font-semibold text-white/40 hover:text-white/70 transition-colors px-2 py-1"
          >
            Clear completed
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {drafts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            data-ocid="uploads_tray.empty_state"
            className="flex flex-col items-center justify-center gap-4 pt-24"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <UploadCloud className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-sm text-white/40 font-medium">No uploads yet</p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {drafts.map((draft, i) => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  index={i}
                  onRemove={removeDraft}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
