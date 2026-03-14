import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import type { DraftStage } from "../contexts/UploadManagerContext";
import { useUploadManager } from "../contexts/UploadManagerContext";
import { generateThumbnailFromVideo } from "../utils/generateThumbnail";
import { clearSession, getFileId } from "./useChunkedUpload";
import { useCreateVideoPost } from "./useQueries";

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
  const createVideoPost = useCreateVideoPost();
  const queryClient = useQueryClient();

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
        // Stream video directly — no full-file read into memory
        const videoBlob = ExternalBlob.fromFile(file).withUploadProgress(
          (pct) => {
            onProgress(pct, `Uploading\u2026 ${pct}%`, "uploading");
          },
        );

        // Thumbnail: auto-generate or use provided file
        let thumbnailBlob: ExternalBlob;
        if (thumbnailFile) {
          const thumbBytes = await readFileAsBytes(thumbnailFile);
          thumbnailBlob = ExternalBlob.fromBytes(thumbBytes);
        } else {
          const thumbBytes = await generateThumbnailFromVideo(file);
          thumbnailBlob = ExternalBlob.fromBytes(
            thumbBytes as Uint8Array<ArrayBuffer>,
          );
        }

        await createVideoPost.mutateAsync({
          title: meta.title.trim(),
          description: meta.description,
          videoBlob,
          thumbnailBlob,
        });

        queryClient.invalidateQueries({ queryKey: ["videoPosts"] });
        clearSession(getFileId(file));
      },
    });

    toast.success(
      "Upload started \u2014 you can browse the app while your video uploads.",
    );
  };

  return { startUploadAndClose };
}
