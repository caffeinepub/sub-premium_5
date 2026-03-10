import { useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_RETRIES = 3;
const SESSION_KEY_PREFIX = "uploadSession_";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadSession {
  fileId: string; // `${name}_${size}`
  totalChunks: number;
  completedChunks: number[];
  startedAt: number;
}

export interface UseChunkedUpload {
  uploadFile: (
    file: File,
    onProgress: (pct: number, chunkInfo: string) => void,
    onRetry?: (info: string) => void,
  ) => Promise<Uint8Array>;
  cancelUpload: () => void;
  getSession: (fileId: string) => UploadSession | null;
  clearSession: (fileId: string) => void;
}

// ─── Session helpers (exported standalone) ────────────────────────────────────

export function loadSession(fileId: string): UploadSession | null {
  try {
    const raw = localStorage.getItem(`${SESSION_KEY_PREFIX}${fileId}`);
    if (!raw) return null;
    return JSON.parse(raw) as UploadSession;
  } catch {
    return null;
  }
}

export function clearSession(fileId: string): void {
  localStorage.removeItem(`${SESSION_KEY_PREFIX}${fileId}`);
}

function saveSession(session: UploadSession): void {
  try {
    localStorage.setItem(
      `${SESSION_KEY_PREFIX}${session.fileId}`,
      JSON.stringify(session),
    );
  } catch {
    // localStorage quota exceeded — ignore
  }
}

// ─── Chunk reader (streams one chunk from file, no full-file load) ────────────

function readChunk(
  file: File,
  start: number,
  end: number,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const slice = file.slice(start, end);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (result instanceof ArrayBuffer) {
        resolve(new Uint8Array(result));
      } else {
        reject(new Error("Failed to read chunk"));
      }
    };
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.readAsArrayBuffer(slice);
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChunkedUpload(): UseChunkedUpload {
  const cancelRef = useRef(false);

  const uploadFile = async (
    file: File,
    onProgress: (pct: number, chunkInfo: string) => void,
    onRetry?: (info: string) => void,
  ): Promise<Uint8Array<ArrayBuffer>> => {
    cancelRef.current = false;

    const fileId = `${file.name}_${file.size}`;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // Load or create session
    let session: UploadSession = loadSession(fileId) ?? {
      fileId,
      totalChunks,
      completedChunks: [],
      startedAt: Date.now(),
    };

    // If total chunks changed (different file with same name/size - edge case),
    // reset session
    if (session.totalChunks !== totalChunks) {
      session = {
        fileId,
        totalChunks,
        completedChunks: [],
        startedAt: Date.now(),
      };
    }

    saveSession(session);

    // Collect all chunk bytes (read-phase: 0–60%)
    const allChunks: Uint8Array[] = new Array(totalChunks);
    let totalReadBytes = 0;

    for (let i = 0; i < totalChunks; i++) {
      if (cancelRef.current) {
        throw new DOMException("Upload cancelled", "AbortError");
      }

      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);

      // Always read the chunk from file (localStorage only stores completion state, not bytes)
      let chunkData: Uint8Array | null = null;
      let lastErr: Error | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        if (cancelRef.current) {
          throw new DOMException("Upload cancelled", "AbortError");
        }
        try {
          chunkData = await readChunk(file, start, end);
          break;
        } catch (err) {
          lastErr = err instanceof Error ? err : new Error("Chunk read error");
          if (attempt < MAX_RETRIES) {
            onRetry?.(
              `Retrying chunk ${i + 1}... (attempt ${attempt + 1}/${MAX_RETRIES})`,
            );
            await sleep(attempt * 1000);
          }
        }
      }

      if (!chunkData) {
        throw lastErr ?? new Error(`Failed to read chunk ${i + 1}`);
      }

      allChunks[i] = chunkData;
      totalReadBytes += chunkData.byteLength;

      // Mark chunk as completed in session
      if (!session.completedChunks.includes(i)) {
        session.completedChunks.push(i);
        saveSession(session);
      }

      // Read phase: 0–60%
      const readPct = Math.round((totalReadBytes / file.size) * 60);
      onProgress(readPct, `Chunk ${i + 1} / ${totalChunks}`);
    }

    if (cancelRef.current) {
      throw new DOMException("Upload cancelled", "AbortError");
    }

    // Merge all chunks into a single Uint8Array
    const merged = new Uint8Array(file.size) as Uint8Array<ArrayBuffer>;
    let offset = 0;
    for (const chunk of allChunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }

    // Report 60% — ExternalBlob.withUploadProgress will push 60–100
    onProgress(60, `Uploading ${totalChunks} chunks...`);

    return merged;
  };

  const cancelUpload = () => {
    cancelRef.current = true;
  };

  return {
    uploadFile,
    cancelUpload,
    getSession: loadSession,
    clearSession,
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getFileId(file: File): string {
  return `${file.name}_${file.size}`;
}
