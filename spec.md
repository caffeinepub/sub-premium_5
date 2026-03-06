# SUB PREMIUM

## Current State

The app has several live stream UI files:
- `LiveVerticalSetupPage.tsx` — full-screen camera setup with left/right controls, popup panels, and a 3-2-1 countdown overlay over the video. The camera `<video>` element is always mounted.
- `LiveCountdownPage.tsx` — standalone countdown page (currently unused in App.tsx routing, commented out).
- `LivePage.tsx` — a "Go Live" setup form (title, description, privacy, category, thumbnail) shown as the "setup" sub-route.
- `CreateModal.tsx` (Slide 2 — GoLiveSlide) — has its own countdown overlay over a dark background (no camera preview). Calls `onGoLive(streamId)` after countdown, which transitions App.tsx to `{ type: "watch", streamId, isCreator: true, cameFromSetup: true }`.
- `LiveWatchPage.tsx` — the main live stream screen for both creator and viewer, with full chat, gifts, hearts, engagement.

**The problem:** After the countdown in the GoLiveSlide (CreateModal), the screen goes dark. The GoLiveSlide countdown runs over a dark overlay (no camera), so there is a black screen flash when transitioning to LiveWatchPage. LiveVerticalSetupPage has correct camera-first + overlay countdown, but it is reached via a different route (`vertical-setup`) not used from the main CreateModal "Go Live" button.

## Requested Changes (Diff)

### Add
- New `NewLiveStreamScreen.tsx` page component that replaces `LiveVerticalSetupPage.tsx` as the live streaming broadcaster UI.
- The new screen must:
  1. Mount camera preview IMMEDIATELY on render (full-screen `<video>` element, always mounted, never removed)
  2. Show CountdownOverlay (5→4→3→2→1) rendered ON TOP of the video — never replacing it
  3. After countdown reaches 0, set `isLive = true` and call `onGoLive()` — do NOT restart camera or recreate the video element
  4. While `isLive = true`, show LiveTopBar (back button, LIVE indicator with pulsing dot, viewer count) and LiveControls at bottom (End Live, Mute mic, Flip camera, Chat toggle)
  5. If camera fails, show ErrorOverlay ("Camera access required" + "Enable Camera" button) — never show black screen
- `data-ocid` markers on all interactive elements

### Modify
- `LiveVerticalSetupPage.tsx` — DELETE the entire file and replace with a re-export of `NewLiveStreamScreen.tsx` OR just update App.tsx to use `NewLiveStreamScreen` directly.
- `App.tsx` — Update the `vertical-setup` case to use `NewLiveStreamScreen` instead of `LiveVerticalSetupPage`.
- `CreateModal.tsx` (GoLiveSlide) — Replace the dark-overlay countdown with a camera-first approach: immediately start camera when the GoLive slide is active and user taps GO LIVE, show countdown over the live camera feed (not a black overlay). After countdown, call `onGoLive(streamId)`.

### Remove
- `LiveCountdownPage.tsx` — Delete entirely (already unused).
- The dark background overlay in GoLiveSlide countdown (the `background: "rgba(0,0,0,0.88)"` overlay with no camera underneath).
- `LiveVerticalSetupPage.tsx` — Replace with new component.

## Implementation Plan

1. Create `src/frontend/src/pages/NewLiveStreamScreen.tsx`:
   - Props: `streamId: bigint`, `onBack: () => void`, `onGoLive: () => void`
   - State: `cameraReady`, `cameraError`, `isLive`, `countdownActive`, `countdownStep` (5→0), `micEnabled`, `chatVisible`, `facingMode`
   - Render structure (always in this order, never conditional replace):
     ```
     <div style="position:relative; width:100%; height:100%; background:#000">
       <video ref={videoRef} style="position:absolute; inset:0; width:100%; height:100%; objectFit:cover" autoPlay playsInline muted />
       {/* Camera loading: shown while !cameraReady && !cameraError */}
       {/* CountdownOverlay: position:absolute z-50, shown when countdownActive */}
       {/* LiveTopBar: position:absolute top-0, shown when isLive */}
       {/* LiveControls: position:absolute bottom-0, shown when isLive */}
       {/* ErrorOverlay: position:absolute z-100, shown when cameraError */}
       {/* Pre-live bottom GO LIVE button: shown when cameraReady && !isLive && !countdownActive */}
     </div>
     ```
   - `startCamera()`: requests `getUserMedia({ video: { facingMode, width:{ideal:1280}, height:{ideal:720} }, audio: true })`, assigns to `videoRef.current.srcObject`
   - On mount: call `startCamera()`, on unmount: stop all tracks
   - `handleGoLive()`: set `countdownActive=true`, `countdownStep=5`
   - Countdown tick: useEffect on `countdownStep` when `countdownActive`, setTimeout 1000ms, decrement; when step reaches 0 call `actor.updateLiveStreamStatus(streamId, "live")` then set `isLive=true`, `countdownActive=false`, call `onGoLive()`
   - Flip camera: stop tracks, toggle facingMode, call `startCamera()` again
   - CountdownOverlay: large animated number (framer-motion scale+fade), "Going Live..." text below
   - LiveTopBar: back arrow button, pulsing "● LIVE" red badge, "👁 {viewerCount}" display
   - LiveControls: row of circular buttons — "End Live" (red), mic toggle, flip camera, chat toggle
   - ErrorOverlay: Camera icon, "Camera access required" text, "Enable Camera" button (retries startCamera)

2. Update `App.tsx`:
   - Import `NewLiveStreamScreen` instead of `LiveVerticalSetupPage`
   - In `vertical-setup` case: render `<NewLiveStreamScreen streamId={...} onBack={...} onGoLive={...} />`

3. Update `CreateModal.tsx` (GoLiveSlide):
   - When slide 2 is active (`isActive` prop), start camera immediately (same pattern as ShortsSlide)
   - Replace the dark `rgba(0,0,0,0.88)` countdown overlay with a camera-preview-based layout: the camera `<video>` stays mounted, countdown number is absolute overlay
   - The GoLiveSlide should have its own `videoRef`, `streamRef`, `cameraReady`, `cameraError` state
   - On GO LIVE tap: trigger countdown (5→1) over the camera preview, then call `onGoLive(streamId)`

4. Delete `LiveCountdownPage.tsx` entirely.

5. Delete `LiveVerticalSetupPage.tsx` (replaced by `NewLiveStreamScreen.tsx`).

6. Add `data-ocid` markers:
   - `new_live.back.button`
   - `new_live.end_live.button`
   - `new_live.mic.toggle`
   - `new_live.flip_camera.button`
   - `new_live.chat.toggle`
   - `new_live.go_live.primary_button`
   - `new_live.enable_camera.button`
   - `new_live.countdown.panel`
