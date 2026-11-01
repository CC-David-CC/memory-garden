# Memory Garden

Memory Garden is a seeded, single-player matching game with 6-, 8- and
12-pair gardens. It is a flat-screen app and does not require XR.

Use **Resume** to start active time, reveal two tiles at a time, and match all
creature pairs. Mismatches close after a short active-time delay; pausing,
changing desktop focus, minimizing, rolling up or leaving the tab freezes that
delay. Restarting asks before discarding unsaved progress.

Open and Save use the signed-in desktop's **My files**. Saves are `.game.json`
logical snapshots containing the tile order, matched and revealed tiles,
mismatch time, moves and active time. Loading validates the entire replacement
before committing it and always restores paused. Computer imports belong in
Files and are not exposed by this app.

The final `memory-creatures.riv` artwork is not available. The app uses original
procedural creature glyphs and labels the fallback. `src/rive/contract.mjs`
records the required `Main` artboard, `Presentation` state machine, properties,
triggers and visual states for later replacement. The fallback does not satisfy
the Rive acceptance gate.

Run the rules test with:

```sh
npm test --prefix apps/games/04-rive-interactives/memory-garden
```

The browser and account tests cover desktop/phone interaction, mismatch pause,
save during mismatch, close/reopen, invalid files and cleanup. Physical-device
touch, final artwork and performance measurements remain unverified.
