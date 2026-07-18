# AtomR — UI Rethink

Opinionated redesign. Goal: give AtomR a real identity, fix the readability gaps from `.docs/app-behavior.md`, and keep the game playable end-to-end.

Engine, rules, hook, online behavior — untouched. This doc is about what the player sees and touches.

> **Post-rewrite note.** The UI rewrite has landed. This doc now doubles as the design spec and the implementation status record. Section headings carry a status tag where relevant: `[SHIPPED]`, `[PLANNED]`, `[CSS READY, NOT WIRED]`, `[PARTIAL]`. See the summary below.

---

## Implementation Status

What shipped vs what didn't, after the UI rewrite.

### Shipped

- **§2 Reactor aesthetic**: dark indigo background, inset cell faces, plasma radial-gradient orbs (`.cr-orb-plasma`), danger stripes on critical cells, pre-burst white-hot flash.
- **§5.1 Board sizing — cap at canonical**: `getRecommendedSize` is preset-based, capped at 16×10 max, 56px minimum cell, 9×6 classic fallback.
- **§5.2 Cell states**: always-visible legal-move hint (green tint + inset ring), owner tint + `PlayerBadge`, critical danger stripes (self=warn / enemy=danger), threatened notch on my cells next to enemy criticals, last-move ring, suggested dashed outline, exploding/captured animation.
- **§5.2 Orb count number**: `CellCount` renders `count/capacity` (e.g. `2/3`) bottom-right in JetBrains Mono.
- **§5.3 Orb rendering**: `.cr-orb-plasma` radial gradient with hot core + glow.
- **§6 HUD redesign**: explicit `PLAYER N'S TURN` text + `PlayerBadge` + `MM:SS` countdown + `TurnTimerBar` + `PlayerChipsStrip` with orb counts and eliminated strike-through. Right cluster: home / undo / rules / board.
- **§8 Home page redesign**: live demo board (real `useAtomRGame`, 4×3 landscape / 3×4 portrait) auto-playing a cascade loop as the hero. Top bar (logo + auth), no sidebar.
- **§9 Play (mode picker) redesign**: hierarchical cards — LOCAL primary (largest, leftmost), Online + vs CPU secondary, Training + AI Battle tertiary.
- **§10 Settings modal redesign**: presets first (4 per orientation), sliders below, premoves + vibration toggles. "USE RECOMMENDED SIZE" dropped.
- **§11 Onboarding overlay**: 3-step first-time overlay (`OnboardingOverlay.tsx`) with localStorage flag `atomr:onboarded`. `?` rules button in the HUD re-opens it.
- **§12 Motion (refined)**: cascade step timing, pre-burst flash, turn cross-fade (`cr-turn-fade`), timer bar depletion. `@media (prefers-reduced-motion: reduce)` zeroes animations and replaces the critical pulse with a static strong border.
- **§13 Accessibility**: `aria-live` turn region, detailed per-cell `aria-label` including `critical`, visible focus ring, `PlayerBadge` always visible, reduced-motion path. (`?` / `R` / `U` keyboard shortcuts — see Planned.)
- **§16.1 Vibration**: Web Vibration API haptics (placement / capture / winner / turn change) with a settings toggle. Skips silently when the API is unavailable.

### Partial

- **§5.2 Cell coordinate**: `CellCoordinate` component exists and is wired; visibility is caller-controlled (online match last-move label uses it). Not always-on across all modes.

### Planned, not implemented

- **§3 Color tokens** (`--bg`, `--surface`, `--surface-2`, `--surface-3`, `--line`, `--line-strong`, `--text`, `--text-dim`, `--text-faint`, `--danger`, `--warn`, `--ok`): NOT in `styles.css`. The codebase still uses the legacy `--background` / `--card` / `--border` / `--foreground` / `--muted` set plus inline `oklch()` literals for danger/warn/ok. The proposed token set below is the target, not the current state.
- **§5.1.1 Orientation-aware presets + localStorage persistence**: `getBoardPresets()` returns the right preset list per orientation, but the user's selected preset is NOT persisted (no `atomr:board-preset` localStorage key). Manual overrides reset on reload.
- **Resize / `orientationchange` listener**: NOT implemented. `getRecommendedSize` runs once on screen mount; rotating the device mid-session does not re-evaluate. A reload is required to swap landscape↔portrait presets.
- **§6 Surrender / exit button**: NOT implemented. The HUD has home / undo / rules / board, but no explicit surrender or exit-current-game action.
- **§7 Longest-cascade stat + loser chip**: NOT implemented. `GameOverlay` shows `{winnerOrbs} orbs · {moves} moves` only. `computeStats` has a TODO noting cascade length isn't derivable from the current `MoveRecord[]` history. No struck-through loser chip.
- **§11 `?` / `R` / `U` keyboard shortcuts**: NOT implemented. `useBoardKeyboardNavigation` handles arrow keys; `Esc` closes modals. The `?` rules shortcut, `R` reset, and `U` undo are not bound — the `?` rules control is a HUD button (mouse/touch) only.

### CSS ready, not wired

- **§12 `cr-cell-press`**: `@keyframes cr-cell-press` and the `.cr-cell-press` class are defined in `styles.css`, but no cell applies the class. Cell taps have no press-squash animation today.

### Decisions recap (see §16)

- Sound: NO (vibration only). Locked.
- Sidebar: removed on non-game routes; replaced by a `TopBar`. Shipped.
- Onboarding: dismissable first-time overlay. Shipped.
- Board presets: 9×6 / 12×8 / 14×10 / 16×10, orientation-aware. Shipped (persistence: planned).
- Home demo board: real engine looping. Shipped.

---

## 1. Design Principles

1. **Tension before reward.** Every visual cue either builds anticipation or releases it. Nothing decorative for its own sake.
2. **State over styling.** If a visual choice doesn't tell you whose turn, what's legal, what's dangerous, or what just happened — cut it.
3. **Color is never the only signal.** Pair every hue with shape, label, or position.
4. **One board, one focal point.** The board is the product. Everything else is scaffolding.
5. **Identity from the game itself.** AtomR is about critical mass and cascades. The UI should look like a reactor instrument, not a generic dark dashboard.

---

## 2. Aesthetic Direction: "Reactor" `[SHIPPED]`

Move away from generic dark dashboard with soft radial gradients. Lean into the game's metaphor: orbs are energy cores, cells are containment, critical cells are about to breach, cascades are fission chains.

| Element | Now | Rethink |
|---|---|---|
| Background | `#07070b` flat + radial blobs | `#08090d` with a very faint **hex/grid texture** that fades toward edges (a reactor floor). Subtle, not busy. |
| Cell face | flat `#141427` | Slight inset, like a containment slot. `linear-gradient(180deg, #11121a, #0c0d14)` + inset hairline border. |
| Orbs | flat colored circles + glow | Radial gradient core (hot center, deeper edge) — looks like plasma, not a dot. Stronger glow at critical. |
| Critical cell | color ring pulse | Add **danger stripes** in owner color on the cell border, plus the ring. Shape, not just color. |
| Cascade | orb burst + ripple | Keep. Add a brief **white-hot flash** on the exploder before burst. |
| Typography | Oxanium + JetBrains Mono | Keep both. Mono for coordinates, counts, timer. Oxanium for titles, status. |

Reference vibes (not literal copies): the sterile UI of *Reactor Idle* / *Idle Planet Miner*; the tactical grid of *Into the Breach*; the monochrome-plus-one-accent of *Mini Metro*.

> **Status**: the reactor aesthetic shipped — dark indigo background, inset cell faces, plasma orbs (`.cr-orb-plasma`), danger stripes, and pre-burst flash are all in `src/styles.css` / `AtomRCell.tsx`. The faint hex/grid background texture is not implemented (flat background only).

---

## 3. Color System (revised) `[PLANNED — not implemented]`

> **Status**: the tokens below are the target spec. They are NOT in `src/styles.css`. The codebase uses the legacy `--background` / `--card` / `--border` / `--foreground` / `--muted` / `--input` / `--ring` set, plus inline `oklch()` literals for danger / warn / ok (e.g. `oklch(0.72 0.24 25)` for danger stripes, `#78d28a` for the legal tint). Migrating to this token set is still open.

Keep the OKLCH player palette (it works). Fix the environment:

| Token | Value | Use |
|---|---|---|
| `--bg` | `oklch(0.07 0.005 260)` | Page background |
| `--surface` | `oklch(0.11 0.008 260)` | Cards, HUD |
| `--surface-2` | `oklch(0.14 0.01 260)` | Cell face |
| `--surface-3` | `oklch(0.18 0.012 260)` | Cell face owned |
| `--line` | `oklch(1 0 0 / 0.06)` | Hairlines |
| `--line-strong` | `oklch(1 0 0 / 0.14)` | Borders, dividers |
| `--text` | `oklch(0.96 0 0)` | Primary text |
| `--text-dim` | `oklch(0.66 0 0)` | Secondary |
| `--text-faint` | `oklch(0.42 0 0)` | Tertiary (bottom hints) |
| `--danger` | `oklch(0.72 0.24 25)` | Critical / warning |
| `--warn` | `oklch(0.82 0.18 85)` | Near-critical threat |
| `--ok` | `oklch(0.78 0.17 145)` | Legal / available |

Player colors stay:
- p1 `oklch(0.68 0.24 35)` — red-orange
- p2 `oklch(0.73 0.17 250)` — blue
- p3 lime, p4 magenta, p5 yellow-green, p6 purple, p7 red, p8 near-white

> **Note**: the shipped player palette differs slightly from the spec above — `src/styles.css` and `constants.ts` use p1 cyan `oklch(0.72 0.19 195)` and p2 red-orange `oklch(0.72 0.19 23)`. Treat the values in `constants.ts` as the source of truth.

**Rule**: every player color pairs with a **player number badge** (`P1`, `P2`...) in JetBrains Mono. Color is reinforcement, not the sole signal. `[SHIPPED — PlayerBadge component]`

---

## 4. Typography Scale `[SHIPPED]`

| Role | Font | Size | Weight | Tracking |
|---|---|---|---|---|
| Hero (home) | Oxanium | `clamp(2.6rem, 6vw, 5.2rem)` | 600 | `-0.06em` |
| Page title | Oxanium | `1.9rem` | 600 | `-0.04em` |
| Status / turn | Oxanium | `0.95rem` | 700 | `0.16em` uppercase |
| Body | Oxanium | `0.95rem` | 400 | normal |
| Mono (coords, counts, timer) | JetBrains Mono | `0.8rem` | 500 | `0.02em` |
| Micro (hints) | Oxanium | `0.72rem` | 500 | `0.22em` uppercase, **min contrast 4.5:1** |

Kill the `text-white/12` hint. Anything below `--text-faint` is decoration, not communication.

> **Status**: Oxanium + JetBrains Mono are wired. The bottom hint was lifted from `white/12` to `rgba(255,255,255,0.42)` (≈ `--text-faint`). It is still 10px tracked-out caps doing first-time-user education work that the onboarding overlay now handles — candidate for removal or demotion, but the contrast floor is met.

---

## 5. Board Redesign

### 5.1 Sizing — cap at canonical `[SHIPPED]`

Replace `getRecommendedSize` viewport-fill logic:


This kills the 16×8-on-every-desktop problem.
### 5.1.1 Orientation-aware presets `[PARTIAL — detection shipped, persistence planned]`

Board orientation matches screen orientation. Detect via `window.innerWidth >= window.innerHeight` (landscape) vs `<` (portrait).

> **Status**: `getBoardPresets()` ships the correct preset list per orientation, and `getRecommendedSize()` picks the largest preset that fits at ≥56px cells. However, the **localStorage persistence** (`atomr:board-preset`) and the **`resize` / `orientationchange` re-evaluation listener** are NOT implemented. Manual overrides reset on reload, and rotating the device mid-session requires a reload to swap landscape↔portrait.

**Landscape (wide screens)** — cols > rows:
- `9×6` classic (default)
- `12×8`
- `14×10`
- `16×10` max

**Portrait (tall screens)** — rows > cols (transposed):
- `6×9` classic (default)
- `8×12`
- `10×14`
- `10×16` max

Auto-fit picks largest preset that fits at ≥`56px` cell in current orientation, else falls back to the classic size. If user rotates device, re-evaluate on `resize`/`orientationchange` only if no manual preset selected. `[PLANNED — listener not wired]`

User-selected preset sticks across reloads (localStorage `atomr:board-preset`), but orientation mode auto-swaps between landscape/portrait variant. `[PLANNED — localStorage key not written]`

### 5.2 Cell — five states, all readable `[SHIPPED]`

```
┌─────────────────────┐
│  P2            2/3  │   ← owner badge top-left, count/capacity top-right
│                     │
│      ◯  ◯           │   ← orbs
│                     │
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │   ← critical: dashed danger stripes on border
└─────────────────────┘
```

| State | Visual |
|---|---|
| Empty legal (your turn) | Subtle `--ok` tint + thin inset ring. Always visible, not hover-only. |
| Empty illegal | Flat `--surface-2`, inert. No ring. |
| Owned by you | Owner tint face + owner badge `P1` + orb(s) |
| Owned by enemy | Same but badge in enemy color, face slightly dimmer |
| Critical (self) | Owner ring + `--warn` dashed border + slow pulse |
| Critical (enemy) | Owner ring + `--danger` solid border + faster pulse + warning glyph |
| Threatened (my cell next to enemy critical) | Small `--warn` notch on the shared edge |
| Last move | White inset hairline (keep current) |
| Suggested (training) | Dashed outline in suggestion color (keep) |
| Exploding | White-hot flash → burst → ripple (keep + add pre-burst flash) |
| Captured | Brief owner-color flood → settle (keep) |

**Orb count number**: bottom-right `JetBrains Mono` `0.8rem` showing `count/capacity` (e.g. `2/3`). Always visible. Dot arrangement is the secondary cue. `[SHIPPED — CellCount]`

**Cell coordinate**: top-left, `JetBrains Mono` `0.7rem` `--text-faint`. Only visible on hover/focus, or always on for online matches (per `online-match-behavior.md`). `[PARTIAL — CellCoordinate exists; visibility caller-controlled, not always-on]`

### 5.3 Orb rendering `[SHIPPED]`

Replace flat circle with radial gradient:

```css
background: radial-gradient(circle at 35% 30%,
  oklch(0.96 0 0) 0%,
  var(--owner-color) 45%,
  color-mix(in srgb, var(--owner-color), black 35%) 100%);
box-shadow: 0 0 6px var(--owner-color)aa, 0 0 14px var(--owner-color)55;
```

Critical orbs: brighter, slightly larger, with a thin white hot core.

> **Status**: shipped as `.cr-orb-plasma` in `styles.css`, applied by `AtomRCell.tsx`.

---

## 6. HUD Redesign `[SHIPPED — except surrender/exit]`

Current reel-of-orbs is pretty but says nothing. Replace with an explicit turn bar:

```
┌─────────────────────────────────────────────────────────┐
│  ⌂   P1'S TURN · 00:24        ↺ undo  ⚙  ⌂            │
│      ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░                              │
└─────────────────────────────────────────────────────────┘
```

- **Left**: home icon
- **Center**: `P{n}'S TURN` in Oxanium, with the player's badge filled in their color. Below it, a thin progress bar that depletes over `30s` (online) or stays full (local). During cascade: replace with `RESOLVING…` + animated dots.
- **Right**: undo (if available), settings, surrender/exit `[PLANNED — surrender/exit NOT implemented]`
- **Player chips strip** (below or integrated): `P1 ● 12 orbs` `P2 ● 8 orbs` `P3 ● 0 ✗` — orb counts per player, eliminated players struck through

For >4 players, the strip scrolls horizontally; never replaces text with just colors.

> **Status**: shipped — `GameHud.tsx` renders `PlayerBadge` + `PLAYER N'S TURN` status text + `MM:SS` countdown + `TurnTimerBar` + `PlayerChipsStrip`. Right cluster has home / undo / rules / board. The **surrender/exit button is not implemented**; players back out via the home link.

### Mobile

- HUD collapses to a single row: `[⌂] [P1'S TURN · 24s] [⚙]`
- Undo becomes a long-press on the board, or a small `↺` icon with label on `≥480px`
- Player chips strip lives below the board, horizontally scrollable

> **Status**: HUD buttons are `h-11 w-11` with labels hidden under 480px (icon-only) and shown at ≥480px. Tap target meets 44pt. Long-press undo is not implemented (undo is a button).

---

## 7. Winner Overlay `[PARTIAL — stats line + loser chip planned]`

Keep current blur backdrop. Replace content:

```
        GAME OVER

        ██████████
        █ P1 WINS █
        ██████████

   18 orbs · 7 cascades · 24 moves

       [ play again ]   [ replay ]
```

- Big player name in player color + glow
- Subtitle: stats line (final orb count, longest cascade, move count)
- Two buttons: play again (primary, player color), replay (secondary)
- Loser chip shown smaller below, struck through

> **Status**: `GameOverlay.tsx` renders the winner name + glow, the play-again + replay buttons, and a stats line — but the stats line shows `{winnerOrbs} orbs · {moves} moves` only. The **longest-cascade count** and the **struck-through loser chip** are NOT implemented. `computeStats` has a TODO noting cascade length isn't derivable from the current `MoveRecord[]` history.

---

## 8. Home Page Redesign `[SHIPPED]`

Current: hero text + 2 CTAs + radial gradients. Generic.

New: **the board IS the hero**.

```
┌──────────────────────────────────────────────────────┐
│  AtomR                              [sign in]        │
│                                                       │
│   ┌─────────────────────┐    Turn-based cascading     │
│   │                     │    board tactics.           │
│   │   (live animated    │                             │
│   │    demo board,      │    Place orbs. Hit critical │
│   │    3×3 or 4×3,      │    mass. Convert the board  │
│   │    auto-playing     │    in one move.            │
│   │    a cascade loop)  │                             │
│   │                     │    ┌─────────┐              │
│   └─────────────────────┘    │  play › │              │
│                              └─────────┘              │
│                              how to play              │
└──────────────────────────────────────────────────────┘
```

- Left: a small live demo board (4×3) that auto-plays a cascade loop every ~6s. Real engine, real orbs. This IS the product preview.
- Right: title, one-sentence pitch, primary CTA, secondary link to rules
- No sidebar on home — top bar only (logo + auth)

This gives the page an identity. The game shows itself.

> **Status**: shipped — `src/routes/index.tsx` renders a `DemoBoard` using `useAtomRGame` on a 4×3 (landscape) / 3×4 (portrait) board that auto-plays random legal moves and resets on win. Top bar replaces the old sidebar.

---

## 9. Play (Mode Picker) Redesign `[SHIPPED]`

Current: 5 flat rows. No hierarchy.

New: **mode hierarchy by setup cost**.

```
┌──────────────────────────────────────────────────────┐
│  Play                                                  │
│                                                        │
│  ┌──────────────────────────┐  ┌──────────────────┐  │
│  │                            │  │ online            │  │
│  │  LOCAL                     │  │ quick match or   │  │
│  │  pass the device           │  │ private room      │  │
│  │  2–8 players · no signup    │  │ sign in required  │  │
│  │  ┌─────────┐               │  └──────────────────┘  │
│  │  │  start  │               │                         │
│  │  └─────────┘               │  ┌──────────────────┐  │
│  │                            │  │ vs cpu            │  │
│  └──────────────────────────┘  │ difficulty slider │  │
│                                 └──────────────────┘  │
│                                                        │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │ training          │  │ ai battle         │           │
│  │ ghost hints       │  │ watch bots play   │           │
│  └──────────────────┘  └──────────────────┘           │
└──────────────────────────────────────────────────────┘
```

- LOCAL is the primary card — largest, leftmost, no setup, no auth
- Online + vs CPU are secondary cards
- Training + AI battle are tertiary, smaller
- Each card has a mini board preview with a unique tint matching the mode

> **Status**: shipped — `src/routes/play.tsx` renders `PrimaryCard` (LOCAL) + `ModeCard` (others). Mini board previews per card are not implemented (icon + tint only).

---

## 10. Settings Modal Redesign `[SHIPPED]`

```
┌──────────────────────────────────┐
│  board settings              ×   │
│                                  │
│  presets                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐│
│  │ 9×6 │ │12×8 │ │14×10│ │16×10││
│  │classic│ │     │ │     │ │ max ││
│  └─────┘ └─────┘ └─────┘ └─────┘│
│                                  │
│  players                  2 ─●── 8 │
│  rows                     6 ──●── 12│
│  cols                     9 ──●── 16│
│                                  │
│  ┌──────────┐  ┌──────────────┐  │
│  │  cancel  │  │ apply & reset│  │
│  └──────────┘  └──────────────┘  │
└──────────────────────────────────┘
```

- **Presets first**. Most users want a quick pick, not a slider hunt.
- Sliders below for fine-tuning.
- Drop "USE RECOMMENDED SIZE" — the auto-sizer produces bad sizes, and presets cover the same ground.
- Active preset highlights when current `rows×cols` matches.

> **Status**: shipped — `GameSettings.tsx` renders 4 presets per orientation (active highlighted) + sliders (rows 3–12, cols 4–16, players 2–8, difficulty 1–10) + premoves and vibration toggles + apply & reset. "USE RECOMMENDED SIZE" is dropped.

---

## 11. Onboarding — First-Time Rules Overlay `[SHIPPED — except ?/R/U keyboard shortcuts]`

New users get a 3-step overlay on first board load (localStorage flag `atomr:onboarded`):

```
Step 1: place
┌──────────────────────────┐
│  1. place orbs           │
│  tap any empty cell.     │
│  you can also extend     │
│  your own cells.         │
│                          │
│  [ next ]      skip       │
└──────────────────────────┘

Step 2: critical mass
  shows a corner cell filling to 2/2 with a danger pulse

Step 3: cascade
  shows a small 3-cell chain auto-exploding
```

Three steps, ~10s total. Skip available. Never shows again.

A persistent `?` icon in the HUD re-opens the rules.

> **Status**: shipped — `OnboardingOverlay.tsx` renders 3 steps with skip, gated by `atomr:onboarded` localStorage. The `?` rules button in the HUD re-opens it (mouse/touch). The **`?` / `R` / `U` keyboard shortcuts** are NOT bound — only arrow-key board nav (`useBoardKeyboardNavigation`) and `Esc` to close modals.

---

## 12. Motion (refined) `[SHIPPED — except cr-cell-press]`

Keep the event-based playback system. Adjust timings per game-feel research:

| Event | Now | Rethink |
|---|---|---|
| Placement pulse | `cr-orb-pop 0.22s` | Keep. Add `cr-cell-press 0.09s` on the cell face. |
| Cascade step | ~0.18s | `0.22s` with `80ms` inter-step stagger |
| Capture flash | `0.16s` ripple | Keep + add `0.12s` owner-color flood |
| Pre-explosion flash | — | NEW: `0.08s` white-hot flash on exploder before burst |
| Turn transition | reel slide 0.38s | HUD turn text cross-fade 0.18s + bar reset |
| Winner reveal | immediate overlay | Delay 0.2s after last cascade, then 0.24s overlay fade |

**Reduced-motion**: `@media (prefers-reduced-motion: reduce)` → skip stagger, instant state changes, no pulse. Engine unaffected.

> **Status**: shipped — `cr-orb-pop`, `cr-orb-burst`, `cr-capture-ripple`, `cr-pre-burst-flash`, `cr-turn-fade`, `cr-timer-deplete` / `cr-timer-pulse`, and the `prefers-reduced-motion` block (zeroes durations, static strong border on `.cr-critical-ring`) are all in `styles.css`. **`cr-cell-press` is `[CSS READY, NOT WIRED]`**: the `@keyframes` and `.cr-cell-press` class exist but no cell applies the class, so taps have no press-squash animation.

---

## 13. Accessibility Fixes (non-negotiable) `[SHIPPED — except ?/R/U keyboard]`

1. **Turn label**: `aria-live="polite"` region announcing `Player N's turn` on every turn change `[SHIPPED]`
2. **Critical cells**: `aria-label` extended to include `critical` (already done in `AtomRCell.tsx` — keep, verify) `[SHIPPED]`
3. **Color contrast**: all text ≥ `4.5:1`. Kill `white/12`, `white/24` on text. Use `--text-faint` minimum. `[SHIPPED — bottom hint lifted to 0.42 alpha]`
4. **Focus ring**: every cell has a visible focus ring (already there — keep) `[SHIPPED]`
5. **Tap targets**: cells ≥ `44×44pt`. Board presets guarantee this on phone widths. `[SHIPPED — HUD buttons h-11 w-11]`
6. **Player badges**: `P1`, `P2` always visible somewhere (HUD + chips strip), not only color `[SHIPPED]`
7. **Reduced motion**: implemented per §12 `[SHIPPED]`
8. **Keyboard**: existing nav hook. Add a `?` shortcut for rules, `R` for reset, `U` for undo, `Esc` to close modals (already done). `[PARTIAL — arrow-key nav + Esc shipped; ?/R/U NOT bound]`

---

## 14. What I Will NOT Change

To keep the game playable and avoid scope creep:

- Engine, rules, move resolver
- `useAtomRGame` hook API
- Online match protocol (30s timeout, random legal move, queue freshness)
- Convex backend
- Auth flow
- PWA manifest/sw
- Existing tests (will update visual snapshots only if they break)

The rethink is a **presentational layer rewrite**: components in `src/features/atomr/components/*`, route components in `src/routes/*`, `src/styles.css`, and `src/components/Sidebar.tsx`. Hooks and engine stay.

> **Status**: held — engine, hook API, online protocol, Convex backend, auth flow, PWA manifest/sw are unchanged. `Sidebar.tsx` was rewritten in place as a `TopBar` (the filename is retained).

---

## 15. Implementation Phases

Ordered so the game stays playable after each phase.

### Phase 1 — Foundations `[SHIPPED]`
- Update `src/styles.css` with new design tokens, cell gradient, danger stripes, motion timings
- Build a `PlayerBadge` component (reusable)
- Build a `CellCoordinate` + `CellCount` sub-components
- Add `prefers-reduced-motion` handling

> **Status**: shipped, with the caveat that the §3 design-token set was NOT introduced — `styles.css` kept the legacy tokens and added component-local CSS (`.cr-*` classes) instead.

### Phase 2 — Board & Cell `[SHIPPED]`
- Rewrite `AtomRCell.tsx` with: always-visible legal hint, owner badge, count/capacity label, critical danger stripes, radial orb gradient
- Rewrite `AtomRBoard.tsx` to use new cell + cap auto-size at canonical presets
- Add `getRecommendedSize` v2 returning preset-based sizing

### Phase 3 — HUD `[SHIPPED]`
- Rewrite `GameHud.tsx`: explicit turn label, timer bar, player chips strip with orb counts
- Keep TurnReel as a secondary accent (optional), not the primary signal
- Mobile collapse behavior

> **Status**: shipped — the TurnReel was removed entirely (not kept as a secondary accent); the turn bar is the sole signal.

### Phase 4 — Overlays & Settings `[SHIPPED]`
- Rewrite `GameOverlay.tsx` with stats line
- Rewrite `GameSettings.tsx` with presets first
- Build the 3-step onboarding overlay (`OnboardingOverlay.tsx`)
- Add `?` rules button to HUD

> **Status**: shipped — see §7 for the stats-line gap (longest cascade + loser chip planned).

### Phase 5 — Routes `[SHIPPED]`
- Rewrite `src/routes/index.tsx` with live demo board
- Rewrite `src/routes/play.tsx` with mode hierarchy
- Simplify `src/components/Sidebar.tsx` (or remove on home, integrate into top bar)
- Consistent top bar across non-game routes

### Phase 6 — Polish `[PLANNED]`
- Sound effects (optional, gated by mute toggle from day one) — locked NO per §16.1; vibration shipped instead
- Install-prompt UI for PWA — NOT implemented
- Micro-interactions (button presses, hover states) — `cr-cell-press` CSS ready, not wired (§12)
- Final contrast audit — bottom hint meets floor; remaining `white/12`-style text was lifted

---

## 16. Decisions (locked)

> **Status**: the duplicate "Open Questions" heading above this section was a leftover from the planning doc. The questions are closed; this section records what was actually decided vs what remains open.

1. **Sound**: NO sound. Vibration OK via Web Vibration API, subtle and pleasant only (placement `10–20ms`, capture `30–50ms`, winner short confirm). Skip if API unavailable. Toggle in settings from day one. `[SHIPPED — vibration toggle in GameSettings; no sound assets]`
2. **Sidebar**: remove on non-game routes. Top bar only across `/`, `/play`, sign-in/up. Keep the game routes no-chrome as today. `[SHIPPED — Sidebar.tsx exports TopBar; __root renders it on non-no-chrome routes]`
3. **Onboarding**: dismissable "first time?" prompt on first board load. Not forced. localStorage flag `atomr:onboarded`. `[SHIPPED — OnboardingOverlay.tsx]`
4. **Board presets**: `9×6 / 12×8 / 14×10 / 16×10` — orientation-aware variants per §5.1.1 (transposed for portrait screens). `[SHIPPED — presets in GameSettings + getRecommendedSize; localStorage persistence PLANNED]`
5. **Home demo board**: real engine looping. Use `useAtomRGame` with a small board (`4×3` landscape / `3×4` portrait) and an interval that plays random legal moves, reseting on win. `[SHIPPED — DemoBoard in routes/index.tsx]`

### Still open (not in the original locked list, surfaced by the rewrite)

- Introduce the §3 design-token set in `styles.css` (currently legacy tokens + inline literals).
- Persist board preset across reloads (`atomr:board-preset`) and re-evaluate on `resize` / `orientationchange`.
- Add the surrender/exit button to the HUD.
- Add longest-cascade + loser chip to `GameOverlay` (requires extending `MoveRecord[]` to capture cascade depth).
- Bind `?` / `R` / `U` keyboard shortcuts.
- Wire `cr-cell-press` on cell tap.
- Surface a PWA install-prompt affordance.
