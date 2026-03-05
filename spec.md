# SUB PREMIUM

## Current State

The `VideoPost` model in `main.mo` has these fields: id, title, description, videoBlob, thumbnailBlob, uploader, timestamp. It does **not** track views or likes. Like/view counts are stored in localStorage only (client-side), meaning they are per-device and not shared across users.

## Requested Changes (Diff)

### Add

- `views: Nat` (default 0) field on `VideoPost`
- `likes: Nat` (default 0) field on `VideoPost`
- `videoViews` table: `Map<(Nat, Principal), Int>` — records last view timestamp per (videoId, userId), used to enforce 24h dedup
- `videoLikes` table: `Map<(Nat, Principal), Bool>` — records which users have liked which video
- Backend method `recordVideoView(videoId: Nat)` — increments views only if caller has not viewed this video in the last 24 hours
- Backend method `toggleVideoLike(videoId: Nat)` — adds or removes like atomically; returns new like count
- Backend method `getVideoLikeStatus(videoId: Nat)` — returns `{ likes: Nat; userLiked: Bool }` for the calling user
- Backend query `getVideoStats(videoId: Nat)` — returns `{ views: Nat; likes: Nat }` (public, no auth required)

### Modify

- `VideoPost` type: add `views: Nat` and `likes: Nat` fields
- `createVideoPost`: initialize `views = 0` and `likes = 0`
- `backend.d.ts`: add new fields to `VideoPost`, add new method signatures
- `VideoPlayerModal.tsx`: 
  - On open: call `recordVideoView` (24h dedup handled server-side)
  - Replace localStorage-based like with `toggleVideoLike` backend call
  - Replace localStorage-based like count / view count with real backend values
  - Poll `getVideoLikeStatus` every 10 seconds to sync like count across users

### Remove

- `getViews()` localStorage helper (replaced by backend views)
- `getVLikes()` / `getUserLiked()` localStorage like helpers (replaced by backend)
- Writing like state to localStorage on handleLike

## Implementation Plan

1. Update `VideoPost` type in `main.mo` to add `views` and `likes` fields
2. Add `videoViews` map (`Map<Nat, Map<Principal, Int>>`) and `videoLikes` map (`Map<Nat, Set<Principal>>`)
3. Add `recordVideoView`, `toggleVideoLike`, `getVideoLikeStatus`, `getVideoStats` functions to `main.mo`
4. Update `createVideoPost` to initialize `views = 0` and `likes = 0`
5. Update `backend.d.ts` to reflect new `VideoPost` fields and new method signatures
6. Update `VideoPlayerModal.tsx`:
   - Load real views/likes from backend on open via `getVideoStats`
   - Call `recordVideoView` on open (server handles 24h dedup)
   - Wire Like button to `toggleVideoLike` backend call; update state from response
   - Poll `getVideoLikeStatus` every 10 seconds for real-time-like sync
   - Remove all localStorage reads/writes for views and likes
