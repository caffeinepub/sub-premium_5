import { useEffect, useRef, useState } from "react";
import { ExternalBlob } from "../backend";
import { generateThumbnailFromVideo } from "../utils/generateThumbnail";
import { useCreateVideoPost } from "./useQueries";

// ─── Constants ────────────────────────────────────────────────────────────────

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_RETRIES = 3;
const SESSION_KEY_PREFIX = "rUpload_";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResilientUploadSession {
  uploadSessionId: string;
  fileName: string;
  fileSize: number;
  title: string;
  description: string;
  totalChunks: number;
  uploadedChunks: number;
  progressPct: number;
  stage: "uploading" | "processing" | "done" | "error";
  startedAt: number;
}

// ─── Session Helpers ──────────────────────────────────────────────────────────

function createSession(
  file: File,
  title: string,
  description: string,
): ResilientUploadSession {
  const uploadSessionId = crypto.randomUUID();
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const session: ResilientUploadSession = {
    uploadSessionId,
    fileName: file.name,
    fileSize: file.size,
    title,
    description,
    totalChunks,
    uploadedChunks: 0,
    progressPct: 0,
    stage: "uploading",
    startedAt: Date.now(),
  };
  saveSession(session);
  return session;
}

function saveSession(session: ResilientUploadSession): void {
  try {
    localStorage.setItem(
      `${SESSION_KEY_PREFIX}${session.uploadSessionId}`,
      JSON.stringify(session),
    );
  } catch {
    // localStorage quota exceeded — ignore
  }
}

function updateSession(
  id: string,
  partial: Partial<ResilientUploadSession>,
): void {
  try {
    const raw = localStorage.getItem(`${SESSION_KEY_PREFIX}${id}`);
    if (!raw) return;
    const session = {
      ...(JSON.parse(raw) as ResilientUploadSession),
      ...partial,
    };
    saveSession(session);
  } catch {
    // ignore
  }
}

export function clearResilientSession(id: string): void {
  localStorage.removeItem(`${SESSION_KEY_PREFIX}${id}`);
}

function loadAnyIncompleteSession(): ResilientUploadSession | null {
  try {
    let latest: ResilientUploadSession | null = null;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(SESSION_KEY_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const s = JSON.parse(raw) as ResilientUploadSession;
      if (s.stage === "done") continue;
      if (!latest || s.startedAt > latest.startedAt) {
        latest = s;
      }
    }
    return latest;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseResilientUpload {
  session: ResilientUploadSession | null;
  startUpload: (
    file: File,
    title: string,
    description: string,
    thumbnailFile: File | null,
    onPostCreated?: (postId: string) => void,
  ) => Promise<void>;
  cancelUpload: () => void;
  resumeDetected: ResilientUploadSession | null;
  dismissResume: () => void;
}

export function useResilientUpload(): UseResilientUpload {
  const [session, setSession] = useState<ResilientUploadSession | null>(null);
  const [resumeDetected, setResumeDetected] =
    useState<ResilientUploadSession | null>(null);
  const cancelRef = useRef(false);
  const createPost = useCreateVideoPost();

  // Detect incomplete session on mount
  useEffect(() => {
    const incomplete = loadAnyIncompleteSession();
    if (incomplete) {
      setResumeDetected(incomplete);
    }
  }, []);

  const dismissResume = () => {
    setResumeDetected(null);
  };

  const cancelUpload = () => {
    cancelRef.current = true;
  };

  const startUpload = async (
    file: File,
    title: string,
    description: string,
    thumbnailFile: File | null,
    onPostCreated?: (postId: string) => void,
  ): Promise<void> => {
    cancelRef.current = false;

    // Reuse existing session if it matches the file, otherwise create new
    let sess: ResilientUploadSession;
    if (
      resumeDetected &&
      resumeDetected.fileName === file.name &&
      resumeDetected.fileSize === file.size &&
      resumeDetected.stage !== "done"
    ) {
      sess = { ...resumeDetected, stage: "uploading" };
      saveSession(sess);
    } else {
      sess = createSession(file, title, description);
    }

    setSession(sess);
    setResumeDetected(null);

    const totalChunks = sess.totalChunks;
    const sessionId = sess.uploadSessionId;

    const onProgress = (pct: number) => {
      const uploadedChunks = Math.floor((pct / 100) * totalChunks);
      const updated: Partial<ResilientUploadSession> = {
        uploadedChunks,
        progressPct: pct,
      };
      updateSession(sessionId, updated);
      setSession((prev) => (prev ? { ...prev, ...updated } : prev));
    };

    let lastErr: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      if (cancelRef.current) break;

      try {
        if (attempt > 1) {
          await sleep(attempt * 2000);
        }

        // Stream the video file without loading into memory
        const videoBlob =
          ExternalBlob.fromFile(file).withUploadProgress(onProgress);

        // Build thumbnail blob
        let thumbnailBlob: ExternalBlob;
        if (thumbnailFile) {
          thumbnailBlob = ExternalBlob.fromFile(thumbnailFile);
        } else {
          const thumbBytes = await generateThumbnailFromVideo(file);
          thumbnailBlob = ExternalBlob.fromBytes(
            thumbBytes as Uint8Array<ArrayBuffer>,
          );
        }

        if (cancelRef.current) break;

        const postId = await createPost.mutateAsync({
          title: title.trim(),
          description: description.trim(),
          videoBlob,
          thumbnailBlob,
        });

        // Success
        const doneUpdate: Partial<ResilientUploadSession> = {
          stage: "done",
          uploadedChunks: totalChunks,
          progressPct: 100,
        };
        updateSession(sessionId, doneUpdate);
        setSession((prev) => (prev ? { ...prev, ...doneUpdate } : prev));
        clearResilientSession(sessionId);

        if (postId && onPostCreated) {
          onPostCreated(String(postId));
        }

        lastErr = null;
        break;
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error("Upload failed");
        console.error(`Upload attempt ${attempt} failed:`, err);
      }
    }

    if (lastErr) {
      const errUpdate: Partial<ResilientUploadSession> = { stage: "error" };
      updateSession(sessionId, errUpdate);
      setSession((prev) => (prev ? { ...prev, ...errUpdate } : prev));
      throw lastErr;
    }
  };

  return { session, startUpload, cancelUpload, resumeDetected, dismissResume };
}
