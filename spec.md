# SUB PREMIUM

## Current State
The app is a mobile-first video streaming platform with:
- Home page with a header (logo, search icon, bell icon, profile icon)
- Search currently activates via the search icon in the header, expanding to a full-width bar
- Backend has video posts, playlists, watch history, saved videos, subscriptions, and usernames
- No AI assistant or AI search history functionality

## Requested Changes (Diff)

### Add
- AI Assistant integrated directly inside the main search bar on the Home page
- The search bar is always visible (not hidden behind an icon) — replaces the current icon-triggered search
- Left side: search icon; placeholder: "Search or ask AI..."; right side: small robot icon (🤖)
- Subtle glowing red border animation when AI mode is active
- AI mode detection: if input contains `?` or looks like a full sentence (more than 3 words), activate AI mode
- AI response panel below the search bar (card style, fade-in animation) showing:
  - "AI Assistant" label at top
  - Smart text answer (generated from video titles/descriptions context)
  - Suggested videos grid/list based on the query
  - "Search results instead" button to switch to normal search
  - "Clear" button to dismiss AI response
- AI search history saved per user in the backend (new `saveAiSearchHistory` / `getAiSearchHistory` / `clearAiSearchHistory` endpoints)
- "Ask AI" shortcut in search suggestions dropdown
- Backend: new `AiSearchEntry` type and storage per user principal

### Modify
- HomePage header: replace the old icon-triggered search with the always-visible AI-enabled search bar embedded below the logo row
- The logo + notification/profile icons remain at top; the search bar sits below them as a persistent element
- Search bar: dark rounded pill, left search icon, right robot icon
- When AI mode is active: glowing red/orange border effect

### Remove
- The old search icon button in the header right-side (search is now always visible in its own row)
- The AnimatePresence mode switcher between "search active" and "header default" states (since search is always shown)

## Implementation Plan
1. Update `main.mo` backend to add AI search history: `AiSearchEntry` type, `saveAiSearchHistory`, `getAiSearchHistory`, `clearAiSearchHistory` per-user functions
2. Regenerate `backend.d.ts` bindings
3. Create `AISearchBar` component with:
   - Always-visible dark rounded input
   - AI mode detection logic
   - Glowing border CSS animation when active
   - AI response panel with smooth fade-in
   - Suggested videos from current video list filtered by query keywords
   - "Search results instead" / "Clear" actions
4. Update `HomePage.tsx` to:
   - Remove old search-icon-triggered expand pattern
   - Keep logo + notification + profile in header row
   - Add `AISearchBar` as a persistent row below the header row
   - Wire AI search history save/load via backend hooks
5. Add `useAiSearchHistory` query hook
