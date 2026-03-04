# SUB PREMIUM

## Current State

The app is a full video streaming platform with:
- Live streaming system with viewer watch page (`LiveWatchPage.tsx`)
- Top 3 engagement chairs (`TopEngagementChairs.tsx`) with a basic modal showing engagement points only
- `ViewerListPanel.tsx` with hardcoded fake viewer data
- Chat overlay with usernames rendered as plain text (not clickable)
- Creator avatar on right side — not clickable
- Gift sender usernames shown in chat messages — not clickable
- No dedicated user profile modal or profile page for viewing other users
- Backend has user profile data: `UserProfile`, `ExtendedProfile`, usernames map, follow/unfollow, subscriptions
- No backend fields for: followers count, coins received/sent, battle stats, battle history, gift history, win streak, league tier, last active, profile privacy settings, user ban status

## Requested Changes (Diff)

### Add

- `UserPublicProfile` type in backend: principal, username, displayName, bio, avatarUrl, joinDate, followersCount, followingCount, totalCoinsReceived, totalCoinsSent, battleWins, mvpCount, winStreak, leagueTier, isBanned, isLiveNow, privacySettings (showBattleHistory, showGiftHistory, showCoins)
- `BattleHistoryEntry` type in backend: opponent name, result, score, date, isMvp
- `GiftHistorySummary` type in backend: for creators (top gifts received, top supporters, total value), for viewers (total sent, favorite creator, highest gift)
- Backend query: `getPublicProfile(userId: Principal)` — returns `UserPublicProfile`
- Backend query: `getBattleHistory(userId: Principal)` — returns last 10 battle entries if privacy allows
- Backend query: `getGiftHistorySummary(userId: Principal)` — returns gift history if privacy allowed
- Backend mutation: `followUser(userId: Principal)` / `unfollowUser(userId: Principal)` — same as existing followCreator/unfollowCreator but generic
- Backend mutation: `reportUser(userId: Principal, reason: Text)` — stores report
- Backend mutation: `blockUser(userId: Principal)` — stores block list
- Backend mutation: `updateProfilePrivacy(settings: PrivacySettings)` — saves privacy prefs
- `UserProfileModal` component: full-screen slide-up modal with:
  - Top section: large avatar, username, user ID, Follow/Unfollow, Message, Report, Block buttons
  - Creator badges: Live badge (if live), league tier, level, MVP badge, 🥇 if recent win
  - Stats section: followers, following, coins received, coins sent, battles wins, MVP count, win streak, league tier, join date
  - Battle History section: lazy-loaded last 10 battles (honor privacy toggle)
  - Gift History section: creator vs viewer variant (honor privacy toggle)
  - Banned state: "Account Suspended" overlay
  - 30-second cache, instant open animation, smooth slide-up
- `ProfileContext` / `useProfile` hook: manages open/close state, userId being viewed, 30s cache
- Profile access points wired in `LiveWatchPage`:
  - Creator avatar (top right) → opens creator profile modal
  - Top 3 chair avatars → opens viewer profile modal (upgraded from current basic modal)
  - Chat username taps → opens viewer profile modal
  - Gift sender username taps (gift messages in chat) → opens profile modal
- Profile access points wired in `ViewerListPanel`:
  - Each viewer row username/avatar tap → opens profile modal
- Profile access in `LiveWatchPage` right-side opponent context (battle mode)

### Modify

- `TopEngagementChairs.tsx`: replace basic modal with `UserProfileModal` call via context
- `ViewerListPanel.tsx`: remove hardcoded `ALL_VIEWERS` fake data; wire username taps to open profile modal; fetch real viewer list from backend (using engagement store data)
- `LiveWatchPage.tsx`: make creator avatar clickable, wire chat username clicks, wire gift message username clicks
- Backend `getUserProfile` — relax authorization to allow any user to view another user's public profile

### Remove

- Hardcoded `ALL_VIEWERS` array in `ViewerListPanel.tsx`
- Hardcoded `MOCK_TOP_SUPPORTERS` array in `LiveWatchPage.tsx`

## Implementation Plan

1. Update Motoko backend to add `UserPublicProfile`, `BattleHistoryEntry`, `GiftHistorySummary` types, `getPublicProfile`, `getBattleHistory`, `getGiftHistorySummary`, `followUser`, `unfollowUser`, `reportUser`, `blockUser`, `updateProfilePrivacy` functions, and privacy settings storage.

2. Create `UserProfileModal` component with:
   - Slide-up Sheet/modal with full profile layout
   - Top section with avatar, username, user ID, action buttons
   - Creator-specific badges (Live, league tier, MVP, win badge)
   - Stats grid (all fetched from backend, no hardcoded values)
   - Battle history section (lazy loaded, respects privacy)
   - Gift history section (creator vs viewer variant, respects privacy)
   - Banned state handling
   - 30-second in-memory cache keyed by Principal string
   - Real-time WebSocket-style polling for follower count updates

3. Create `useUserProfile` hook for cache management and fetch logic.

4. Wire profile modal open triggers in:
   - `LiveWatchPage`: creator avatar, chat usernames (chat and gift messages), right-side opponent
   - `TopEngagementChairs`: chair avatar taps (upgrade existing modal)
   - `ViewerListPanel`: viewer row taps (username + avatar), remove fake data

5. Validate with typecheck and build.
