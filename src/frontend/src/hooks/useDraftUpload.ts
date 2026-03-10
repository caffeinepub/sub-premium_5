import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import type { DraftStage } from "../contexts/UploadManagerContext";
import { useUploadManager } from "../contexts/UploadManagerContext";
import { clearSession, getFileId, useChunkedUpload } from "./useChunkedUpload";
import { useCreateVideoPost } from "./useQueries";

const FALLBACK_THUMBNAIL = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
  0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120,
  156, 98, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68,
  174, 66, 96, 130,
]);

function readFileAsBytes(file: File): Promise<Uint8Array<ArrayBuffer>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (result instanceof ArrayBuffer) {
        resolve(new Uint8Array(result) as Uint8Array<ArrayBuffer>);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.readAsArrayBuffer(file);
  });
}

export interface DraftMeta {
  title: string;
  description: string;
}

export function useDraftUpload() {
  const { startDraftUpload } = useUploadManager();
  const { uploadFile } = useChunkedUpload();
  const createVideoPost = useCreateVideoPost();

  /**
   * Starts a background upload and returns immediately.
   * Modal can be closed after calling this.
   */
  const startUploadAndClose = (
    file: File,
    meta: DraftMeta,
    thumbnailFile: File | null,
  ): void => {
    startDraftUpload({
      file,
      title: meta.title,
      description: meta.description,
      thumbnailFile,
      uploadFn: async (
        onProgress: (
          progress: number,
          chunkInfo: string,
          stage: DraftStage,
        ) => void,
      ) => {
        // Phase 1: chunked read (0–60%)
        const videoBytes = await uploadFile(
          file,
          (pct, info) => {
            const stage: DraftStage =
              pct < 30 ? "uploading" : pct < 50 ? "uploading" : "uploading";
            onProgress(pct, info, stage);
          },
          (info) => onProgress(0, info, "uploading"),
        );

        // Phase 2: ExternalBlob upload (60–100%)
        const videoBlob = ExternalBlob.fromBytes(
          videoBytes as Uint8Array<ArrayBuffer>,
        ).withUploadProgress((pct) => {
          const mapped = 60 + Math.round(pct * 0.4);
          onProgress(mapped, "", "uploading");
        });

        let thumbnailBlob: ExternalBlob;
        if (thumbnailFile) {
          const thumbBytes = await readFileAsBytes(thumbnailFile);
          thumbnailBlob = ExternalBlob.fromBytes(thumbBytes);
        } else {
          thumbnailBlob = ExternalBlob.fromBytes(
            FALLBACK_THUMBNAIL as Uint8Array<ArrayBuffer>,
          );
        }

        await createVideoPost.mutateAsync({
          title: meta.title.trim(),
          description: meta.description,
          videoBlob,
          thumbnailBlob,
        });

        clearSession(getFileId(file));
      },
    });

    toast.success(
      "Upload started — you can browse the app while your video uploads.",
    );
  };

  return { startUploadAndClose };
}
