/**
 * A small, hand-curated word list used only to build each match's bite
 * rack (see board-gen.ts) — deliberately separate from the big bundled
 * dictionary (games/core/dictionary.ts), since createInitialState() must be
 * synchronous and this list needs to be available without an async import.
 * Real-word *validation* of whatever a player actually submits still goes
 * through the full dictionary, same as Word Clash.
 */
export const SEED_WORDS: string[] = [
  "PICKLE",
  "GARDEN",
  "PLANET",
  "WINDOW",
  "PENCIL",
  "TURTLE",
  "MARKET",
  "SPIDER",
  "CANDLE",
  "JACKET",
  "MONKEY",
  "PUZZLE",
  "SUNSET",
  "TUNNEL",
  "VOLCANO",
  "BLANKET",
  "CAPTAIN",
  "DIAMOND",
  "FOUNTAIN",
  "HARVEST",
  "JOURNEY",
  "KITCHEN",
  "LANTERN",
  "MERMAID",
  "ORCHARD",
  "PASTURE",
  "RAINBOW",
  "SANDBOX",
  "TREASURE",
  "UMBRELLA",
  "VAMPIRE",
  "WHISTLE",
  "ARCHWAY",
  "BONFIRE",
  "PILLOW",
  "DOLPHIN",
  "ECLIPSE",
  "FIREFLY",
  "GRANITE",
  "HORIZON",
];
