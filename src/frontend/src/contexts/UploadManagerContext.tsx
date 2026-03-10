import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DraftStage = "uploading" | "processing" | "published" | "error";

export interface DraftUpload {
  id: string;
  fileName: string;
  title: string;
  description: string;
  stage: DraftStage;
  progress: number;
  chunkInfo: string;
  createdAt: number;
}

export interface StartDraftParams {
  file: File;
  title: string;
  description: string;
  thumbnailFile: File | null;
  uploadFn: (
    onProgress: (
      progress: number,
      chunkInfo: string,
      stage: DraftStage,
    ) => void,
  ) => Promise<void>;
}

interface UploadManagerContextValue {
  drafts: DraftUpload[];
  startDraftUpload: (params: StartDraftParams) => string;
  removeDraft: (id: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const UploadManagerContext = createContext<UploadManagerContextValue | null>(
  null,
);

export function UploadManagerProvider({
  children,
}: { children: React.ReactNode }) {
  const [drafts, setDrafts] = useState<DraftUpload[]>([]);
  const counterRef = useRef(0);

  const startDraftUpload = useCallback((params: StartDraftParams): string => {
    const id = `draft_${Date.now()}_${++counterRef.current}`;

    const draft: DraftUpload = {
      id,
      fileName: params.file.name,
      title: params.title,
      description: params.description,
      stage: "uploading",
      progress: 0,
      chunkInfo: "",
      createdAt: Date.now(),
    };

    setDrafts((prev) => [draft, ...prev]);

    // Fire-and-forget: run upload in background
    const runUpload = async () => {
      try {
        await params.uploadFn((progress, chunkInfo, stage) => {
          setDrafts((prev) =>
            prev.map((d) =>
              d.id === id ? { ...d, progress, chunkInfo, stage } : d,
            ),
          );
        });

        // Upload complete — set processing
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === id
              ? {
                  ...d,
                  stage: "processing",
                  progress: 100,
                  chunkInfo: "Processing video…",
                }
              : d,
          ),
        );

        // Simulate processing delay then publish
        await sleep(3000);

        setDrafts((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, stage: "published", chunkInfo: "" } : d,
          ),
        );
      } catch (err) {
        console.error("Draft upload failed:", err);
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === id
              ? { ...d, stage: "error", chunkInfo: "Upload failed" }
              : d,
          ),
        );
      }
    };

    void runUpload();
    return id;
  }, []);

  const removeDraft = useCallback((id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return (
    <UploadManagerContext.Provider
      value={{ drafts, startDraftUpload, removeDraft }}
    >
      {children}
    </UploadManagerContext.Provider>
  );
}

export function useUploadManager(): UploadManagerContextValue {
  const ctx = useContext(UploadManagerContext);
  if (!ctx)
    throw new Error(
      "useUploadManager must be used within UploadManagerProvider",
    );
  return ctx;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
