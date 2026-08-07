import type { GameId } from "@/games/core/registry";

/** Games where extra horizontal room genuinely helps aim — shown the landscape hint on narrow phones. */
export const PHYSICS_HEAVY_GAMES = new Set<GameId>([
  "bounce-cup",
  "mini-hoops",
  "tank-tactics",
  "pocket-shots",
  "orb-hockey",
]);
