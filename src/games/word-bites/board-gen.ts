import { createSeededRng, pickInt, shuffle } from "@/games/core/rng";
import { SEED_WORDS } from "./seed-words";
import { WORD_BITES_SOURCE_WORD_COUNT } from "./constants";
import type { BiteTile } from "./types";

/**
 * Chops one word into 1-3 letter "bites," deterministically. Never leaves a
 * lone trailing letter if it can be avoided — once 3 or fewer letters
 * remain, they become one final bite instead of being split further.
 */
function chopIntoBites(rng: () => number, word: string, groupId: number): BiteTile[] {
  const tiles: BiteTile[] = [];
  let i = 0;
  let biteIndex = 0;
  while (i < word.length) {
    const remaining = word.length - i;
    const length = remaining <= 3 ? remaining : pickInt(rng, 1, 3);
    tiles.push({ id: `${groupId}-${biteIndex}`, letters: word.slice(i, i + length), groupId });
    i += length;
    biteIndex += 1;
  }
  return tiles;
}

/**
 * Builds one match's shared bite rack: picks WORD_BITES_SOURCE_WORD_COUNT
 * words from the curated seed list, chops each into bites, then shuffles
 * the *groups* (not individual bites) so every source word's bites stay
 * contiguous in the rack — guaranteeing at least one findable word per
 * group, while the shuffled group order still means no player can just
 * read the whole rack as one sentence.
 */
export function generateBiteRack(seed: string): BiteTile[] {
  const rng = createSeededRng(seed);
  const chosenWords = shuffle(rng, SEED_WORDS).slice(0, WORD_BITES_SOURCE_WORD_COUNT);
  const groups = chosenWords.map((word, groupId) => chopIntoBites(rng, word, groupId));
  return shuffle(rng, groups).flat();
}
