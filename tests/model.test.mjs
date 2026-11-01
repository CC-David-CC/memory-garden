import assert from "node:assert/strict";
import {MemoryGardenSession, MOTIFS, SIZES, decodeSave, encodeSave} from "../model.mjs";

const session = new MemoryGardenSession({seed: "test", size: "practice"});
assert.equal(session.tiles.length, 12);
assert.equal(session.paused, true);
assert.equal(session.reveal(0).kind, "ignored");
session.resume();
const [first, second] = session.tiles;
assert.equal(session.reveal(0).kind, "reveal");
assert.equal(session.reveal(0).kind, "ignored", "one tile cannot match itself");
const pair = session.tiles.findIndex((tile, index) => index !== 0 && tile.motif === first.motif);
assert.equal(session.reveal(pair).kind, "match");
assert.equal(session.matched.size, 2);

let mismatchA = -1;
let mismatchB = -1;
for (let left = 0; left < session.tiles.length; left++) {
  if (session.matched.has(left) || session.revealed.includes(left)) continue;
  for (let right = left + 1; right < session.tiles.length; right++) {
    if (session.matched.has(right) || session.tiles[left].motif === session.tiles[right].motif) continue;
    mismatchA = left;
    mismatchB = right;
    break;
  }
  if (mismatchA >= 0) break;
}
session.reveal(mismatchA);
assert.equal(session.reveal(mismatchB).kind, "mismatch");
const third = session.tiles.findIndex((_, index) => index !== mismatchA && index !== mismatchB && !session.matched.has(index));
assert.equal(session.reveal(third).kind, "ignored", "third reveal is gated");
session.pause();
assert.equal(session.advance(500), false);
assert.equal(session.pendingMismatchMs, 900, "mismatch timer pauses with the game");
const restored = new MemoryGardenSession({snapshot: decodeSave(encodeSave(session))});
assert.deepEqual(restored.snapshot(), session.snapshot());
assert.equal(restored.paused, true);
restored.resume();
assert.equal(restored.advance(250), false);
assert.equal(restored.pendingMismatchMs, 650);
assert.equal(restored.advance(250), false);
assert.equal(restored.pendingMismatchMs, 400);
assert.equal(restored.advance(250), false);
assert.equal(restored.pendingMismatchMs, 150);
assert.equal(restored.advance(250), true);
assert.deepEqual(restored.revealed, []);

const invalid = JSON.parse(encodeSave(session));
invalid.payload.revealed = [mismatchA];
invalid.payload.resolving = true;
assert.throws(() => decodeSave(JSON.stringify(invalid)), /Invalid Memory Garden save/);
const wrongApp = JSON.parse(encodeSave(session));
wrongApp.appId = "story-cards";
assert.throws(() => decodeSave(JSON.stringify(wrongApp)), /Not a Memory Garden save/);

const grand = new MemoryGardenSession({seed: "grand", size: "grand"});
assert.equal(grand.tiles.length, 24);
assert.equal(new Set(grand.tiles.map(tile => tile.motif)).size, 12);
assert.equal(MOTIFS.length, 12);
assert.deepEqual(Object.keys(SIZES), ["practice", "garden", "grand"]);
console.log("PASS seeded boards, reveal gating, pause-aware mismatch timer, exact save restore and invalid saves");
