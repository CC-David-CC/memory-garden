# memory-garden: source migration, integration pending

Original source: `apps/games/04-rive-interactives/memory-garden/` at `4f72ea86928666189b32f6f05c2c697a37341d06`.
Mechanical baseline: `b6d5869cdcf334cc9e2a0de8651d2de3399092ac`; source tree `14b3dab45b5fd9ac7dcdc05bfb1b6848311761a7`.
All 16 current files retain the exact original Git blobs/modes. Owned historical paths, designs and WIP were retained; original complete history and source-to-extracted commit maps remain in private migration recovery. Copied generic helpers/tooling do not make another game's entire history part of this app.

This commit adds only generated-output exclusions and this provenance note. It changes no app behavior. The original host/files/save lifecycle remains source reference and needs a deliberate port to the new assembly. Source presence does not enable this app or establish server-backed save compatibility, agent operations, immersive-session behavior or complete build assets.

Existing configured checks passed in an isolated copy with the original sibling layout. Independent extraction checks are recorded privately. Configured test/typecheck results are recorded separately from browser/host integration.

Dependency locks and tracked artwork/license notices remain authoritative inputs. Third-party dependencies keep their own licenses. Generated artifacts must be built and verified independently; do not copy a production bundle or user documents into this repository.
