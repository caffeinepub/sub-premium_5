# SUB PREMIUM

## Current State
Full-featured mobile video streaming app. Already uses a max-width-430px centered layout in App.tsx. Most navigation is internal tab-based. Two external `<a>` links exist in footer areas (LoginPage and ProfilePage) pointing to `caffeine.ai` with `target="_blank"`. No major multi-column layout issues found on the home feed. The `index.css` body has `overscroll-behavior: none` and the app wrapper enforces `max-w-[430px]`. No `overflow-x` global lock on `body`/`html`.

## Requested Changes (Diff)

### Add
- Global CSS rules in `index.css` to enforce mobile lock: `overflow-x: hidden` on `html` and `body`, `max-width: 480px` + `margin: auto` on `#root` content area, prevent horizontal scroll everywhere.
- A utility CSS class `.no-external-link` to strip anchor styling from converted plain-text elements.

### Modify
- `LoginPage.tsx` — Convert the Caffeine footer `<a>` tag to a plain `<span>` (non-clickable plain text).
- `ProfilePage.tsx` — Convert the Caffeine footer `<a>` tag to a plain `<span>` (non-clickable plain text).
- `index.css` — Add mobile lock rules: `html, body { overflow-x: hidden; }`, ensure `#root` wrapper cannot expand beyond 480px on large screens, add `touch-action: pan-y` to prevent horizontal drag-scroll, add `user-select: none` optionally on nav elements.

### Remove
- All `href="https://..."` external anchor tags.
- All `target="_blank"` attributes.
- Any `rel="noopener noreferrer"` on external-pointing anchors.

## Implementation Plan
1. In `index.css`: Add `overflow-x: hidden` to `html` and `body`. Add `max-width: 480px; margin-left: auto; margin-right: auto;` to `body` or `#root` to hard-clamp the layout on large screens. Add `touch-action: pan-y` on body to prevent accidental horizontal scroll gestures.
2. In `LoginPage.tsx`: Replace the `<a href="...">Built with love using caffeine.ai</a>` with `<span>Built with love using caffeine.ai</span>`.
3. In `ProfilePage.tsx`: Replace the `<a href="...">Built with love using caffeine.ai</a>` with `<span>Built with love using caffeine.ai</span>`.
4. Verify no other `href="http` or `target="_blank"` remain in non-UI component files.
5. Confirm App.tsx wrapper already has `max-w-[430px]` — no changes needed there.
