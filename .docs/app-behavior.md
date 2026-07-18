# AtomR — App Behavior

What the app actually is and does today. Source of truth before any UI rethink.

## Product

AtomR is a web version of the Android game **Chain Reaction**: turn-based, deterministic board tactics with cascading orb explosions. No randomness, no hidden state. Strong positions flip fast — one move can convert half the board via chain explosions.

Last player with orbs on the board wins.

## Stack

- **Frontend**: TanStack Start (React 19, SSR) + Vite 7 + Tailwind 4
- **Backend**: Convex (functions, presence, matchmaking, online match state)
- **Auth**: Better Auth via `@convex-dev/better-auth`
- **DB**: Drizzle ORM on Convex
- **Analytics**: PostHog
- **PWA**: `public/manifest.webmanifest` + `public/sw.js` (installable)
- **Fonts**: Oxanium (game) + JetBrains Mono (numbers)
- **Tests**: Vitest + Testing Library + jsdom

## Routes

| Path | Purpose |
|---|---|
| `/` | Landing. Hero "Turn-based cascading play." + PLAY / LIVE MATCH CTAs. Auto-redirects to active match if one exists. |
| `/play` | Mode picker. 5 cards: Local, Online, Training, AI Game, AI Battle. |
| `/play/local` | Hot-seat. 2–8 players share device. |
| `/play/online` | Lobby. Public queue + private room by code. Requires auth. |
| `/play/match/$matchId` | Live online match. |
| `/play/room/$code` | Private room lobby. |
| `/play/training` | Same as local but with ghost-hint suggested moves every turn. |
| `/play/ai` | Player vs CPU. Difficulty slider. |
| `/play/ai-battle` | CPU vs CPU. Watch bots play. |
| `/sign-in`, `/sign-up` | Auth forms. No global shell (no-chrome route list). |

## Game Rules (implemented)

- Grid of cells. Default board **9×6**. Each cell has **capacity = orthogonal neighbor count**: corner `2`, edge `3`, inner `4`.
- **Legal move**: tap an empty cell, or a cell you own.
- Placement adds `1` orb. If orb count reaches capacity → cell explodes.
- **Explosion**: cell loses `capacity` orbs, sends `1` orb to each orthogonal neighbor, all neighbors convert to exploder's color (cell-wide ownership flip).
- Explosions queue neighbors that reach capacity → chain resolves until stable.
- Turn ends only after full chain resolves.
- **Elimination**: player with `0` orbs after resolution is out. First-round immunity implied by rotation.
- **Win**: last player with orbs remaining.
- **Draw**: unstable loop (rare).

## Engine Surface

`src/features/atomr/shared-engine.ts` + `engine.ts`:
- `isLegalMove(state, row, col)` — empty or own cell
- `isCellCritical(state, cell, row, col)` — at `capacity - 1`
- Move resolver returns final board state + event log (placement, explosions, captures)
- Player status: active / eliminated / winner
- Deterministic — engine is source of truth, UI replays events with animation

## Game Hook: `useAtomRGame(rows, cols, playerCount, resetToken)`

Returns:
- `state` — full `GameState` (board, currentPlayer, phase, winner, isDraw, eliminated)
- `handleMove({row, col})` — commits + runs playback
- `isAnimating` — input lock during cascade
- `activeExplosionKeys`, `activeCaptureKeys`, `activeExplosions` — current animation frame state
- `lastMove` — original placed cell (for highlight)
- `moveHistory` — full move log (for ReplayPanel)
- `reset()` — new game with same config

## Board Sizing

`getRecommendedSize()` (`utils/recommendedSize.ts`):
- Reads `window.innerWidth - 24`, `window.innerHeight - 160`
- Cell target clamped `50–90px`
- Output: cols `4–16`, rows `3–12`
- On a typical desktop viewport → **16 cols × 8 rows** (way bigger than classic 9×6)
- Called once on mount in `LocalPlayScreen` / `AiPlayScreen`; user can override via Board settings modal

**Problem**: default desktop board is far larger than the canonical game. Cells get tiny, board fills the whole screen, tactical density drops.

## Visual Language (current)

- Background: `#07070b` near-black
- Cell face: `#141427` dark indigo
- Owned cell tint: `color-mix(in srgb, ownerColor 10%, #141427)`
- Player colors (OKLCH):
  - p1 red-orange `oklch(0.68 0.24 35)`
  - p2 blue `oklch(0.73 0.17 250)`
  - p3 green, p4 magenta, p5 lime, p6 purple, p7 red, p8 near-white
- Orbs: absolutely-positioned spans, 30% width, `aspectRatio 1/1`, glow via `boxShadow`
- Orb arrangements: 1 center · 2 side-by-side · 3 triangle · 4 corners
- Critical cells: pulsing ring (`cr-critical-pulse` 0.75s)
- Explosion: `cr-orb-burst` scale-up + blur
- Capture: `cr-capture-ripple` expanding ring
- Flying orbs: `cr-orb-fly` travels source→target (FlyingOrbOverlay)
- No count label rendered in current `AtomRCell.tsx` (orb arrangement is the only count cue — at 4 orbs you see 4 dots, but no number)

## HUD (`GameHud.tsx`)

- 3-column grid: `[home] [turn reel] [undo/settings]`
- **TurnReel**: horizontal 3-slot strip of orbs (prev · current · next). Animates a slide on turn change (380ms cubic-bezier).
- Center slot = current player. No text label, no player name, no "Turn: P1" anywhere.
- Color is the only turn signal. Fails color-blind accessibility.
- Winner locks the reel.

## Cell Interactivity

- All cells are `<button>`s with `aria-label` like `"D3, p1 cell with 1 orb, illegal"` — good for screen readers
- Disabled (`aria-disabled`) when not legal
- **No visible legal-move hint** on the board itself — only hover state shows a tint
- Last move: thin white inset ring
- Suggested (training): dashed border in suggestion color
- Queued premove: solid ring in queue color
- Keyboard navigation via `useBoardKeyboardNavigation` hook (no UI hint that it exists)

## Settings Modal (`GameSettings.tsx`)

- Sliders: rows, cols, player count, difficulty (AI only)
- Buttons: "USE RECOMMENDED SIZE", "APPLY & RESET"
- No presets (e.g. 9×6, 12×8, 16×10)
- Escape to close

## Online Match Behavior

- `syncViewer` heartbeat keeps presence fresh
- Queue entry has `searching` / `matched` status; auto-navigates to `/play/match/$matchId` on match
- **Turn timeout: 30s** → server plays one random legal move on behalf of timed-out player (not a forfeit)
- Last move shown via persistent cell highlight + coordinate label
- Private rooms via 4-letter(ish) code

## Auth

- Better Auth on Convex. Email/password + session.
- `requireSessionFn` guards `/play/online` and match routes
- Sidebar shows user chip when signed in, "SIGN IN" link otherwise
- Sign-in / sign-up are no-chrome routes (no sidebar)

## What Already Works Well

- Engine is correct, deterministic, tested
- Animation system explains causality (placement → fly → capture → explosion)
- Critical-cell pulse exists
- Last-move highlight exists
- Keyboard nav exists
- Premoves queue exists
- Replay panel exists (post-game)
- Online matchmaking + room codes + 30s timeout exist
- PWA installable
- Accessibility: `aria-label` per cell is detailed

## What Sucks (UI critique)

### Turn identity is invisible
HUD shows a reel of colored orbs. No "P1's turn" text, no player names, no number. New players cannot tell whose turn it is without memorizing colors. Fails the #1 rule from playability research: persistent explicit turn state.

### Board auto-fills viewport on desktop
`getRecommendedSize` clamps cols at 16 — on wide screens you get 16×8 with 50px cells. Classic AtomR is 9×6. Board becomes a wall of tiny squares; tactical readability collapses. Should cap at canonical size or center a fixed-aspect board with breathing room.

### No legal-move hint on board
Playability doc explicitly calls for "subtle ring / inset glow / faint tint" on playable cells. Current: only hover reveals legal cells. Mobile users (no hover) get zero hint.

### Critical state is color-only
Critical cells pulse, but the cue is the owner color. No differentiation between "my critical" vs "enemy critical" vs "my cell threatened by enemy critical". Playability doc called this out as the most important threat readability fix.

### No orb count number
Orb count is conveyed only by dot arrangement. At 3 orbs in a tight cell you squint. Docs originally planned a JetBrains Mono count label — not in current `AtomRCell.tsx`.

### Cell coordinate labels missing on board
Cell `aria-label` has `A1` etc. but nothing visible. Online match doc says "compact text label with player + board coordinate" for last move — not rendered.

### Home page is generic
"Turn-based cascading play. Place orbs. Capture cells. Clear the board." Two links. No preview of the board, no rules teaser, no animated demo, no visual identity beyond two radial gradients. Looks like every other AI-generated landing.

### Mode picker is flat
5 rows, same visual weight, only icon + label + copy. No hierarchy (Local should be primary — it's the only no-setup mode). No preview of what each mode looks like.

### Settings has no presets
Sliders only. No "9×6 classic", "12×8 large", "16×10 huge" buttons. "USE RECOMMENDED SIZE" just re-runs the auto-sizer that already produced a bad size.

### Bottom hint is unreadable
`text-[10px] tracking-[0.3em] text-white/12` — "Place on empty or owned cells · chains resolve automatically". Below contrast minimum. Pure decoration.

### No rules / how-to-play
New users land on a board with zero guidance. No first-time overlay, no "place on empty or your own cells" tooltip, no rules page. The bottom hint tries to be this but fails.

### No install prompt
PWA is set up but no UI surfaces it. Mobile users miss "add to home screen".

### Sidebar is dead weight on play routes
Play routes are no-chrome (Sidebar hidden). But on `/` and `/play` the sidebar takes 250px on desktop with just 2 nav items + auth chip. Wasted space; could be a top bar or integrated into the page.

### HUD buttons are tiny + labelless on mobile
`h-11 w-11` icons. Labels hidden under 480px. "BOARD" text is the only word. Undo / settings / home are icon-only on phones.

### No sound
Game feel research flagged optional sound as a high-impact low-cost win. No audio assets, no mute toggle (which the doc says to ship from day one).

### No reduced-motion path
Animations are core to gameplay (cascade playback). No `prefers-reduced-motion` fallback that skips staggered playback.

## Files (key)

```
src/routes/
  __root.tsx              # layout, no-chrome route list, theme init
  index.tsx               # landing
  play.tsx                # mode picker
  play/local.tsx          # thin wrapper over LocalPlayScreen
  play/online.tsx          # lobby (queue + room)
  play/match.$matchId.tsx # online match (23KB — biggest route)
  play/room.$code.tsx     # private room
  play/training.tsx       # wrapper
  play/ai.tsx             # wrapper
  play/ai-battle.tsx      # wrapper
  sign-in.tsx / sign-up.tsx

src/features/atomr/
  engine.ts / shared-engine.ts   # rules
  useAtomRGame.ts                # game hook
  useResolvedGamePlayback.ts     # animation event replay
  ai.ts / ai.worker.ts           # CPU
  premoves.ts                    # queued moves
  onlineMatchmaking.ts           # client
  constants.ts                   # PLAYER_COLORS, PLAYER_NAMES
  selectors.ts                   # isCellCritical etc.
  components/
    AtomRBoard.tsx              # grid + keyboard nav
    AtomRCell.tsx                # cell render (orbs, rings, hints)
    GameHud.tsx                  # turn reel + buttons
    GameOverlay.tsx              # winner overlay
    GameSettings.tsx             # sliders modal
    ReplayPanel.tsx              # post-game replay
    FlyingOrbOverlay.tsx         # orb travel animation
    LocalPlayScreen.tsx          # assembles local game
    AiPlayScreen.tsx             # assembles AI game
    AiBattleScreen.tsx           # CPU vs CPU
```

## Sources

- `.docs/atomr-game.md` — rules
- `.docs/atomr-game-feel-research.md` — motion + sound + haptics
- `.docs/atomr-playability-research.md` — readability + UX
- `.docs/atomr-ui-v2.md` — current visual language spec
- `.docs/online-match-behavior.md` — online rules
- Source: `src/routes/*`, `src/features/atomr/*`, `src/components/*`
