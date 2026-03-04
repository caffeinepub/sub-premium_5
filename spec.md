# SUB PREMIUM

## Current State

The app has a bottom navigation bar (`BottomNav.tsx`) with 5 tabs:
- Home (left)
- Shorts (left)
- Upload (center, red circular button)
- History (right)
- Profile (right)

`TabId` type is: `"home" | "shorts" | "upload" | "history" | "profile"`

App.tsx renders pages by switching on `activeTab`. There is no `/live` page or `LivePage.tsx`.

The nav uses a left/center/right split: 2 left tabs, 1 center upload button, 2 right tabs.

## Requested Changes (Diff)

### Add
- New `TabId` value: `"live"`
- New `LivePage.tsx` at route equivalent `/live` (tab: `"live"`) with:
  - Title: "Go Live"
  - Stream title input
  - Description textarea
  - Privacy selector (Public / Subscribers Only / Private)
  - Category dropdown (Gaming, Music, Sports, Education, Entertainment, News, Tech, Other)
  - Thumbnail upload button
  - Big red "Start Live" button
  - Placeholder notice that streaming backend is not yet connected
- New "Live" tab in bottom nav between Upload and History (Subscriptions in the user's request maps to the existing History tab)
  - Icon: broadcast/radio icon with a small red dot badge
  - Label: "Live"
  - Active color: #FF2D2D

### Modify
- `BottomNav.tsx`: extend to 6 tabs — restructure layout so Upload stays as the center elevated button, Live tab sits between Upload and History. Right side becomes 3 items (Live, History, Profile) or redistribute as: left=[Home, Shorts], center=[Upload], right=[Live, History, Profile] — shrinking text/icons slightly to fit all 6.
- `TabId` type: add `"live"`
- `App.tsx`: add `"live"` case in `renderPage()` switch, import `LivePage`

### Remove
- Nothing removed

## Implementation Plan

1. Create `src/frontend/src/pages/LivePage.tsx` with the Go Live form UI
2. Update `src/frontend/src/components/BottomNav.tsx`:
   - Add `"live"` to `TabId`
   - Add Live tab (Radio/Broadcast icon + red dot badge) to right tabs, placing it before History
   - Adjust tab sizing so all 6 fit responsively (smaller icons/labels or flex adjustments)
3. Update `src/frontend/src/App.tsx`:
   - Import `LivePage`
   - Add `case "live": return <LivePage key="live" />` to the switch
