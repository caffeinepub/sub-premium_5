# SUB PREMIUM

## Current State
The video player is implemented as a Dialog modal (`VideoPlayerModal.tsx`) that opens over the Home feed. It has a basic HTML5 video element, subtitle overlay, player settings modal (quality/speed/subtitles/audio), save-to-playlist sheet, translated title panel, and a comment section with AI reply.

## Requested Changes (Diff)

### Add
- Full-screen video player page (`VideoPlayerPage.tsx`) that replaces the modal for a proper page-level experience
- Like / Dislike / Share / Save / Download action row below the video
- Like count visible, dislike hidden publicly (creator-only in dashboard)
- Creator section: avatar, name, subscriber count, Subscribe button
- Expandable video description with hashtags and timestamps
- Suggested / Up Next video list (same category / recent uploads)
- End screen overlay (last 20 seconds): Watch Next, Subscribe, Recommended
- Double-tap seek (10s forward/back) gesture on the video
- Skeleton loaders for comments and suggested videos
- Swipe-down gesture hint to close/minimize

### Modify
- `HomePage.tsx`: replace `VideoPlayerModal` with navigation to `VideoPlayerPage` (passed via `onVideoClick` callback in App)
- `App.tsx`: add `videoPlayerRoute` state and render `VideoPlayerPage` as a full-screen sub-route (hides bottom nav)
- Keep existing `VideoPlayerModal` (still used from other surfaces like search results) but wire Home feed to the new page

### Remove
- Nothing removed — `VideoPlayerModal` remains for non-home surfaces

## Implementation Plan
1. Create `VideoPlayerPage.tsx` with all 12 sections: player, title/meta, like/dislike/share row, creator section, description, comments (reuse existing CommentSection logic), suggested videos, end screen cards
2. Update `App.tsx` to add `videoPlayerRoute` state (`{ post: VideoPost } | null`) and render `VideoPlayerPage` as full-screen route
3. Update `HomePage.tsx` to call `onVideoClick(post)` instead of opening the modal, passing the post up to App
4. Validate and build
