// 1x1 transparent PNG bytes used as a fallback
const TRANSPARENT_PNG_BYTES = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
  0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120,
  156, 98, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68,
  174, 66, 96, 130,
]);

/**
 * Generates a JPEG thumbnail from a video file by seeking to 10% of its
 * duration (or 1 second, whichever is earlier) and drawing to a 640x360 canvas.
 * Falls back to a 1x1 transparent PNG if generation times out or fails.
 */
export async function generateThumbnailFromVideo(
  file: File,
): Promise<Uint8Array> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.style.position = "fixed";
    video.style.top = "-9999px";
    video.style.left = "-9999px";
    video.style.width = "1px";
    video.style.height = "1px";
    document.body.appendChild(video);

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        document.body.removeChild(video);
      } catch {
        // already removed
      }
    };

    const fallback = () => {
      cleanup();
      resolve(new Uint8Array(TRANSPARENT_PNG_BYTES));
    };

    const timeoutId = setTimeout(fallback, 5000);

    video.onloadedmetadata = () => {
      const seekTo = Math.min(1, video.duration * 0.1);
      video.currentTime = Number.isFinite(seekTo) && seekTo >= 0 ? seekTo : 0;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          clearTimeout(timeoutId);
          fallback();
          return;
        }
        ctx.drawImage(video, 0, 0, 640, 360);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = dataUrl.split(",")[1];
        if (!base64) {
          clearTimeout(timeoutId);
          fallback();
          return;
        }
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        clearTimeout(timeoutId);
        cleanup();
        resolve(bytes);
      } catch {
        clearTimeout(timeoutId);
        fallback();
      }
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      fallback();
    };

    video.src = objectUrl;
  });
}
