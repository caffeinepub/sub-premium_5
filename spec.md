# SUB PREMIUM

## Current State

The app has a bottom navigation with 6 tabs: Home, Shorts, Upload, Go Live (center red circle), History, Profile. Upload and Go Live are separate tab destinations. Tapping "Upload" navigates to UploadPage. Tapping the Go Live center button navigates to LivePage (setup). There is no unified Create modal.

## Requested Changes (Diff)

### Add
- `CreateModal` component: full-screen modal with 3-slide horizontal swipe navigation
  - Slide 0 (left): Upload — large upload icon, title, "Select From Gallery" button, drag & drop area, dark minimal layout, no camera, navigates to edit/upload screen on file select
  - Slide 1 (center/default): Shorts camera — fullscreen camera preview, large red record button, top-left X close, top-right Effects icon, right vertical tools (flip, timer, 15s/60s toggle), "Short (0–60s)" label above record button
  - Slide 2 (right): Go Live — live title input, privacy selector, schedule toggle, large "GO LIVE" button, 3-2-1 countdown overlay (camera stays mounted), transitions to LiveWatchPage after countdown
- Page indicator: 3 dots at top of modal showing active slide
- Smooth swipe/drag horizontal transition between slides (touch and mouse)

### Modify
- `BottomNav`: Replace the Go Live center red circle and Upload tab with a single "+" center button that opens the CreateModal. Remove `upload` and `live` from tab list. New left group: Home, Shorts. New right group: History, Profile. Center: "+" button (same elevated red circle style).
- `App.tsx`: Add `showCreateModal` state. Wire "+" button to open/close modal. Remove `upload` and `live` tab case rendering (those flows now only accessible from CreateModal). Keep existing LiveVerticalSetupPage, LiveWatchPage etc. sub-routes intact for when Go Live is triggered from CreateModal.
- `TabId` type: Remove `upload` and `live` from union. Keep `home | shorts | history | profile`.

### Remove
- Upload tab from BottomNav left group
- Live (Go Live) center button from BottomNav (replaced by "+" create button)
- No separate Upload/Live tab routes from BottomNav navigation

## Implementation Plan

1. Create `src/frontend/src/components/CreateModal.tsx`:
   - Full-screen overlay (fixed inset-0, z-50, bg-black)
   - 3-slide carousel using touch events (onTouchStart/Move/End) + mouse drag
   - Default slide index = 1 (Shorts)
   - Page dots indicator at top
   - Slide 0: Upload panel — reuses UploadPage logic inline (file picker, dropzone), on file select calls `onUploadSelected(file)` prop
   - Slide 1: Shorts camera panel — camera preview via getUserMedia, record button, flip/timer/duration tools, close/effects icons
   - Slide 2: Go Live panel — title input, privacy selector (Public/Followers/Private), schedule toggle, GO LIVE button triggers countdown overlay, on countdown finish calls `onGoLive(streamId)` prop
   - Close button (X) on Shorts slide closes modal

2. Modify `BottomNav.tsx`:
   - Remove `upload` and `live` from tab arrays
   - Change center button from Go Live (Radio icon) to Create "+" (Plus icon)
   - Center button calls `onCreatePress` prop instead of `onTabChange("live")`
   - Update `BottomNavProps` to add `onCreatePress: () => void`
   - Update `TabId` to remove `upload | live`

3. Modify `App.tsx`:
   - Add `showCreateModal` state (boolean)
   - Pass `onCreatePress={() => setShowCreateModal(true)}` to BottomNav
   - Render `<CreateModal>` when `showCreateModal` is true
   - Wire `onClose` to close modal
   - Wire `onUploadSelected` → close modal + navigate to upload sub-flow (open UploadPage with pre-selected file)
   - Wire `onGoLive(streamId)` → close modal + set activeTab="live" + setLiveSubRoute to vertical-setup
   - Remove `case "upload"` and `case "live"` from tab renderer (or keep upload as internal page reached only from modal)
   - Update `TabId` import

4. Update `isFullScreenRoute` logic in App.tsx to also hide nav when CreateModal is open
