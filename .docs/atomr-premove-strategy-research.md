# AtomR Premove Strategy Research

## Purpose

Figure out whether AtomR should support premoves, how a Chess.com-style premove system actually behaves, what users will expect from it, and what the right product and engineering shape is for AtomR.

This research is based on:

- the current AtomR codebase
- Chess.com's published premove behavior
- public discussion of premove strategy and failure modes
- practical UX judgment about what will feel fair and predictable in AtomR

## Bottom Line

AtomR should support premoves, but only as a **single queued move by default**, controlled by a **user preference**, with strict execution rules.

The most important rule is this:

- a premove should execute only if it is still legal when the player's turn arrives
- otherwise it should silently fail, clear itself, and give lightweight feedback

For AtomR, this is safer than a multi-step queue because the board can change dramatically after each explosion chain. A deep premove queue that works well in chess becomes fragile and confusing in a chain-reaction game.

So the recommended v1 direction is:

1. add a user preference to enable premoves
2. support exactly one queued premove at a time
3. let the player set or replace it during the opponent's turn
4. auto-execute it immediately when the turn flips, if still legal
5. auto-clear it if the move becomes illegal or irrelevant
6. show a very clear queued-cell indicator and a short success/failure acknowledgment

This gives the user the main benefit they want, "just do my next obvious move instantly," without importing the worst complexity of chess-style multi-premoves.

## What Chess.com Does

Chess.com defines a premove as a move set up during the opponent's turn that executes automatically once it becomes your turn, independent of the exact opponent move, as long as the premove is still legal.

Published Chess.com behavior:

- premoves must be enabled in settings
- while it is not your turn, you can enter a move normally and it becomes queued
- the destination square is visually marked
- premoves auto-play when your turn arrives
- if a queued premove is illegal, it is canceled automatically
- right click cancels premoves on desktop
- Chess.com supports multiple queued premoves on desktop
- Chess.com does not support multiple premoves on mobile
- each premove costs `0.1s` in Chess.com chess

Source:

- `https://www.chess.com/terms/premove-chess`

## Why Chess.com's Model Works In Chess

Chess has two important properties that help premoves:

1. board state changes are discrete and relatively local per move
2. players often have forcing recaptures or obvious continuation moves

That means a chain of premoves can be rational in bullet chess, especially in:

- recapture sequences
- mating nets
- forced king chases
- trivial technical endgames

AtomR is different.

## What Strong Chess Advice Reveals About Premove UX

One of Hikaru Nakamura's bullet rules is especially important:

- never assume when premoving

The practical advice is:

- premove only when the move is safe even under uncertainty
- avoid premoves that depend on one exact opponent response if other responses can leave the queued move legal but bad

Source:

- `https://www.chess.com/article/view/7-bullet-chess-tips-by-hikaru`

This matters even more for AtomR than for chess.

In AtomR, the board can change not just by one enemy move, but by:

- a placement
- one or more explosions
- chain captures
- turn ownership changes in surrounding cells

So the cost of a bad assumption is often much higher than in chess.

## Important Difference Between Chess And AtomR

## Chess premoves are often tactical shortcuts

In chess, premoves are often about:

- recapturing
- forcing checks
- simplifying known lines
- saving clock in highly constrained positions

## AtomR premoves would be mostly confidence bets

In AtomR, a premove is usually saying:

- "I believe this cell will still be my best legal move after your turn resolves"

That makes premoves in AtomR less like combo-entry and more like a confidence shortcut.

That difference should shape the feature.

## What Users Will Expect

If AtomR exposes a premove toggle, users will expect:

1. they can set a move while waiting
2. the queued move is visually obvious
3. they can change their mind easily
4. the premove fires instantly when legal
5. the premove never fires if it has become illegal
6. the system never hides what happened

They will also expect the feature to be optional.

This is consistent with Chess.com, where premoves are gated behind a setting, not simply forced on every player.

## Recommendation: Preference-Gated, Off By Default

Premove should be a user preference, not a mandatory baseline mechanic.

Why:

- many players will never want automation during the opponent turn
- accidental queued moves are frustrating if the user did not knowingly opt in
- the feature is more valuable to fast or experienced players than to first-time players
- AtomR already has a visually busy board, so accidental hidden state would be bad UX

Recommended preference label:

- `Enable premoves`

Recommended helper copy under the toggle:

- `Queue one move during the opponent turn. It plays automatically if still legal.`

## Recommendation: Single Premove Only

AtomR should support exactly one queued premove in v1.

This is the most important product recommendation in this document.

### Why Not Multiple Premoves

Multiple premoves work better in chess because many sequences remain meaningful move-to-move.

In AtomR, after one move resolves:

- ownership can flip
- counts can change across several cells
- criticality can change across several cells
- a second queued move may become strategically nonsense even if still legal

So a queue of two or more premoves would often be:

- hard to trust
- hard to explain
- easy to forget
- easy to misfire in ways that feel unfair rather than skillful

Single-premoves preserve the core user story without that complexity.

## Recommendation: Replace, Don't Stack

If a player already has a premove queued and selects a new cell, the new premove should replace the old one.

This is cleaner than asking the player to manually clear first.

Useful desktop behavior:

- clicking the same queued cell again clears it
- clicking a different legal target replaces it
- `Escape` clears the premove

Useful mobile behavior:

- tapping a queued cell again clears it
- tapping another legal target replaces it

## Recommendation: Only Allow Queueing During Opponent Turn

A premove should only exist when:

- premoves are enabled in preferences
- the player is in a mode where turn ownership matters
- it is not currently their turn
- the game is not over
- no settings/replay/game-over overlay is open

This means premoves are mainly relevant for:

- online match play
- possibly local hot-seat if desired later

Premoves are probably not useful in:

- AI battle
- replay
- game-over states

For local play, premoves are optional product scope. They are not necessary for v1.

## Recommendation: Queue Only Moves Legal On The Current Board Snapshot

This is subtle but important.

The player should only be allowed to queue a premove on a cell that is legal at queue time.

Meaning:

- empty cells can be queued
- cells currently owned by the player can be queued
- enemy-owned cells cannot be queued

Why this is better:

- the player receives immediate validation at queue time
- the UI stays consistent with the board's current legality model
- you avoid speculative queueing onto an enemy cell that might later become legal

This keeps premoves predictable.

## Execution Rule

When the player's turn arrives, the premove should execute immediately only if all of these are still true:

1. the queued move still exists
2. the queued move is still legal on the current resolved board
3. the player is still allowed to act
4. the match is still active
5. no blocking overlay is open locally

If any of those fail:

- clear the premove
- do not retry it later
- optionally announce a short non-intrusive message like `Premove cleared`

## Recommendation: Never Queue During Cascade Playback

If the local client is still animating the opponent's move resolution, the player should not be able to queue a premove yet.

Why:

- the board is not visually settled
- users need to see the actual final state before committing a confidence move
- queueing during animation encourages exactly the kind of bad assumption Hikaru warns against

Practical rule:

- allow premove only after the local playback reaches the final resolved board state for the opponent move

That will feel more honest and readable.

## Recommendation: Premove Fires On The Resolved Board, Not The Optimistic One

AtomR already uses server-authoritative online moves with local optimistic display.

The premove decision should be checked against the resolved authoritative board state that exists when the turn becomes yours, not against a guessed local continuation.

This is critical for trust.

## Visual Design Recommendation

Queued premoves need their own visual language.

Do not reuse:

- focus ring
- suggestion ring
- last move ring
- blocked feedback ring

Recommended queued-premove signal:

- thin dashed ring or corner brackets
- a distinct color not already used by ownership or focus
- slight pulsing is acceptable, but keep it restrained

What matters most:

- it must remain visible during board updates
- it must not be confused with "recommended move" or "last move"

## Interaction Model Recommendation

## Desktop

Recommended v1 model:

- if it is your turn: click places immediately
- if it is opponent turn and premoves are enabled: click queues a premove instead
- clicking the queued cell again clears it
- clicking another legal cell moves the queue
- `Escape` clears the queue

Optional later shortcut:

- modifier-assisted queueing while it is your turn should not exist in v1

Keep the model simple.

## Mobile

Recommended v1 model:

- same tap behavior as desktop
- one queued move only
- no long-press requirement in v1 unless accidental queueing proves common in testing

If accidental queueing is a problem on touch, the fallback design is:

- tap once to select during opponent turn
- tap a visible `queue premove` affordance to confirm

But this should only be added if needed. It is better to start lighter.

## Feedback Recommendation

There are three important states to communicate:

1. `Premove queued`
2. `Premove played`
3. `Premove cleared`

These should be subtle.

Good candidates:

- live-region announcement
- tiny transient HUD text near the timer or board
- queue marker disappearing on success or failure

Bad candidate:

- large toast every time

The feature is fast-path UX, so feedback should be quick and low-friction.

## Fairness And Product Risk

Premoves are accepted in online chess culture, but they still come with fairness conversations.

The biggest fairness risks in AtomR are not cheating concerns. They are clarity concerns:

- users forgetting they have a premove queued
- users misunderstanding why a queued move disappeared
- users feeling the app made a move they no longer wanted

So the design should optimize for visible state and easy cancellation.

## Recommendation: Clear On Any Major Context Change

The queued premove should clear automatically when:

- the player disables premoves in preferences
- settings opens
- replay opens
- game ends
- player resigns
- route changes
- viewer role changes
- local auth/session changes for online play

This avoids hidden stale state.

## Which Modes Should Support It

## Online match

Yes. This is the primary mode where premoves make sense.

Because online play is server-authoritative, a real premove experience here likely needs server-backed support if it is meant to survive latency and "just work" reliably.

## Human vs AI

Maybe later.

It can work locally, but it is less necessary because AI turns are already local client state and users are not under network-latency pressure in the same way.

## Local hot-seat

Probably no for v1.

Hot-seat is not the natural target for premoves. It can even create confusion when sharing one device.

## Replay / AI battle

No.

These should remain inert.

## Key Engineering Constraint In This Repo

Online move submission currently goes through Convex mutation calls from `src/routes/play/match.$matchId.tsx`.

That means a true premove system for online play cannot just be a local UI flourish if the promise is that premoves "just work."

If the client simply stores a local premove and waits to submit when it notices the turn changed, then:

- network delay can make the move slower than expected
- race conditions can happen if both clients react after the turn flip
- reconnect behavior becomes messy

So for serious online premove support, the strongest architecture is:

1. client queues premove locally for visibility
2. client also sends premove intent to server
3. server validates and stores at most one premove for that player
4. when turn ownership changes, server checks queued premove immediately
5. if still legal, server applies it as the next move atomically
6. server clears the queue either way

This is the version that truly "just works."

## Why Server-Backed Matters

Server-backed premoves give you:

- atomic legality check at the moment the turn changes
- correct behavior across latency spikes
- correct behavior across tab refresh/reconnect
- correct behavior if the player's client is briefly suspended or backgrounded

Without server support, the feature will feel best-effort rather than authoritative.

## Recommended Data Model For Online Premove

At the match level, likely something like:

- `queuedPremoves.p1?: { row, col, queuedAtTurn, queuedAtMs }`
- `queuedPremoves.p2?: { row, col, queuedAtTurn, queuedAtMs }`

Important fields:

- row
- col
- player id
- turn number when queued
- maybe a client sequence id for UI reconciliation

Important rule:

- one queued premove per player max

## Recommended Server Rules

When accepting a queued premove:

- reject if match is over
- reject if it is already the player's turn
- reject if cell is currently illegal
- replace any existing premove for that player

When processing after opponent move resolution:

- if queued move is legal, apply immediately as that player's turn move
- record it in move history like a normal move
- mark that it came from premove for analytics/debugging if useful
- clear the premove after attempt

## Recommendation: No Deep Queue In Online V1

Even if Chess.com allows many premoves, AtomR should not for online v1.

One queued move is enough to capture the main benefit:

- reclaim reaction time on obvious follow-ups
- let users act during downtime
- reduce frustration in timed turns

Anything beyond that magnifies complexity faster than value in this game.

## Preference Placement Recommendation

AtomR currently has a per-match `GameSettings` dialog, not a true persistent user preferences system.

Because the user asked for a preference, the real product implication is:

- AtomR needs a persistent user preference layer, at least for gameplay toggles

For v1, the smallest useful product shape is:

- add a persistent gameplay preferences store using localStorage on the client
- expose `Enable premoves` there

Longer term, if online account preferences already have a natural storage path in Convex, the preference could be server-synced.

But local persistence is enough for first rollout.

## Recommended Preference Scope

Suggested initial preference object:

- `enablePremoves: boolean`

Possible later neighbors:

- `confirmPremoveOnTouch: boolean`
- `showPremoveNotifications: boolean`

Do not overbuild this in v1.

## Suggested V1 Product Spec

1. Add `Enable premoves` to persistent gameplay preferences.
2. Premoves are supported in online matches only.
3. Only one premove can be queued at a time.
4. Queueing is allowed only during opponent turn after the board is visually settled.
5. Queueing another premove replaces the current one.
6. Clicking or tapping the same queued cell clears it.
7. `Escape` clears the premove on desktop.
8. A queued premove has a distinct visual marker.
9. When the player's turn begins, the premove executes automatically if still legal.
10. If illegal, it clears immediately with subtle feedback.
11. Opening settings/replay or ending the game clears the premove.
12. The online implementation should be server-backed if the goal is reliable execution.

## Suggested Non-Goals For V1

- multi-step premove queue
- premoves in replay or AI battle
- speculative premoves on currently illegal cells
- queueing during opponent animation playback
- highly animated toasts or noisy confirmations

## Validation Questions For Implementation

Manual product checks:

1. Can a user tell at a glance whether a premove is currently queued?
2. Is it obvious how to clear or replace a queued premove?
3. Does a failed premove feel understandable rather than buggy?
4. Does a successful premove feel immediate enough to justify the feature?
5. Does the feature remain trustworthy under reconnects and latency?
6. Is the queued marker visually distinct from focus, last move, and AI suggestion states?

## AtomR-Specific Strategic Guidance

The right mental model to communicate to users is not:

- "combo queue"

It is:

- "queue your next confident move"

That framing matches the actual nature of AtomR much better.

Good use cases in AtomR will usually be:

- obvious recapture-equivalent responses
- reinforcing a stable owned cell you were already planning to play
- time-scramble moves where the local tactical picture is unlikely to change your intent

Bad use cases will be:

- volatile areas near critical enemy cells
- positions likely to explode and swing ownership broadly
- speculative responses to one exact assumed opponent action

## Sources

- Chess.com premove explainer: `https://www.chess.com/terms/premove-chess`
- Hikaru on bullet premove risk: `https://www.chess.com/article/view/7-bullet-chess-tips-by-hikaru`
- Chess Stack Exchange on premove time advantage and forcing lines: `https://chess.stackexchange.com/questions/19799/premove-techniques`
- Lichess discussion references on premove differences and multi-premove expectations: `https://lichess.org/forum/general-chess-discussion/features-we-users-need-in-lichess-`
- Lichess discussion on mobile/desktop premove differences: `https://lichess.org/forum/lichess-feedback/the-mobile-app-has-major-issues--should-we-address-them`

## Repo-Specific References

- Online match route and move submission: `src/routes/play/match.$matchId.tsx`
- Current board interaction surface: `src/features/atomr/components/AtomRBoard.tsx`
- Cell rendering and overlays: `src/features/atomr/components/AtomRCell.tsx`
- Existing settings dialog: `src/features/atomr/components/GameSettings.tsx`
- Local/AI/Training screens that would need mode-scoped behavior if expanded later:
  - `src/features/atomr/components/LocalPlayScreen.tsx`
  - `src/features/atomr/components/AiPlayScreen.tsx`
  - `src/features/atomr/components/TrainingPlayScreen.tsx`
  - `src/features/atomr/components/AiBattleScreen.tsx`
