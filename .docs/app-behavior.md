# AtomR — App Behavior

What the app actually is and does today. Source of truth for current state and remaining gaps.

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
| `/` | Landing. Hero "Turn-based cascading play." + live demo board (real engine auto-playing a 4×3 / 3×4 cascade loop) + PLAY / LIVE MATCH CTAs. Auto-redirects to active match if one exists. |
| `/play` | Mode picker. Hierarchical cards: LOCAL primary (largest), Online + vs CPU secondary, Training + AI Battle tertiary. |
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

`getRecommendedSize()` (`utils/recommendedSize.ts`) is **preset-based**, not viewport-fill:
- Landscape presets: `9×6` classic · `12×8` · `14×10` · `16×10` max
- Portrait presets (transposed): `6×9` · `8×12` · `10×14` · `10×16` max
- Picks the largest preset that fits at **≥56px cells** in the current orientation, else falls back to the classic 9×6 / 6×9.
- Called once on mount in `LocalPlayScreen` / `AiPlayScreen` / `AiBattleScreen` / `TrainingPlayScreen` / `match.$matchId`.

This kills the old "16×8 on every desktop with 50px cells" problem. The board is now capped at canonical sizes with a guaranteed minimum cell size. User can still override via the Board settings modal, which surfaces the same presets.

## Visual Language (current)

- Background: `oklch(0.05 0.005 265)` near-black (from `--background` token)
- Cell face: `#0c0d14` / `#11121a` dark indigo
- Owned cell tint: `color-mix(in srgb, ownerColor 10%, #11121a)`
- Legal empty cell: `color-mix(in srgb, #78d28a 6%, #0c0d14)` + inset `rgba(120,210,138,0.22)` ring — **always visible, not hover-only**
- Player colors (OKLCH), with `PlayerBadge` rendering `P1`/`P2`/… alongside color so color is never the sole signal:
  - p1 cyan `oklch(0.72 0.19 195)`
  - p2 red-orange `oklch(0.72 0.19 23)`
  - p3 green, p4 magenta, p5 yellow-green, p6 purple, p7 red, p8 near-white
- Orbs: plasma radial gradient (`.cr-orb-plasma`) — hot white core → owner color → deeper edge, with `boxShadow` glow
- Orb arrangements: 1 center · 2 side-by-side · 3 triangle · 4 corners
- **CellCount** (`CellLabels.tsx`): bottom-right `count/capacity` label (e.g. `2/3`) in JetBrains Mono, always visible when `count > 0`
- **CellCoordinate** (`CellLabels.tsx`): top-left `A1`-style label in JetBrains Mono, faint, visibility toggled by caller
- Critical cells: pulsing inner ring (`cr-critical-pulse` 0.75s) **plus danger stripes** (`.cr-danger-stripes`) — owner-colored: `--warn` (oklch 0.82 0.18 85) for self-critical, `--danger` (oklch 0.72 0.24 25) for enemy-critical
- **Threatened notch**: small `--warn` mark on the bottom edge of any of my cells adjacent to an enemy critical
- Explosion: `cr-orb-burst` scale-up + blur; pre-burst white-hot flash (`.cr-pre-burst-flash`)
- Capture: `cr-capture-ripple` expanding ring
- Flying orbs: `cr-orb-fly` travels source→target (FlyingOrbOverlay)
- Turn text cross-fade (`.cr-turn-fade` 0.18s)
- Reduced-motion: `@media (prefers-reduced-motion: reduce)` zeroes animation/transition durations and replaces pulse with a static strong border

## HUD (`GameHud.tsx`)

- 3-column grid: `[home] [turn status] [undo / rules / board]`
- **Turn status** (center, `aria-live="polite"`):
  - `PlayerBadge` (P1/P2/…) filled in player color
  - Oxanium uppercase status text: `PLAYER N'S TURN` (or `… WINS` / `UNSTABLE LOOP` / `RESOLVING…`)
  - Inline countdown `MM:SS` when an online turn deadline is set — color shifts green → amber → red as time runs out
- **TurnTimerBar**: thin progress bar below the status. Depletes over the 30s online deadline; replaced by an indeterminate pulse during `resolving`; stays full + neutral in local hot-seat
- **PlayerChipsStrip**: horizontal strip below the timer — one chip per active player with `PlayerBadge` + orb count, current player highlighted in their color, eliminated players dimmed + struck through
- Right cluster: undo (if available), rules (How to play), board settings
- Winner locks the status text

Color is reinforcement, not the only signal: badge + text + timer all carry the turn state explicitly.

## Cell Interactivity

- All cells are `<button>`s with `aria-label` like `"D3, p1 cell with 1 orb, critical, illegal"` — good for screen readers
- Disabled (`aria-disabled`) when not legal
- **Always-visible legal-move hint** on empty legal cells: green tint + inset ring (not hover-only)
- Critical cells render danger stripes + inner pulse + (for my cells next to enemy criticals) a threatened notch
- Last move: thin white inset ring
- Suggested (training): dashed border in suggestion color
- Queued premove: solid ring in queue color
- Keyboard navigation via `useBoardKeyboardNavigation` hook (arrow keys + repeat)

## Settings Modal (`GameSettings.tsx`)

- **Presets first** (4 per orientation, matching `getRecommendedSize`): `9×6 classic` / `12×8` / `14×10` / `16×10 max` (portrait transposed). Active preset highlights when current `rows×cols` matches.
- Sliders: rows `3–12`, cols `4–16`, player count `2–8`, difficulty `1–10` (AI only)
- Toggles: **premoves** (queue one move during opponent's turn) and **vibration** (Web Vibration API haptics)
- Buttons: `×` close, `apply & reset`
- Escape to close
- No "use recommended size" button — the auto-sizer runs once on screen mount and presets cover the same ground

## Online Match Behavior

- `syncViewer` heartbeat keeps presence fresh
- Queue entry has `searching` / `matched` status; auto-navigates to `/play/match/$matchId` on match
- **Turn timeout: 30s** → server plays one random legal move on behalf of timed-out player (not a forfeit)
- Last move shown via persistent cell highlight + coordinate label
- Private rooms via 4-letter(ish) code

## Auth

- Better Auth on Convex. Email/password + session.
- `requireSessionFn` guards `/play/online` and match routes
- Top bar shows user chip when signed in, "SIGN IN" link otherwise
- Sign-in / sign-up are no-chrome routes (no top bar)

## What Already Works Well

- Engine is correct, deterministic, tested
- Animation system explains causality (placement → fly → capture → explosion + pre-burst flash)
- Critical-cell pulse + danger stripes + threatened notch exist
- Always-visible legal-move hint exists
- CellCount `2/3` labels exist
- Last-move highlight exists
- Keyboard nav (arrows) exists
- Premoves queue exists (with toggle in settings)
- Replay panel exists (post-game)
- Online matchmaking + room codes + 30s timeout exist
- PWA installable
- Accessibility: detailed `aria-label` per cell, `aria-live` turn region, visible focus ring, `prefers-reduced-motion` fallback
- HUD: explicit `PLAYER N'S TURN` text + countdown timer + per-player chips strip
- Onboarding: 3-step first-time overlay (`OnboardingOverlay.tsx`) with `?` re-open button in the HUD; localStorage flag `atomr:onboarded`
- Home page: live demo board auto-playing a cascade loop
- Mode picker: hierarchical (LOCAL primary, others secondary/tertiary)
- Settings: presets first, then sliders + toggles
- Vibration haptics (Web Vibration API) with settings toggle

## Current State & Remaining Gaps

This section replaces the old "What Sucks" list. The pre-rewrite critiques below have been addressed; the items that remain are genuine open gaps, not regressions.

### Addressed since the pre-rewrite critique

- **Turn identity is invisible** → Fixed. HUD now shows `PLAYER N'S TURN` text + badge + countdown + per-player chips strip. Color is reinforcement only.
- **Board auto-fills viewport on desktop** → Fixed. `getRecommendedSize` is preset-based, capped at 16×10 max, with a 56px minimum cell size and a 9×6 classic fallback.
- **No legal-move hint on board** → Fixed. Empty legal cells get a green tint + inset ring, always visible.
- **Critical state is color-only** → Fixed. Danger stripes (self=warn, enemy=danger) + inner ring pulse + threatened notch on my cells next to enemy criticals.
- **No orb count number** → Fixed. `CellCount` renders `2/3` bottom-right in JetBrains Mono.
- **Cell coordinate labels missing on board** → Partially. `CellCoordinate` component exists and is wired; visibility is caller-controlled (e.g. online match last-move label). Not always-on across all modes.
- **Home page is generic** → Fixed. Live demo board (real engine, 4×3 / 3×4) auto-plays a cascade loop as the hero.
- **Mode picker is flat** → Fixed. Hierarchical cards: LOCAL primary, Online + vs CPU secondary, Training + AI Battle tertiary.
- **Settings has no presets** → Fixed. 4 presets per orientation, active preset highlighted.
- **Bottom hint is unreadable** → Improved. Hint now uses `rgba(255,255,255,0.42)` (≈ `--text-faint`) instead of `white/12`. Still 10px, still decorative in tone, but above the old contrast floor.
- **No rules / how-to-play** → Fixed. `OnboardingOverlay` 3-step first-time overlay + `?` rules button in the HUD.
- **Sidebar is dead weight on play routes** → Fixed. `Sidebar.tsx` now exports a `TopBar` (fixed `h-14` header, not a 250px rail). Play routes remain no-chrome.
- **HUD buttons are tiny + labelless on mobile** → Partially. Buttons are `h-11 w-11` with labels hidden under 480px (icon-only). Labels appear at `≥480px`. Tap target meets the 44pt minimum.
- **No reduced-motion path** → Fixed. `@media (prefers-reduced-motion: reduce)` zeroes animations and replaces the critical pulse with a static strong border.

### Still open

- **No sound.** Game feel research flagged optional sound as a high-impact low-cost win. No audio assets, no mute toggle. The §16 decision locked "no sound, vibration only" — so this is intentional, but the door is open.
- **No PWA install prompt UI.** PWA manifest + service worker exist, but no UI surfaces "add to home screen". Mobile users miss the install affordance.
- **No `?` / `R` / `U` keyboard shortcuts.** The `?` rules shortcut, `R` reset, and `U` undo called for in the rethink are not bound. The `?` rules button is mouse/touch only. `Esc` closes modals and arrow-key board nav exist.
- **`cr-cell-press` CSS exists but is not applied.** The squash-on-tap keyframe is defined in `styles.css` but no cell wires the class. Cell taps have no press animation today.
- **No surrender / exit button.** The HUD has home / undo / rules / board, but no explicit surrender or exit-current-game action mid-match. Players back out via the home link.
- **Winner overlay has no longest-cascade stat or loser chip.** `GameOverlay` shows `{winnerOrbs} orbs · {moves} moves` only. The longest-cascade count and the struck-through loser chip from the rethink are not implemented. `computeStats` has a TODO-style comment noting cascade length isn't derivable from current history.
- **Board preset not persisted.** No `localStorage` key for the user's last-selected preset (`atomr:board-preset`). The board re-runs `getRecommendedSize` on every mount; manual overrides don't stick across reloads.
- **No `resize` / `orientationchange` listener.** If the user rotates the device mid-session, the board does not re-evaluate orientation. A reload is required to swap landscape↔portrait presets.
- **`--bg` / `--surface` / `--line` / `--danger` / `--warn` / `--ok` design tokens are not in `styles.css`.** The rethink proposed a token set; the codebase uses the legacy `--background` / `--card` / `--border` / `--foreground` / `--muted` set plus inline `oklch()` literals for danger/warn/ok. The proposed tokens are documented in `.docs/ui-rethink.md` §3 as planned, not implemented.
- **Bottom hint is still decorative.** Contrast is fixed but the line is still 10px tracked-out caps doing first-time-user education work that the onboarding overlay now handles better. Candidate for removal or demotion.

## Files (key)

```
src/routes/
  __root.tsx              # layout, no-chrome route list, theme init, TopBar mount
  index.tsx               # landing + live demo board
  play.tsx                # mode picker (hierarchical cards)
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
  utils/recommendedSize.ts       # preset-based board sizing
  utils/vibration.ts             # Web Vibration API haptics
  components/
    AtomRBoard.tsx              # grid + keyboard nav
    AtomRCell.tsx                # cell render (orbs, rings, stripes, count, hints)
    CellLabels.tsx               # CellCount + CellCoordinate sub-components
    PlayerBadge.tsx              # reusable P1/P2 badge
    GameHud.tsx                  # turn status + timer + chips strip + buttons
    GameOverlay.tsx              # winner overlay
    GameSettings.tsx             # presets + sliders + toggles modal
    OnboardingOverlay.tsx         # 3-step first-time rules overlay
    ReplayPanel.tsx              # post-game replay
    FlyingOrbOverlay.tsx         # orb travel animation
    LocalPlayScreen.tsx          # assembles local game
    AiPlayScreen.tsx             # assembles AI game
    AiBattleScreen.tsx           # CPU vs CPU
    TrainingPlayScreen.tsx       # training (ghost hints)

src/components/
  Sidebar.tsx                   # TopBar (fixed h-14 header, despite filename)
```

## Sources

- `.docs/atomr-game.md` — rules
- `.docs/atomr-game-feel-research.md` — motion + sound + haptics
- `.docs/atomr-playability-research.md` — readability + UX
- `.docs/atomr-ui-v2.md` — current visual language spec
- `.docs/online-match-behavior.md` — online rules
- `.docs/ui-rethink.md` — redesign plan + implementation status
- Source: `src/routes/*`, `src/features/atomr/*`, `src/components/*`, `src/styles.css`
