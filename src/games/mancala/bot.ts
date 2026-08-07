import { nextCell, oppositePit, pitsFor, storeFor } from "./moves";
import type { MancalaAction, MancalaState } from "./types";

function simulateMove(board: number[], pit: number, playerIndex: 0 | 1): { board: number[]; storeGain: number; extraTurn: boolean } {
  const draft = [...board];
  let seeds = draft[pit];
  draft[pit] = 0;
  let cell = pit;
  const myStore = storeFor(playerIndex);
  const before = draft[myStore];
  while (seeds > 0) {
    cell = nextCell(cell, playerIndex);
    draft[cell]++;
    seeds--;
  }
  if (pitsFor(playerIndex).includes(cell) && draft[cell] === 1) {
    const opposite = oppositePit(cell);
    draft[myStore] += draft[cell] + draft[opposite];
    draft[cell] = 0;
    draft[opposite] = 0;
  }
  return { board: draft, storeGain: draft[myStore] - before, extraTurn: cell === myStore };
}

/** Solo-mode opponent for Mancala: values captures and extra turns, and on hard difficulty peeks one extra move ahead whenever a move grants a bonus turn so it doesn't waste the follow-up on a weak pit. */
export function pickMancalaMove(
  state: MancalaState,
  botPlayerId: string,
  difficulty: "easy" | "medium" | "hard",
): MancalaAction {
  const playerIndex: 0 | 1 = state.players[0].playerId === botPlayerId ? 0 : 1;
  const myPits = pitsFor(playerIndex).filter((pit) => state.board[pit] > 0);

  if (difficulty === "easy") {
    return { type: "sow", pit: myPits[Math.floor(Math.random() * myPits.length)] };
  }

  let best = myPits[0];
  let bestScore = -Infinity;
  for (const pit of myPits) {
    const result = simulateMove(state.board, pit, playerIndex);
    let score = result.storeGain + (result.extraTurn ? 3 : 0);
    if (difficulty === "hard" && result.extraTurn) {
      const followUpPits = pitsFor(playerIndex).filter((p) => result.board[p] > 0);
      let bestFollowUp = 0;
      for (const followUpPit of followUpPits) {
        const followUp = simulateMove(result.board, followUpPit, playerIndex);
        bestFollowUp = Math.max(bestFollowUp, followUp.storeGain + (followUp.extraTurn ? 3 : 0));
      }
      score += bestFollowUp;
    }
    if (score > bestScore) {
      bestScore = score;
      best = pit;
    }
  }
  return { type: "sow", pit: best };
}
