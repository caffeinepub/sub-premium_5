# SUB PREMIUM

## Current State

The app has a full live streaming system with:
- `LiveWatchPage.tsx` — the main viewer page with chat, gifts, hearts, battle mode, co-host layout
- `LiveCountdownPage.tsx` — 3-2-1 countdown page that calls `onLive()` after countdown
- `LiveVerticalSetupPage.tsx` — camera setup before going live
- `LivePage.tsx` — the Go Live tab with stream setup form

### Current Problem
The `LiveWatchPage` video area renders a dark gradient placeholder when no co-hosts are present, but when the countdown ends and navigates to the watch page the video container can appear blank/black. There is no loading state for the stream connecting, no "reconnecting" error state, and no spinner shown while the stream initializes. The video container uses a dark background gradient that looks like a blank black screen.

The countdown page (`LiveCountdownPage`) calls `onLive()` which triggers the watch page to mount — but the watch page may show a blank dark area before stream loads, which the user sees as a blank screen.

## Requested Changes (Diff)

### Add
- Loading spinner overlay shown on top of the video container while stream is initializing (first 3–5 seconds after mounting)
- "Reconnecting..." retry state if stream fails, with automatic retry every 3 seconds
- A clear visual "stream connecting" state with spinner (never blank black)
- Stream error recovery: show reconnecting banner, retry auto every 3 seconds, never blank screen
- Proper `streamState` management: `connecting | live | reconnecting | error`

### Modify
- `LiveWatchPage.tsx`: Add `streamState` state machine (`connecting → live → reconnecting → error`). Render a spinner overlay on the video container during `connecting` state. After 3s timeout simulate stream connected (since real WebRTC is not wired). Never unmount video container during transitions.
- `LiveWatchPage.tsx`: Video/stream area must always render immediately — never hidden or replaced with black. The placeholder gradient background stays mounted; the spinner overlays on top.
- `LiveWatchPage.tsx`: Top section — add visible creator avatar (left side), creator username text, LIVE badge, viewer count. These already exist but need to stay visible at all times regardless of stream state.
- `LiveWatchPage.tsx`: Bottom section — chat overlay, gift button, like tap animation, share button, input field. These already exist and must stay visible immediately on mount.
- `LiveCountdownPage.tsx`: When countdown ends (step reaches 0), call `onLive()` immediately — do not add additional delays that could cause blank screen gap.
- Layout: full-screen vertical. If battle mode active, split-screen 50/50 (already handled by LiveCoHostLayout, keep it).

### Remove
- Any code that could cause the video container to unmount or be hidden during state transitions
- Blank screen gap between countdown end and watch page render

## Implementation Plan

1. Add `streamState` type and state to `LiveWatchPage`: `'connecting' | 'live' | 'reconnecting'`
2. On mount, set `streamState = 'connecting'`. After 3s (simulated connect), set to `'live'`
3. Add optional simulated failure: if stream fails, set to `'reconnecting'`, retry every 3s
4. Render the video container (gradient/dark background) at ALL times — never unmount it
5. When `streamState === 'connecting'`: show loading spinner centered over video container with "Connecting to stream..." text
6. When `streamState === 'reconnecting'`: show "Reconnecting..." banner over video container, keep background visible
7. When `streamState === 'live'`: hide spinner, show normal video area
8. Top bar (creator info, LIVE badge, viewer count, follow, close) renders immediately regardless of stream state
9. Bottom chat overlay renders immediately regardless of stream state
10. In `LiveCountdownPage`, ensure `onLive()` fires immediately when step hits 0 without extra delays causing blank screen
