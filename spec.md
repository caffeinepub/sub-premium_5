# SUB PREMIUM

## Current State

Full-stack video streaming app with:
- Home feed with video cards (VideoCard.tsx), AI search, category tabs, notifications
- Bottom nav: Home, Shorts, Upload, Live, History, Profile (6 tabs)
- VideoCard displays uploader @username. Tapping a card opens VideoPlayerModal.
- UserProfileModal — slide-up bottom sheet used inside live stream pages (LiveWatchPage, TopEngagementChairs, ViewerListPanel, etc.) for viewing creator/viewer profiles with follow/unfollow, stats, battle history, gift history tabs
- ProfilePage — current user's own profile page with settings, playlists, saved videos, premium, wallet, edit profile
- No public creator profile page accessible from the Home feed

## Requested Changes (Diff)

### Add
- **PublicCreatorProfilePage** — a full-screen page that shows any creator's public profile; accessible by tapping the @username on a VideoCard in the Home feed
- **CreatorVideoGrid** — grid of videos uploaded by the creator, shown inside the public profile page
- Navigation wiring in App.tsx: new sub-route type `creatorProfile` with `creatorPrincipal` param; open from HomePage VideoCard username tap; back button returns to home feed

### Modify
- **VideoCard** — make the @username text tappable (separate from the card's main onClick), calling a new `onCreatorClick` prop with the uploader Principal
- **HomePage** — handle `onCreatorClick` from VideoCard, set a `viewingCreator` state, render PublicCreatorProfilePage in-place (animated slide-in) instead of the video feed
- **App.tsx** — add `creatorProfileRoute` state: `{ type: 'creatorProfile', principalId: string } | null`; render PublicCreatorProfilePage when set; pass navigation to HomePage

### Remove
- Nothing removed

## Implementation Plan

1. Create `src/pages/PublicCreatorProfilePage.tsx`:
   - Props: `principalId: string`, `onBack: () => void`
   - Fetch username via `useGetUsernameByPrincipal(principal)`
   - Fetch extended profile via backend if available
   - Display: avatar (gradient initial), display name, @username, follow/unfollow button, follower/following counts (placeholders), bio if available
   - Videos section: filter `useListVideoPosts()` by `uploader === principal`, show in 2-col grid with thumbnails
   - Battle stats section: wins, MVP, streak from localStorage (same pattern as UserProfileModal)
   - Back button at top left
   - Full-screen dark theme, sticky header
   - data-ocid markers on all interactive surfaces

2. Modify `VideoCard.tsx`:
   - Add optional `onCreatorClick?: (uploader: Principal) => void` prop
   - Wrap @username span in a `<button>` that calls `onCreatorClick(post.uploader)` with `stopPropagation`

3. Modify `HomePage.tsx`:
   - Add `onCreatorClick?: (principalId: string) => void` prop
   - Pass it down to VideoCard
   - Call `onCreatorClick(post.uploader.toString())` from VideoCard username tap

4. Modify `App.tsx`:
   - Add `creatorProfileRoute: { principalId: string } | null` state
   - In renderPage for `home` case: if `creatorProfileRoute` is set, render `PublicCreatorProfilePage` with back handler
   - Pass `onCreatorClick` to `HomePage` to set the route
   - PublicCreatorProfilePage is full-screen (no bottom nav while viewing); add it to `isFullScreenRoute`
