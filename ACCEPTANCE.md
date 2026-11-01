# Acceptance — Memory Garden

**All runtime cases are NOT RUN.** This file is a plan; document checks are not gameplay evidence.

Apply all C01–C24 in [common acceptance](../../docs/ACCEPTANCE-COMMON.md). No immersive support is claimed or required for this flat-screen app.

## Game-specific cases

| ID | Experiment / invariant | Status |
|---|---|---|
| memory-garden-G01 | One tile cannot match itself. | not_run |
| memory-garden-G02 | Third tap while resolving cannot reveal a third tile. | not_run |
| memory-garden-G03 | Mismatched timeout pauses in background. | not_run |
| memory-garden-G04 | Save during mismatch preserves pending pair and remaining time. | not_run |
| memory-garden-G05 | Independent tile artboards do not share mutable state. | not_run |
| memory-garden-G06 | Restart cancels old reveal callbacks. | not_run |

## Release evidence

Record rules/content and dependency versions, actual asset names/hashes, desktop browser, real phone and (where required) Galaxy XR build, commands/logs, complete-playthrough result, save restoration result, multiwindow/late-disposal behavior, frame timing and unresolved defects. Exercise actual Rive properties and texture input rather than substituting an HTML mock.

A pure rules unit test, a visual smoke test and a hardware XR test are different evidence. Preserve that distinction. All promised features must be demonstrated or explicitly left incomplete; do not relabel a generic engine scene as the finished game.
