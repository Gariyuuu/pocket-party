import { shuffle } from "@/games/core/rng";
import { WORD_CLASH_LETTER_POOL_SIZE } from "./types";

// Roughly Scrabble's English tile distribution — enough vowels to keep
// every draw playable without a separate "guarantee a vowel" pass.
const LETTER_BAG: string[] = [
  ..."E".repeat(12),
  ..."A".repeat(9),
  ..."I".repeat(9),
  ..."O".repeat(8),
  ..."N".repeat(6),
  ..."R".repeat(6),
  ..."T".repeat(6),
  ..."L".repeat(4),
  ..."S".repeat(4),
  ..."U".repeat(4),
  ..."D".repeat(4),
  ..."G".repeat(3),
  ..."B".repeat(2),
  ..."C".repeat(2),
  ..."M".repeat(2),
  ..."P".repeat(2),
  ..."F".repeat(2),
  ..."H".repeat(2),
  ..."V".repeat(2),
  ..."W".repeat(2),
  ..."Y".repeat(2),
  ..."K".repeat(1),
  ..."J".repeat(1),
  ..."X".repeat(1),
  ..."Q".repeat(1),
  ..."Z".repeat(1),
];

export function drawLetterPool(rng: () => number): string[] {
  return shuffle(rng, LETTER_BAG)
    .slice(0, WORD_CLASH_LETTER_POOL_SIZE)
    .sort();
}

/** Whether `word`'s letters are a sub-multiset of the pool (each used at most as often as it appears). */
export function isFormableFromPool(word: string, pool: string[]): boolean {
  const available = new Map<string, number>();
  for (const letter of pool) available.set(letter, (available.get(letter) ?? 0) + 1);

  for (const letter of word.toUpperCase()) {
    const remaining = available.get(letter) ?? 0;
    if (remaining <= 0) return false;
    available.set(letter, remaining - 1);
  }
  return true;
}
