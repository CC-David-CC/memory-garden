export const MOTIFS = Object.freeze([
  {name: "Moss Mouse", glyph: "🐭", color: "#9bc48b"},
  {name: "Petal Frog", glyph: "🐸", color: "#7fbd78"},
  {name: "Dew Snail", glyph: "🐌", color: "#d8b86e"},
  {name: "Fern Fox", glyph: "🦊", color: "#e59b67"},
  {name: "Pond Turtle", glyph: "🐢", color: "#76a98b"},
  {name: "Seed Sparrow", glyph: "🐦", color: "#83afd8"},
  {name: "Acorn Squirrel", glyph: "🐿️", color: "#bd8c5f"},
  {name: "Moon Moth", glyph: "🦋", color: "#aa8fd3"},
  {name: "Reed Rabbit", glyph: "🐰", color: "#e4d5ca"},
  {name: "Honey Bee", glyph: "🐝", color: "#dfbe5c"},
  {name: "Lantern Beetle", glyph: "🪲", color: "#72b6a0"},
  {name: "Garden Cat", glyph: "🐈", color: "#d49a6f"},
]);

export const SIZES = Object.freeze({
  practice: {label: "Practice · 6 pairs", cols: 4, rows: 3, pairs: 6},
  garden: {label: "Garden · 8 pairs", cols: 4, rows: 4, pairs: 8},
  grand: {label: "Grand garden · 12 pairs", cols: 6, rows: 4, pairs: 12},
});

function randomFor(seed) {
  let value = 2166136261;
  for (const character of String(seed)) {
    value ^= character.codePointAt(0);
    value = Math.imul(value, 16777619);
  }
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(values, seed) {
  const random = randomFor(seed);
  const output = [...values];
  for (let index = output.length - 1; index > 0; index--) {
    const choice = Math.floor(random() * (index + 1));
    [output[index], output[choice]] = [output[choice], output[index]];
  }
  return output;
}

function integer(value, minimum, maximum) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

export class MemoryGardenSession {
  constructor(options = {}) {
    if (options.snapshot) this.applySnapshot(options.snapshot);
    else this.reset(options);
  }

  reset({seed = `garden-${Date.now()}`, size = "practice"} = {}) {
    const config = SIZES[size];
    if (!config) throw Error("Unknown Memory Garden board size.");
    this.seed = String(seed);
    this.size = size;
    const motifs = Array.from({length: config.pairs}, (_, index) => index);
    this.tiles = shuffle([...motifs, ...motifs], this.seed).map((motif, index) => ({index, motif}));
    this.matched = new Set();
    this.revealed = [];
    this.pendingMismatchMs = 0;
    this.resolving = false;
    this.moves = 0;
    this.elapsedMs = 0;
    this.won = false;
    this.paused = true;
  }

  get config() {
    return SIZES[this.size];
  }

  reveal(index) {
    if (this.paused || this.won || this.resolving) return {kind: "ignored"};
    const tile = this.tiles[index];
    if (!tile || this.matched.has(index) || this.revealed.includes(index)) return {kind: "ignored"};
    this.revealed.push(index);
    this.moves++;
    if (this.revealed.length === 1) return {kind: "reveal", index};
    const [first, second] = this.revealed;
    if (this.tiles[first].motif === this.tiles[second].motif) {
      this.matched.add(first);
      this.matched.add(second);
      this.revealed = [];
      if (this.matched.size === this.tiles.length) {
        this.won = true;
        return {kind: "win", indices: [first, second]};
      }
      return {kind: "match", indices: [first, second]};
    }
    this.resolving = true;
    this.pendingMismatchMs = 900;
    return {kind: "mismatch", indices: [first, second]};
  }

  advance(deltaMs) {
    if (this.paused || this.won || !Number.isFinite(deltaMs) || deltaMs <= 0) return false;
    const delta = Math.min(250, deltaMs);
    this.elapsedMs += delta;
    if (!this.resolving) return false;
    this.pendingMismatchMs = Math.max(0, this.pendingMismatchMs - delta);
    if (this.pendingMismatchMs > 0) return false;
    this.revealed = [];
    this.resolving = false;
    return true;
  }

  togglePaused() {
    if (this.won) return this.paused;
    this.paused = !this.paused;
    return this.paused;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    if (!this.won) this.paused = false;
  }

  snapshot() {
    return {
      seed: this.seed,
      size: this.size,
      tiles: this.tiles.map(tile => tile.motif),
      matched: [...this.matched],
      revealed: [...this.revealed],
      pendingMismatchMs: this.pendingMismatchMs,
      resolving: this.resolving,
      moves: this.moves,
      elapsedMs: this.elapsedMs,
      won: this.won,
    };
  }

  applySnapshot(snapshot) {
    validateSnapshot(snapshot);
    this.seed = snapshot.seed;
    this.size = snapshot.size;
    this.tiles = snapshot.tiles.map((motif, index) => ({index, motif}));
    this.matched = new Set(snapshot.matched);
    this.revealed = [...snapshot.revealed];
    this.pendingMismatchMs = snapshot.pendingMismatchMs;
    this.resolving = snapshot.resolving;
    this.moves = snapshot.moves;
    this.elapsedMs = snapshot.elapsedMs;
    this.won = snapshot.won;
    this.paused = true;
  }
}

export function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) throw Error("Invalid Memory Garden save.");
  const config = SIZES[snapshot.size];
  if (!config || typeof snapshot.seed !== "string" || !snapshot.seed || snapshot.seed.length > 128) throw Error("Invalid Memory Garden save.");
  if (!Array.isArray(snapshot.tiles) || snapshot.tiles.length !== config.rows * config.cols || !snapshot.tiles.every(motif => integer(motif, 0, config.pairs - 1))) throw Error("Invalid Memory Garden save.");
  const counts = Array(config.pairs).fill(0);
  for (const motif of snapshot.tiles) counts[motif]++;
  if (counts.some(count => count !== 2)) throw Error("Invalid Memory Garden save.");
  const indices = value => Array.isArray(value) && value.every(index => integer(index, 0, snapshot.tiles.length - 1));
  if (!indices(snapshot.matched) || new Set(snapshot.matched).size !== snapshot.matched.length || snapshot.matched.length % 2) throw Error("Invalid Memory Garden save.");
  if (!indices(snapshot.revealed) || new Set(snapshot.revealed).size !== snapshot.revealed.length || snapshot.revealed.length > 2 || snapshot.revealed.some(index => snapshot.matched.includes(index))) throw Error("Invalid Memory Garden save.");
  for (const motif of counts.keys()) {
    const matched = snapshot.matched.filter(index => snapshot.tiles[index] === motif).length;
    if (matched !== 0 && matched !== 2) throw Error("Invalid Memory Garden save.");
  }
  if (typeof snapshot.resolving !== "boolean" || !Number.isFinite(snapshot.pendingMismatchMs) || snapshot.pendingMismatchMs < 0 || snapshot.pendingMismatchMs > 900) throw Error("Invalid Memory Garden save.");
  if (snapshot.resolving !== (snapshot.pendingMismatchMs > 0 && snapshot.revealed.length === 2 && snapshot.tiles[snapshot.revealed[0]] !== snapshot.tiles[snapshot.revealed[1]])) throw Error("Invalid Memory Garden save.");
  if (!integer(snapshot.moves, 0, 1000000) || !Number.isFinite(snapshot.elapsedMs) || snapshot.elapsedMs < 0 || snapshot.elapsedMs > 7 * 24 * 60 * 60 * 1000) throw Error("Invalid Memory Garden save.");
  if (typeof snapshot.won !== "boolean" || snapshot.won !== (snapshot.matched.length === snapshot.tiles.length)) throw Error("Invalid Memory Garden save.");
}

export function encodeSave(session) {
  return JSON.stringify({
    format: "ksu.game.save",
    schemaVersion: 1,
    appId: "memory-garden",
    kind: "logical-snapshot",
    gameBuild: "rules-1",
    contentVersion: "1",
    payload: session.snapshot(),
  });
}

export function decodeSave(text) {
  if (typeof text !== "string" || text.length > 1024 * 1024) throw Error("Memory Garden save is too large.");
  let envelope;
  try {
    envelope = JSON.parse(text);
  } catch {
    throw Error("Memory Garden save is not valid JSON.");
  }
  if (envelope?.format !== "ksu.game.save" || envelope.schemaVersion !== 1 || envelope.appId !== "memory-garden" || envelope.kind !== "logical-snapshot") throw Error("Not a Memory Garden save.");
  validateSnapshot(envelope.payload);
  return envelope.payload;
}
