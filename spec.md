# SUB PREMIUM

## Current State
The upload system lives entirely inside `CreateModal.tsx` (`UploadSlide`). It:
- Uses chunked upload (5MB chunks) via `useChunkedUpload`
- Saves resume state in localStorage
- Prevents page unload via `beforeunload` event
- Blocks the user in the modal until upload finishes
- Has 4-stage progress UI (Uploading → Processing → Encoding → Finalizing)
- Only creates the video post AFTER the full upload completes

## Requested Changes (Diff)

### Add
- **Global upload context** (`UploadManagerContext`) — a React context + provider mounted at the app root that holds all active draft uploads. Each upload entry tracks: `draftId`, `file`, `title`, `description`, `category`, `hashtags`, `audience`, `thumbnailFile`, `stage` (Uploading | Processing | Published), `progress`, `chunkInfo`.
- **`useDraftUpload` hook** — exposes `startDraftUpload(file, meta)` which immediately adds a draft entry to the global context and starts background chunked upload + blob upload in the background, then marks it Published when done.
- **Draft Video Cards on homepage** — `VideoCard` and the home feed show a special card variant for in-progress drafts with a progress bar (`██████░░ 60%`) and stage label. These cards are stored in the global context, not the backend, until Published.
- **Video states badge** on video cards: `Uploading` (red pulsing), `Processing` (yellow), `Published` (no badge).
- **Allow leaving upload page** — once `startDraftUpload` is called, the CreateModal can be closed. The upload continues in the background via the global context.
- **Auto-publish** — when processing completes, the video post appears on homepage automatically.
- **Background processing simulation** after upload: generate thumbnail → compress → create streaming qualities (UI states only, actual upload still goes to backend via `createVideoPost.mutateAsync`).

### Modify
- `UploadSlide` in `CreateModal.tsx` — replace the "lock user in modal" flow with "start draft and allow close". When user fills in title and taps Upload, call `startDraftUpload` and immediately allow closing the modal. Show a toast: "Upload started — you can browse the app while your video uploads."
- `HomePage.tsx` — render draft upload cards from `UploadManagerContext` at the top of the feed.
- `VideoCard.tsx` — add a `draftUpload` variant prop to show progress bar overlay and stage badge.
- `App.tsx` — wrap with `UploadManagerProvider`.

### Remove
- The `beforeunload` navigation block that prevents leaving the upload page.
- The "Please stay on this page" warning banner (replaced by "uploading in background" toast).

## Implementation Plan
1. Create `src/frontend/src/contexts/UploadManagerContext.tsx` with the global draft upload state and `startDraftUpload` function.
2. Wrap `App.tsx` with `UploadManagerProvider`.
3. Update `UploadSlide` in `CreateModal.tsx` to call `startDraftUpload` and close immediately.
4. Update `VideoCard.tsx` to accept and render a draft upload variant with progress bar.
5. Update `HomePage.tsx` to show active draft upload cards at the top of the feed.
6. Remove `beforeunload` blocker and "stay on page" banner.
