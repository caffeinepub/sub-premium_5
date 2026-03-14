# SUB PREMIUM

## Current State

The upload system exists across four files:
- `useChunkedUpload.ts` — reads ALL file chunks into memory sequentially, returns a merged `Uint8Array`. This loads the entire video file into RAM, causing crashes on large files.
- `useDraftUpload.ts` — background upload context using `ExternalBlob.fromFile()` (already streams correctly), but lacks proper `uploadSessionId` tracking.
- `UploadManagerContext.tsx` — manages background draft uploads with in-memory state only (lost on page refresh).
- `UploadPage.tsx` — uses the broken `useChunkedUpload` hook, loads all bytes into memory, then passes them to `ExternalBlob.fromBytes()`. Session persistence exists but only tracks read progress, not actual upload progress.

Core problems:
1. `useChunkedUpload` loads entire file into memory (crash on large videos)
2. No true `uploadSessionId` per upload — session key is `fileName_fileSize` only
3. `uploadedChunks` / `totalChunks` track file-read phase, not actual blob upload progress
4. `UploadManagerContext` state is lost on page refresh

## Requested Changes (Diff)

### Add
- `useResilientUpload.ts` — new hook that:
  - Generates a UUID `uploadSessionId` per upload
  - Stores full session in localStorage: `{ uploadSessionId, fileName, fileSize, title, description, totalChunks, uploadedChunks, progressPct, stage, startedAt }`
  - Uses `ExternalBlob.fromFile(file).withUploadProgress()` for streaming (no memory load)
  - Maps upload progress (0–100%) to `uploadedChunks` count via `Math.floor(pct/100 * totalChunks)`
  - Persists `uploadedChunks` + `progressPct` to localStorage on every progress tick
  - On page reload: scans localStorage for any incomplete session with matching `fileName+fileSize`, offers resume
  - Auto-retry wrapping: if upload throws, retry up to 3 times with exponential backoff
  - Clears localStorage session on success or explicit cancel

- Persistent session banner in `UploadPage.tsx`: on mount, detect interrupted session, show `uploadSessionId`, `uploadedChunks/totalChunks`, and offer to Resume or Start Over

### Modify
- `UploadPage.tsx` — rewrite to use `useResilientUpload` instead of `useChunkedUpload`. Show `uploadedChunks / totalChunks` in the progress UI. Store/restore title+description from localStorage session so they survive page refresh.
- `useDraftUpload.ts` — wire to use the resilient session tracking so background draft uploads also persist session state
- `UploadManagerContext.tsx` — persist `drafts` array to localStorage on every change; restore on mount so in-progress uploads survive page refresh (UI state only; actual upload restarts)

### Remove
- `useChunkedUpload.ts` — the in-memory chunk-collection logic. The file will be rewritten to only expose session helpers (`loadSession`, `clearSession`, `getFileId`) used by legacy code, with the heavy upload logic moved to `useResilientUpload.ts`

## Implementation Plan

1. Create `src/frontend/src/hooks/useResilientUpload.ts`:
   - `CHUNK_SIZE = 5MB`, `MAX_RETRIES = 3`
   - `UploadSession` type: `{ uploadSessionId, fileName, fileSize, title, description, totalChunks, uploadedChunks, progressPct, stage, startedAt }`
   - `createSession(file, title, description)` → generates UUID, saves to localStorage
   - `loadAnySession()` → scans localStorage for sessions with `stage !== 'done'`
   - `updateSession(partial)` → merge + save
   - `clearSessionById(id)` → remove from localStorage
   - `useResilientUpload()` hook returns: `{ startUpload, cancelUpload, session, resumeSession }`
   - `startUpload(file, title, description, thumbnailFile, onCreate)`: streams via `ExternalBlob.fromFile(file).withUploadProgress(pct => { updateSession({ uploadedChunks: floor(pct/100*total), progressPct: pct }) })`, wraps in retry loop

2. Update `UploadPage.tsx`:
   - On mount: call `loadAnySession()`, if found and `fileName+fileSize` match selected file (or no file selected yet), show resume banner with `uploadSessionId`, `uploadedChunks/totalChunks`
   - Progress display: show `Chunk N / M` derived from session state
   - Title/description: pre-fill from restored session
   - Replace `useChunkedUpload` import with `useResilientUpload`

3. Update `UploadManagerContext.tsx`:
   - On `startDraftUpload`: generate and store `uploadSessionId` in localStorage with draft metadata
   - Restore drafts from localStorage on mount (show previously in-progress drafts as resumable)
   - On draft complete/error: update localStorage accordingly

4. Keep `useChunkedUpload.ts` as a thin re-export of session helpers only (backward compat with any other imports)
