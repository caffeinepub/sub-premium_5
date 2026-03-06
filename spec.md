# SUB PREMIUM

## Current State

The homepage has:
- Animated "Welcome to SUB TV" → "SUB PREMIUM" header transition
- AISearchBar component with placeholder "Search or ask AI..." that supports video title/description search + AI assistant mode
- CategoryTabs for filtering by genre
- Sort button (Latest / Most Viewed)
- Video feed via `useListVideoPosts()` rendering `VideoCard` components
- VideoCard shows: thumbnail, title, @username, relative timestamp, views, likes, comments
- Notifications panel (bell icon) with hardcoded DEFAULT_NOTIFICATIONS
- VideoPlayerModal for playback
- NotificationsPanel with static mock data (upload, subscription, premium types)

The search currently only matches video title and description; does not match @usernames or hashtags. Search placeholder is "Search or ask AI..." rather than the branded text.

## Requested Changes (Diff)

### Add

1. **Search bar rebrand**: Change placeholder text to "Search creators, @users, videos". Expand search logic to match: creator @usernames, video titles, video descriptions, hashtags (words starting with #).
2. **Search results panel**: When query is active (non-AI mode), show categorized results: Creator accounts (matching @username), Videos, Shorts label badge, Live streams.
3. **Auto video distribution**: Videos uploaded appear immediately in homepage feed (already works via `useListVideoPosts` query invalidation — add query refetch trigger on upload completion if not already present).
4. **Notification system upgrade**: Add "New Video Uploaded" notification type. When a new video is detected (comparing video list length over time), push a notification: title "New Video Uploaded", message "@creatorname uploaded a new video on SUB PREMIUM". Tapping opens the video player.
5. **Homepage sections**: Below the main feed, add four horizontal content rows:
   - **Trending** — top videos by view count
   - **Live Now** — currently active live streams (if any; otherwise show empty placeholder)
   - **Recommended** — mixed recent videos
   - **Shorts** — videos tagged/labeled as shorts
   Each row is a horizontally scrollable card strip with compact cards (thumbnail + title + creator).
6. **Section card**: New `HomeSectionRow` component — horizontal scroll strip with compact `MiniVideoCard` items.

### Modify

- **AISearchBar**: Change placeholder to "Search creators, @users, videos". Extend `filterVideosBySearch` to also match on username and hashtags extracted from description/title.
- **HomePage**: Add homepage sections below the main feed list. Add notification generation logic that watches the video list and creates notifications for new uploads. Pass video click handler through to section rows to open VideoPlayerModal.
- **NotificationsPanel**: Add `videoId` optional field to Notification so tapping an upload notification can navigate to that video.

### Remove

- Nothing removed.

## Implementation Plan

1. Update `AISearchBar` placeholder text.
2. Extend search filter in `AISearchBar` and `HomePage` (`filterVideosBySearch`) to match: @username (requires fetching uploader username per video — use display name from post or cached usernames), hashtags (words prefixed with #), title, description.
3. Add `HomeSectionRow` component: horizontally scrollable row with title, "See all" link, and compact video cards.
4. Add `MiniHorizontalCard` sub-component: small card with thumbnail (fixed 140×80), title (1 line), creator (1 line), used in section rows.
5. Update `HomePage` to render four section rows below the main feed using the video data split by criteria (trending by views, recommended by recent, shorts by description keyword).
6. Update notification logic in `HomePage`: detect new videos compared to previous render cycle, auto-generate "New Video Uploaded" notifications with @creator and videoId.
7. Update `NotificationsPanel` type to include optional `videoId`. Add click handler that opens VideoPlayerModal for upload notifications.
8. Pass `setSelectedVideo` callback into notification tap handler in `HomePage`.
