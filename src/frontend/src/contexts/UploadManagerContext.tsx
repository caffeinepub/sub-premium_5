import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// --- Types ---

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
  uploadSessionId?: string;
}

export interface StartDraftParams {
  file: File;
  title: string;
  description: string;
  thumbnailFile: File | null;
  uploadSessionId?: string;
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

const DRAFTS_STORAGE_KEY = "uploadDrafts";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// --- Helpers ---

function generateUploadSessionId(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function loadDraftsFromStorage(): DraftUpload[] {
  try {
    const raw = localStorage.getItem(DRAFTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DraftUpload[];
    const now = Date.now();
    return parsed
      .filter(
        (d) => !(d.stage === "published" && now - d.createdAt > ONE_DAY_MS),
      )
      .map((d) => {
        // Interrupted uploads — mark as error with retry hint
        if (d.stage === "uploading" || d.stage === "processing") {
          return {
            ...d,
            stage: "error" as DraftStage,
            chunkInfo: "Upload interrupted \u2014 tap to retry",
          };
        }
        return d;
      });
  } catch {
    return [];
  }
}

// --- Context ---

const UploadManagerContext = createContext<UploadManagerContextValue | null>(
  null,
);

export function UploadManagerProvider({
  children,
}: { children: React.ReactNode }) {
  const [drafts, setDrafts] = useState<DraftUpload[]>(() =>
    loadDraftsFromStorage(),
  );
  const counterRef = useRef(0);

  // Persist drafts to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    } catch {
      // quota exceeded — ignore
    }
  }, [drafts]);

  const startDraftUpload = useCallback((params: StartDraftParams): string => {
    const id = `draft_${Date.now()}_${++counterRef.current}`;
    const uploadSessionId = params.uploadSessionId ?? generateUploadSessionId();

    const draft: DraftUpload = {
      id,
      fileName: params.file.name,
      title: params.title,
      description: params.description,
      stage: "uploading",
      progress: 0,
      chunkInfo: "",
      createdAt: Date.now(),
      uploadSessionId,
    };

    setDrafts((prev) => [draft, ...prev]);

    const runUpload = async () => {
      try {
        await params.uploadFn((progress, chunkInfo, stage) => {
          setDrafts((prev) =>
            prev.map((d) =>
              d.id === id ? { ...d, progress, chunkInfo, stage } : d,
            ),
          );
        });

        // Upload stored — enter processing stage
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === id
              ? {
                  ...d,
                  stage: "processing" as DraftStage,
                  progress: 100,
                  chunkInfo: "Processing video\u2026",
                }
              : d,
          ),
        );

        await sleep(3000);

        setDrafts((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, chunkInfo: "Finalizing\u2026" } : d,
          ),
        );

        await sleep(2000);

        setDrafts((prev) =>
          prev.map((d) =>
            d.id === id
              ? { ...d, stage: "published" as DraftStage, chunkInfo: "" }
              : d,
          ),
        );
      } catch (err) {
        console.error("Draft upload failed:", err);
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === id
              ? {
                  ...d,
                  stage: "error" as DraftStage,
                  chunkInfo: "Upload failed",
                }
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
