import type { BiteTile } from "./types";

export interface WordBitesCandidate {
  tileIds: string[];
  word: string;
}

/** Every maximal run of same-groupId tiles still contiguous in the current rack — a group that's been partially claimed by someone else may no longer form its original word, which is fine, this just won't find one for it. */
function findGroupCandidates(rack: BiteTile[]): WordBitesCandidate[] {
  const candidates: WordBitesCandidate[] = [];
  let i = 0;
  while (i < rack.length) {
    let j = i;
    let word = "";
    const tileIds: string[] = [];
    while (j < rack.length && rack[j].groupId === rack[i].groupId) {
      word += rack[j].letters;
      tileIds.push(rack[j].id);
      j += 1;
    }
    if (word.length >= 3) candidates.push({ tileIds, word });
    i = j;
  }
  return candidates;
}

/**
 * Picks a real, currently-available word for a bot to submit — used in solo
 * mode. Not sophisticated: just finds every intact source-word group still
 * sitting in the rack, filters to ones that check out against the real
 * dictionary (a partially-claimed group's remainder might not), and biases
 * difficulty toward longer/shorter finds rather than searching harder.
 */
export function pickWordBitesMove(
  rack: BiteTile[],
  upperCaseWordSet: Set<string>,
  difficulty: "easy" | "medium" | "hard",
): WordBitesCandidate | null {
  const valid = findGroupCandidates(rack).filter((c) => upperCaseWordSet.has(c.word.toUpperCase()));
  if (valid.length === 0) return null;

  valid.sort((a, b) => b.word.length - a.word.length);
  const poolSize =
    difficulty === "hard" ? 1 : difficulty === "medium" ? Math.max(1, Math.ceil(valid.length / 2)) : valid.length;
  const pool = valid.slice(0, poolSize);
  return pool[Math.floor(Math.random() * pool.length)];
}
