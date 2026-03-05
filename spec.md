# SUB PREMIUM

## Current State

The app has two upload surfaces:
1. **CreateModal.tsx** — `UploadSlide` component inside the swipe modal. Has a basic `<input type="file" accept="video/*">` button. No duration/size validation, no upload stages, no page-leave prevention, no auto-navigate to video page on completion.
2. **UploadPage.tsx** — Standalone upload page at `/upload`. Uses `accept="*/*"` (no video restriction), requires both video and thumbnail to publish (no fallback), shows upload/publishing stages but only 2 states (Uploading / Publishing), no page-leave prevention, no auto-navigate on completion, no size/duration validation.

Neither surface:
- Validates file size or video duration
- Prevents the user from navigating away during upload
- Shows granular upload stages (Uploading → Processing → Encoding → Finalizing)
- Auto-navigates to the video detail page on success
- Allows retry after failure without a full reset

## Requested Changes (Diff)

### Add
- `accept="video/*"` with `capture` fallback to open the native device file picker on mobile (photos, files, camera, screen recordings, downloads — all surfaces the OS exposes for video)
- File size validation: reject files > 5 GB with a clear error message before upload begins
- Duration validation: after file selection, load video metadata and reject videos > 2 hours (7200 seconds) with a clear error message
- Upload stage progression in both upload surfaces: **Uploading → Processing → Encoding → Finalizing** with animated stage labels
- Page-leave prevention during active upload: `beforeunload` event listener + on-screen banner "Uploading video. Please stay on this page until upload completes."
- Auto-navigate to `/video/:id` after successful upload (using the returned post ID)
- Retry button after upload failure — resets only the upload state, not the whole form (title, description, file selection preserved)
- Updated file selector copy in CreateModal UploadSlide: "Select Video" with subtitle clarifying all device video sources are supported (gallery, files, camera)
- `formatFileSize` helper with GB support (5 GB limit display)

### Modify
- **CreateModal.tsx → UploadSlide**: 
  - Change video `<input>` to use `accept="video/*"` (triggers native OS picker with photo library, files, camera rolls on both iOS and Android)
  - Add file size + duration validation on video select
  - Expand `UploadStage` type to include `"processing" | "encoding" | "finalizing"`
  - Replace simple progress bar with animated stage indicator showing current stage name + bar
  - Add `beforeunload` listener when uploading, remove on cleanup
  - On success: show "Upload complete" message then navigate to `/video/:id`
  - On failure: show "Upload failed. Please try again." with a Retry button that preserves form state
  - Update empty-state button label to "Select from Gallery / Files" to signal device-wide access
  
- **UploadPage.tsx**:
  - Change video input `accept` from `"*/*"` to `"video/*"`
  - Add file size + duration validation on video select
  - Remove hard requirement for thumbnail (already optional in CreateModal — use fallback PNG if none)
  - Expand upload stages to 4: Uploading → Processing → Encoding → Finalizing
  - Add `beforeunload` page-leave prevention during upload
  - Add on-screen sticky banner during upload: "Uploading video. Please stay on this page until upload completes."
  - On success: navigate to `/video/:id` automatically after 1.5s
  - On failure: show retry button that preserves form data

### Remove
- Hard thumbnail requirement in `UploadPage.tsx` (already optional in CreateModal; use the 1×1 PNG fallback)
- The `"*/*"` accept attribute on both video inputs (replaced by `"video/*"`)

## Implementation Plan

1. **Both upload surfaces — video input accept + file validation**
   - Set `accept="video/*"` on all video `<input>` elements
   - After file selection, validate file size ≤ 5 GB; if exceeded, show toast error and clear selection
   - After file selection, load video duration via `HTMLVideoElement.duration`; if > 7200s, show toast error and clear selection

2. **UploadSlide in CreateModal.tsx — staged upload + navigation**
   - Expand `UploadStage` to `"idle" | "uploading" | "processing" | "encoding" | "finalizing" | "done" | "error"`
   - Replace simple `Uploading…` text with animated `<StageIndicator>` component showing stage name + progress bar
   - Add `useEffect` to attach/detach `beforeunload` listener based on active upload state
   - Show sticky warning banner when uploading
   - On success: set stage to `"done"`, show "Upload complete", then `navigate('/video/${postId}')` after 1.5s
   - On error: set stage to `"error"`, show "Upload failed. Please try again." + Retry button that calls `handlePublish` again without clearing form

3. **UploadPage.tsx — staged upload + navigation + optional thumbnail**
   - Remove thumbnail hard requirement from `canPublish`
   - Expand stage labels to 4-stage sequence
   - Add `beforeunload` listener
   - Add on-screen warning banner during upload
   - On success: `navigate('/video/${postId}')` after 1.5s
   - On failure: show retry button without clearing form state

4. **UX copy updates**
   - UploadSlide empty state: "Select from Gallery / Files" with subtitle "Camera, screen recordings, downloads"
   - UploadPage dropzone: "Tap to select video" with subtitle "Photos, files, camera recordings · Max 5 GB, 2 hrs"
