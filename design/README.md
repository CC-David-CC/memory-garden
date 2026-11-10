> Original design reference from 2026-10-30. This describes intended behavior, not current implementation or qualification. The current app README is authoritative for status. Pseudocode and template JSON here are documentation, not build entries.

# Memory Garden

**Animated memory puzzle · Rive web runtime + application state · single-player · phone required · flat-screen app**

> Planned design, not implemented or browser-tested. `index.pseudo.mjs` is an explanatory entry point, not a playable game.

## Experience

Reveal little animated creatures, remember their positions and clear a compact board of matching pairs.

## What this demonstrates

- Multiple Rive instances/artboards in one surface
- Per-tile state and animation timing
- Responsive board layout

## Rules and complete loop

- Seeded paired deck; reveal at most two eligible tiles. Match identity is app state, not sprite equality.
- A mismatch remains visible for a short active-time interval, then closes. Input during resolution is explicitly gated.
- Win when every pair is matched; timers and scores are local only.

## Bounded polished release

Three board sizes, twelve original creature motifs and untimed practice.

- Animation reveals never obscure tile identity
- Large phone tiles and keyboard focus path
- Reduced-motion instant flips

No multiplayer, accounts, server simulation or generic editor is required. Start, rules/help, play/activity, pause, outcome/goal feedback and retry must all be complete. Settings include volume/mute, reduced motion, contrast and game-specific options where meaningful. State changes occur in the game model; animations illustrate them.

## Rive inside this app

Creature faces and flips, ideally sharing immutable asset bytes while each tile has its own state. The requested asset is `memory-creatures.riv`; it is **not included**. See [RIVE.md](RIVE.md) for the authoring/integration contract. A placeholder or unrelated animated logo does not satisfy this requirement.

## Save behavior

Exact logical board and mismatch timer, independent of animation frame. See [SAVE.md](SAVE.md). Loading starts paused; resume is explicit. Restart and load cancel stale callbacks and any owned AI work.

## Build sequence

Implement the rule loop in [gameplay.pseudo.txt](gameplay.pseudo.txt); bind the exact app lifecycle from [index.pseudo.mjs](index.pseudo.mjs); complete [CONTROLS.md](CONTROLS.md); author/integrate [RIVE.md](RIVE.md); then satisfy [ACCEPTANCE.md](ACCEPTANCE.md). Do not add XR or a 3D engine solely to widen the technology list.

Target wave: **3**. Integrator first reads [AGENTS.md](../../../../../docs/games/design-reference/ORIGINAL-INSTRUCTIONS.md); do not guess host APIs from symbolic helper names.

Use original/licensed artwork and audio. Keep the scope small enough to polish; expand content only after the release gates pass.
