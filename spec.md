# SUB PREMIUM

## Current State
Full-stack mobile-first video streaming platform with:
- VideoPlayerModal: full video player with comments (threaded, AI suggest), settings modal (quality/speed/subtitles/audio), like/dislike, share, 3-dot menu (edit/delete for own videos), PiP mode
- Comments stored in localStorage per video
- Like system uses videoEngagement utils (local + backend sync)
- Creator info shown in player modal with follow/unfollow
- Bottom nav with Home, Shorts, +, Live, History, Profile
- Backend has toggleVideoLike, recordVideoView, followCreator, unfollowCreator, isFollowing, listVideoPosts, getVideoPost, getUsernameByPrincipal

## Requested Changes (Diff)

### Add
- **CommentsOverlay**: A bottom-sheet style overlay that slides up from the bottom covering ~60% of screen. Top half remains showing the video player (still playing). Bottom half is the comments section. Has a back/close arrow at top-left to dismiss.
- **Video Header Info**: Above the video player (or in the overlay header) show creator profile picture (avatar), creator username, subscriber/follower count (e.g. "2.7M subscribers").
- **Like button behavior**: If user hasn't liked — thumb icon is outlined/empty. After tapping — thumb turns red, count increments by 1. Visual toggle state.
- **Comments section features**: Scrollable list of comments with profile picture, username, comment text, time posted, like button per comment. Add new comment input. Like individual comments. Reply to comments (nested).
- **VideoSettingsMenu**: When ⚙️ settings icon is tapped on player: opens an overlay settings menu with: Subtitles/Captions, Video Quality, Playback Speed, Save Video, Report Video, Exit. Save and Cancel buttons at bottom. Settings already exist in VideoPlayerModal — this adds the menu items "Save Video" and "Report Video" and ensures the two bottom buttons (Save/Cancel) are prominent.
- **Video player overlay controls**: Play/Pause, Progress bar, Like, Comment, Share, Settings icon — all as transparent overlay on video.

### Modify
- **CommentsOverlay trigger**: The comment button on the video actions row now opens the new CommentsOverlay instead of jumping to an inline section.
- **Like button UI**: Change from ThumbsUp/ThumbsDown pair to a single like button that turns red when active, with count displayed.
- **Settings modal**: Add "Save Video" and "Report Video" menu rows to the existing PlayerSettingsModal.
- **Creator info section**: Enhance the creator header inside VideoPlayerModal to display avatar, username, and subscriber count prominently.

### Remove
- Nothing removed; existing VideoPlayerModal is enhanced in-place.

## Implementation Plan
1. Add `CommentsOverlay` component inside `VideoPlayerModal.tsx` — a Sheet/bottom-drawer that shows comments panel while video continues playing above it.
2. Enhance `CreatorHeader` inside VideoPlayerModal to show avatar initials, username, subscriber count fetched from backend (useGetUsernameByPrincipal + follower count from engagement store).
3. Update like button to be a single toggle button: outlined thumb when not liked, red filled when liked, count beside it.
4. Add "Save Video" and "Report Video" rows to PlayerSettingsModal with toast feedback.
5. Add `data-ocid` markers to all new interactive surfaces.
6. Validate and fix any TS/lint errors.
