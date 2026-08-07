import type { GameEngine } from "./game-engine";
import type { GameId } from "./registry";
import { gridThreeEngine } from "@/games/grid-three/engine";
import { fourfallEngine } from "@/games/fourfall/engine";
import { wordClashEngine } from "@/games/word-clash/engine";
import { bounceCupEngine } from "@/games/bounce-cup/engine";
import { miniHoopsEngine } from "@/games/mini-hoops/engine";
import { tankTacticsEngine } from "@/games/tank-tactics/engine";
import { pocketShotsEngine } from "@/games/pocket-shots/engine";
import { orbHockeyEngine } from "@/games/orb-hockey/engine";
import { quickDrawEngine } from "@/games/quick-draw/engine";
import { tileRushEngine } from "@/games/tile-rush/engine";
import { miniGolfEngine } from "@/games/mini-golf/engine";
import { wordBitesEngine } from "@/games/word-bites/engine";
import { seaBattleEngine } from "@/games/sea-battle/engine";
import { checkersEngine } from "@/games/checkers/engine";
import { chessEngine } from "@/games/chess/engine";
import { dartsEngine } from "@/games/darts/engine";
import { cornholeEngine } from "@/games/cornhole/engine";
import { reversiEngine } from "@/games/reversi/engine";
import { dotsAndBoxesEngine } from "@/games/dots-and-boxes/engine";
import { yahtzeeEngine } from "@/games/yahtzee/engine";
import { mancalaEngine } from "@/games/mancala/engine";
import { triviaBlitzEngine } from "@/games/trivia-blitz/engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyGameEngine = GameEngine<any, any>;

/** Only games with a real engine appear here — everything else is "coming-soon" in the registry. */
export const GAME_ENGINES: Partial<Record<GameId, AnyGameEngine>> = {
  "grid-three": gridThreeEngine,
  fourfall: fourfallEngine,
  "word-clash": wordClashEngine,
  "bounce-cup": bounceCupEngine,
  "mini-hoops": miniHoopsEngine,
  "tank-tactics": tankTacticsEngine,
  "pocket-shots": pocketShotsEngine,
  "orb-hockey": orbHockeyEngine,
  "quick-draw": quickDrawEngine,
  "tile-rush": tileRushEngine,
  "mini-golf": miniGolfEngine,
  "word-bites": wordBitesEngine,
  "sea-battle": seaBattleEngine,
  checkers: checkersEngine,
  chess: chessEngine,
  darts: dartsEngine,
  cornhole: cornholeEngine,
  reversi: reversiEngine,
  "dots-and-boxes": dotsAndBoxesEngine,
  yahtzee: yahtzeeEngine,
  mancala: mancalaEngine,
  "trivia-blitz": triviaBlitzEngine,
};

export function getGameEngine(id: GameId): AnyGameEngine | undefined {
  return GAME_ENGINES[id];
}
