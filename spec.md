# SUB PREMIUM — Real Live Stream Engagement + Battle System

## Current State

The app has a live streaming system (`NewLiveStreamScreen`) with:
- Camera preview, countdown overlay, mic/flip controls
- Basic chat panel with simulated messages
- Gift panel with 5 gift types (simulated coins)
- Battle mode (split-screen score bars, simulated score)
- Co-host panel (mock viewers)
- Moderator panel
- Viewer count (simulated, incrementing randomly)
- Coin earnings counter (local only, not backend-synced)
- `LiveDiscoveryPage` showing mock stream cards

Missing or incomplete:
- No double-tap heart system
- No engagement progress bar with celebration animation
- No heart rain effect
- No real gift types matching spec (Rose/Heart/Fire/Rocket/Crown/Dragon)
- No gift animations with "username sent gift" overlay
- No creator profit/earnings display
- No withdrawal UI in the live screen
- No HUD showing heart counter + progress bar above video
- Battle system uses simulated scores, not gift-driven
- Viewer count is fake (incrementing random, no real tracking)
- Co-host chairs layout (3 per side) not shown in split-screen battle view

## Requested Changes (Diff)

### Add

- **Double-tap heart system**: Detect double-tap (2 taps < 300ms) or triple-tap anywhere on the live screen. Spawn floating heart animations at tap position, floating upward. Unlimited taps. Heart counter increments per tap burst (shows ❤️ x3, ❤️ x200, ❤️ x10K, ❤️ x1M formatted).
- **Engagement progress bar + HUD**: Above the video (in top area), display creator name, ❤️ heart counter, viewer count, and a horizontal progress bar. Scale: 0→10K=25%, 10K→100K=50%, 100K→500K=75%, 500K→1M=100%.
- **Celebration animation at 100%**: When progress hits 100%, trigger confetti/sparkle/heart burst animation overlay, then reset progress bar to 0. Heart total continues counting.
- **Heart rain effect**: When rapid taps detected (≥3 taps in 1 second), trigger heart rain — many hearts float continuously across screen.
- **Updated gift types**: Rose=1, Heart=5, Fire=10, Rocket=100, Crown=500, Dragon=1000 coins. Match spec exactly.
- **Gift notification overlay**: When gift sent, show animated overlay banner: "Alex sent Rocket 🚀". Premium gifts (≥100 coins) trigger full-screen animation overlay.
- **Creator earnings HUD**: In top bar show total coins received, and earnings in USD (100 coins = $1).
- **Battle split-screen with co-host chairs**: When battle active, show split-screen with Player 1 left / Player 2 right, each with 3 chair slots. Chairs fill when co-hosts join. Score driven by gift totals.
- **Live HUD display**: Full HUD with creator name, viewer count, ❤️ heart counter, progress bar, gift notifications all visible during live.
- **Bottom bar buttons**: Quick gift 🌹, Gift panel 🎁, Share 📤, Settings ⚙️, End Live 🔚 — styled per spec layout.
- **Center floating controls**: Mic toggle and camera flip as floating center-screen controls during live.

### Modify

- `NewLiveStreamScreen`: Major overhaul — add double-tap detection, heart animation system, engagement progress bar, celebration effects, heart rain, updated gift types/animations, HUD display, improved battle layout with chairs.
- `LiveDiscoveryPage`: Mark viewer counts as "live" (no change to mock data structure needed, just visual polish).
- Gift panel: Replace current gifts with spec-defined gifts (Rose/Heart/Fire/Rocket/Crown/Dragon).

### Remove

- Simulated random viewer count increments (replace with static starting count to represent "real" connected users concept — actual WebRTC tracking is out of scope for frontend-only).
- Old coin earnings counter (replace with proper earnings HUD).

## Implementation Plan

1. Create `HeartEngagementSystem` hook to manage heart count, progress bar state, tap detection, celebration trigger, heart rain state.
2. Update `NewLiveStreamScreen`:
   - Add tap/double-tap event listener on the video area.
   - Render floating hearts at tap position.
   - Add engagement HUD strip below top bar: creator name, ❤️ counter, viewer count, progress bar.
   - When progress hits 100%: confetti burst animation, reset bar.
   - Heart rain: when ≥3 taps/second, render multiple hearts floating across full screen.
   - Update gift panel with Rose/Heart/Fire/Rocket/Crown/Dragon gifts.
   - Add gift notification banner ("Alex sent Rocket 🚀") with full-screen for premium gifts.
   - Update bottom bar to match spec: 🌹 Quick gift, 🎁 Gift panel, 📤 Share, ⚙️ Settings, 🔚 End live.
   - Add center floating mic + flip controls.
   - Update battle split-screen to show left/right panels with 3 chair slots each.
   - Creator earnings display: coins → USD (coins/100 = dollars).
3. All animations use `motion/react` (already installed).
4. No backend changes — this is purely a frontend enhancement of engagement UX.
