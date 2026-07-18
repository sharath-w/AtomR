# AtomR — UI Rethink

Opinionated redesign. Goal: give AtomR a real identity, fix the readability gaps from `.docs/app-behavior.md`, and keep the game playable end-to-end.

Engine, rules, hook, online behavior — untouched. This doc is about what the player sees and touches.

---

## 1. Design Principles

1. **Tension before reward.** Every visual cue either builds anticipation or releases it. Nothing decorative for its own sake.
2. **State over styling.** If a visual choice doesn't tell you whose turn, what's legal, what's dangerous, or what just happened — cut it.
3. **Color is never the only signal.** Pair every hue with shape, label, or position.
4. **One board, one focal point.** The board is the product. Everything else is scaffolding.
5. **Identity from the game itself.** AtomR is about critical mass and cascades. The UI should look like a reactor instrument, not a generic dark dashboard.

---

## 2. Aesthetic Direction: "Reactor"

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

---

## 3. Color System (revised)

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

**Rule**: every player color pairs with a **player number badge** (`P1`, `P2`...) in JetBrains Mono. Color is reinforcement, not the sole signal.

---

## 4. Typography Scale

| Role | Font | Size | Weight | Tracking |
|---|---|---|---|---|
| Hero (home) | Oxanium | `clamp(2.6rem, 6vw, 5.2rem)` | 600 | `-0.06em` |
| Page title | Oxanium | `1.9rem` | 600 | `-0.04em` |
| Status / turn | Oxanium | `0.95rem` | 700 | `0.16em` uppercase |
| Body | Oxanium | `0.95rem` | 400 | normal |
| Mono (coords, counts, timer) | JetBrains Mono | `0.8rem` | 500 | `0.02em` |
| Micro (hints) | Oxanium | `0.72rem` | 500 | `0.22em` uppercase, **min contrast 4.5:1** |

Kill the `text-white/12` hint. Anything below `--text-faint` is decoration, not communication.

---

## 5. Board Redesign

### 5.1 Sizing — cap at canonical

Replace `getRecommendedSize` viewport-fill logic:


This kills the 16×8-on-every-desktop problem.
### 5.1.1 Orientation-aware presets

Board orientation matches screen orientation. Detect via `window.innerWidth >= window.innerHeight` (landscape) vs `<` (portrait).

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

Auto-fit picks largest preset that fits at ≥`56px` cell in current orientation, else falls back to the classic size. If user rotates device, re-evaluate on `resize`/`orientationchange` only if no manual preset selected.

User-selected preset sticks across reloads (localStorage `atomr:board-preset`), but orientation mode auto-swaps between landscape/portrait variant.
### 5.2 Cell — five states, all readable

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

**Orb count number**: bottom-right `JetBrains Mono` `0.8rem` showing `count/capacity` (e.g. `2/3`). Always visible. Dot arrangement is the secondary cue.

**Cell coordinate**: top-left, `JetBrains Mono` `0.7rem` `--text-faint`. Only visible on hover/focus, or always on for online matches (per `online-match-behavior.md`).

### 5.3 Orb rendering

Replace flat circle with radial gradient:

```css
background: radial-gradient(circle at 35% 30%,
  oklch(0.96 0 0) 0%,
  var(--owner-color) 45%,
  color-mix(in srgb, var(--owner-color), black 35%) 100%);
box-shadow: 0 0 6px var(--owner-color)aa, 0 0 14px var(--owner-color)55;
```

Critical orbs: brighter, slightly larger, with a thin white hot core.

---

## 6. HUD Redesign

Current reel-of-orbs is pretty but says nothing. Replace with an explicit turn bar:

```
┌─────────────────────────────────────────────────────────┐
│  ⌂   P1'S TURN · 00:24        ↺ undo  ⚙  ⌂            │
│      ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░                              │
└─────────────────────────────────────────────────────────┘
```

- **Left**: home icon
- **Center**: `P{n}'S TURN` in Oxanium, with the player's badge filled in their color. Below it, a thin progress bar that depletes over `30s` (online) or stays full (local). During cascade: replace with `RESOLVING…` + animated dots.
- **Right**: undo (if available), settings, surrender/exit
- **Player chips strip** (below or integrated): `P1 ● 12 orbs` `P2 ● 8 orbs` `P3 ● 0 ✗` — orb counts per player, eliminated players struck through

For >4 players, the strip scrolls horizontally; never replaces text with just colors.

### Mobile

- HUD collapses to a single row: `[⌂] [P1'S TURN · 24s] [⚙]`
- Undo becomes a long-press on the board, or a small `↺` icon with label on `≥480px`
- Player chips strip lives below the board, horizontally scrollable

---

## 7. Winner Overlay

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

---

## 8. Home Page Redesign

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

---

## 9. Play (Mode Picker) Redesign

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

---

## 10. Settings Modal Redesign

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

---

## 11. Onboarding — First-Time Rules Overlay

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

---

## 12. Motion (refined)

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

---

## 13. Accessibility Fixes (non-negotiable)

1. **Turn label**: `aria-live="polite"` region announcing `Player N's turn` on every turn change
2. **Critical cells**: `aria-label` extended to include `critical` (already done in `AtomRCell.tsx` — keep, verify)
3. **Color contrast**: all text ≥ `4.5:1`. Kill `white/12`, `white/24` on text. Use `--text-faint` minimum.
4. **Focus ring**: every cell has a visible focus ring (already there — keep)
5. **Tap targets**: cells ≥ `44×44pt`. Board presets guarantee this on phone widths.
6. **Player badges**: `P1`, `P2` always visible somewhere (HUD + chips strip), not only color
7. **Reduced motion**: implemented per §12
8. **Keyboard**: existing nav hook. Add a `?` shortcut for rules, `R` for reset, `U` for undo, `Esc` to close modals (already done).

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

---

## 15. Implementation Phases

Ordered so the game stays playable after each phase.

### Phase 1 — Foundations
- Update `src/styles.css` with new design tokens, cell gradient, danger stripes, motion timings
- Build a `PlayerBadge` component (reusable)
- Build a `CellCoordinate` + `CellCount` sub-components
- Add `prefers-reduced-motion` handling

### Phase 2 — Board & Cell
- Rewrite `AtomRCell.tsx` with: always-visible legal hint, owner badge, count/capacity label, critical danger stripes, radial orb gradient
- Rewrite `AtomRBoard.tsx` to use new cell + cap auto-size at canonical presets
- Add `getRecommendedSize` v2 returning preset-based sizing

### Phase 3 — HUD
- Rewrite `GameHud.tsx`: explicit turn label, timer bar, player chips strip with orb counts
- Keep TurnReel as a secondary accent (optional), not the primary signal
- Mobile collapse behavior

### Phase 4 — Overlays & Settings
- Rewrite `GameOverlay.tsx` with stats line
- Rewrite `GameSettings.tsx` with presets first
- Build the 3-step onboarding overlay (`OnboardingOverlay.tsx`)
- Add `?` rules button to HUD

### Phase 5 — Routes
- Rewrite `src/routes/index.tsx` with live demo board
- Rewrite `src/routes/play.tsx` with mode hierarchy
- Simplify `src/components/Sidebar.tsx` (or remove on home, integrate into top bar)
- Consistent top bar across non-game routes

### Phase 6 — Polish
- Sound effects (optional, gated by mute toggle from day one)
- Install-prompt UI for PWA
- Micro-interactions (button presses, hover states)
- Final contrast audit

---

## 16. Open Questions (need your call)

## 16. Decisions (locked)

1. **Sound**: NO sound. Vibration OK via Web Vibration API, subtle and pleasant only (placement `10–20ms`, capture `30–50ms`, winner short confirm). Skip if API unavailable. Toggle in settings from day one.
2. **Sidebar**: remove on non-game routes. Top bar only across `/`, `/play`, sign-in/up. Keep the game routes no-chrome as today.
3. **Onboarding**: dismissable "first time?" prompt on first board load. Not forced. localStorage flag `atomr:onboarded`.
4. **Board presets**: `9×6 / 12×8 / 14×10 / 16×10` — orientation-aware variants per §5.1.1 (transposed for portrait screens).
5. **Home demo board**: real engine looping. Use `useAtomRGame` with a small board (`4×3` landscape / `3×4` portrait) and an interval that plays random legal moves, reseting on win.
