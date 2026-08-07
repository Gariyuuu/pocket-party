import { BOX_COUNT, EDGE_COUNT, boxesForEdge, edgesForBox } from "./moves";
import type { DotsAndBoxesAction, DotsAndBoxesState } from "./types";

function openEdges(edges: boolean[]): number[] {
  const open: number[] = [];
  for (let i = 0; i < EDGE_COUNT; i++) if (!edges[i]) open.push(i);
  return open;
}

/** How many boxes would go from 3-claimed-edges to complete if this edge were taken right now. */
function boxesCompletedBy(edges: boolean[], candidate: number): number {
  let count = 0;
  for (const box of boxesForEdge(candidate)) {
    if (edgesForBox(box).filter((edge) => edges[edge]).length === 3) count++;
  }
  return count;
}

/** Whether claiming this edge would hand the opponent a free box (bring any adjacent box to exactly 3 claimed edges). */
function givesAwayABox(edges: boolean[], candidate: number): boolean {
  for (const box of boxesForEdge(candidate)) {
    if (edgesForBox(box).filter((edge) => edges[edge]).length === 2) return true;
  }
  return false;
}

/** Simulates the opponent greedily claiming every box that becomes free after this sacrifice, including any chain reaction — returns how many boxes they'd get. */
function simulateSacrificeLoss(edges: boolean[], candidate: number): number {
  const sim = [...edges];
  sim[candidate] = true;
  let lost = 0;
  let progress = true;
  while (progress) {
    progress = false;
    for (let box = 0; box < BOX_COUNT; box++) {
      const boxEdges = edgesForBox(box);
      if (boxEdges.filter((edge) => sim[edge]).length === 3) {
        const missing = boxEdges.find((edge) => !sim[edge]);
        if (missing !== undefined) {
          sim[missing] = true;
          lost++;
          progress = true;
        }
      }
    }
  }
  return lost;
}

/** Solo-mode opponent for Dots and Boxes: take any free box (preferring the move that clears the most at once), otherwise stay "safe" (never hand over a box) if possible, otherwise — on hard — sacrifice wherever the resulting chain reaction costs the fewest boxes. */
export function pickDotsAndBoxesMove(
  state: DotsAndBoxesState,
  _botPlayerId: string,
  difficulty: "easy" | "medium" | "hard",
): DotsAndBoxesAction {
  const open = openEdges(state.edges);

  const completing = open
    .map((edge) => ({ edge, completes: boxesCompletedBy(state.edges, edge) }))
    .filter((candidate) => candidate.completes > 0)
    .sort((a, b) => b.completes - a.completes);
  if (completing.length > 0) return { type: "claim-edge", edge: completing[0].edge };

  if (difficulty === "easy") {
    return { type: "claim-edge", edge: open[Math.floor(Math.random() * open.length)] };
  }

  const safe = open.filter((edge) => !givesAwayABox(state.edges, edge));
  if (safe.length > 0) {
    return { type: "claim-edge", edge: safe[Math.floor(Math.random() * safe.length)] };
  }

  if (difficulty === "medium") {
    return { type: "claim-edge", edge: open[Math.floor(Math.random() * open.length)] };
  }

  let best = open[0];
  let bestLoss = Infinity;
  for (const edge of open) {
    const loss = simulateSacrificeLoss(state.edges, edge);
    if (loss < bestLoss) {
      bestLoss = loss;
      best = edge;
    }
  }
  return { type: "claim-edge", edge: best };
}
