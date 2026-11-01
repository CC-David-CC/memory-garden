export const MEMORY_GARDEN_RIVE = Object.freeze({
  asset: "memory-creatures.riv",
  artboard: "Main",
  stateMachine: "Presentation",
  properties: Object.freeze({
    motif: "number",
    revealed: "boolean",
    matched: "boolean",
  }),
  triggers: Object.freeze(["flip", "match", "mismatch"]),
  states: Object.freeze(["back", "reveal", "front", "matched"]),
});

export function tilePresentation(tile, matched, revealed) {
  return {
    motif: tile.motif,
    revealed,
    matched,
    state: matched ? "matched" : revealed ? "front" : "back",
  };
}
