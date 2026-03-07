# SUB PREMIUM — Advanced Live Stream Features

## Current State

The app has a rebuilt `NewLiveStreamScreen.tsx` with:
- Camera always mounted
- 5-second countdown overlay (never replaces video)
- GO LIVE button
- Top bar: back, LIVE badge, viewer count
- Bottom controls: chat input, send, gift, share buttons + end/mic/flip icon row

There is a `HomePage.tsx` with category tabs and content rows (Trending, Live Now, etc.) but the "Live Now" row shows mock data.

No Live Discovery feed page exists. No Battle, Co-Host, Moderator, or Virtual Gifts systems exist beyond basic placeholders.

## Requested Changes (Diff)

### Add

**1. Live Battles Panel** (overlay inside NewLiveStreamScreen)
- A "Battle" button in the live controls
- When tapped, opens a BattlePanel overlay over the camera
- Split-screen simulation: left = host cam (current feed), right = opponent avatar/placeholder
- 5-minute countdown timer at top
- Two gift score progress bars (Host A vs Host B)
- Animated winner banner when timer ends
- "Start Battle" / "Cancel" buttons

**2. Co-Host Panel** (overlay inside NewLiveStreamScreen)
- A "Co-Host" button in the live controls
- When tapped, opens CoHostPanel showing list of mock viewers to invite
- Max 4 co-host slots shown as video tile grid (2x2)
- Host is always in top-left tile (large)
- Co-host tiles show avatar placeholder + username
- "Invite" button per viewer, "Remove" button on active co-hosts

**3. Moderator Panel** (overlay inside NewLiveStreamScreen)
- A "Mod" button in the live controls
- Opens ModeratorPanel overlay
- List of mock chat users; each row has: username, "Make Mod" button, "Kick" button
- Moderators get a red MOD badge next to username in the panel
- Moderator actions: mute, remove from chat, block, pin comment

**4. Virtual Gifts Panel** (already has a gift button — expand it)
- Tapping gift button opens GiftPickerPanel overlay (bottom sheet)
- 5 gift types: Rose 🌹 (1 coin), Fire 🔥 (5 coins), Diamond 💎 (20 coins), Rocket 🚀 (50 coins), Crown 👑 (100 coins)
- Each gift card shows: emoji, name, coin cost
- Tapping a gift triggers an animated overlay (emoji flies up from bottom, scale animation)
- Toast shows "Gift sent! +{n} coins to streamer"
- Coin earnings counter shown in top bar while live

**5. Live Discovery Page** — new page `LiveDiscoveryPage.tsx`
- Accessible from bottom nav "Live" tab (currently navigating to live tab shows nothing — wire it)
- Scrollable vertical feed of live stream cards
- Each card: gradient thumbnail (colored placeholder), username, LIVE badge, viewer count, Join button
- 10-second auto-refresh (simulated)
- Sort: highest viewer count first
- Empty state message if no streams

**6. Real-time Chat Overlay** (enhance existing chat)
- Chat messages appear as a scrollable list overlaid on the left side of the screen, above the input
- Each message: username + message text (bubble style)
- Auto-scroll to latest message
- Simulated incoming messages from other "viewers" every few seconds while live
- Pinned comment shown at top with a pin icon
- Emoji support in input

**7. Updated Live UI Top Bar**
- Add streamer avatar circle (placeholder) + username next to LIVE badge
- Add coin earnings counter (increments as gifts are received)

### Modify

- `NewLiveStreamScreen.tsx` — add Battle, Co-Host, Mod buttons to controls; expand gift button; add chat message list; update top bar with avatar/username/coins
- `App.tsx` — wire "live" tab to show `LiveDiscoveryPage` instead of nothing; when user taps Join on a card, open `NewLiveStreamScreen` as a viewer (read-only mode)
- Bottom controls layout: add Battle + Co-Host + Mod buttons in the icon row (6 icons total: End, Mic, Flip, Battle, Co-Host, Mod)

### Remove
- Nothing to remove

## Implementation Plan

1. Create `LiveDiscoveryPage.tsx` — scrollable live feed with mock data, auto-refresh, Join navigation
2. Update `App.tsx` — wire "live" tab to show `LiveDiscoveryPage`; handle join nav to camera-screen
3. Update `NewLiveStreamScreen.tsx`:
   a. Add chat message list (scrollable, above input, simulated incoming messages)
   b. Update top bar (avatar, username, coin counter)
   c. Add Battle/CoHost/Mod buttons to icon row
   d. Expand gift button to open GiftPickerPanel
   e. Add BattlePanel overlay
   f. Add CoHostPanel overlay
   g. Add ModeratorPanel overlay
   h. Add GiftPickerPanel bottom sheet
   i. Add gift fly animation overlay
4. Validate (typecheck + lint + build)
