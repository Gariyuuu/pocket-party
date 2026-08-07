/**
 * Deterministic PRNG (mulberry32) seeded from a string. Every physics/bot/
 * shuffle game derives all "randomness" from the match's shared seed through
 * this function so every client (and the server validator) computes the
 * exact same sequence — required for spectator-safe sync and server replay.
 */
export function createSeededRng(seed: string): () => number {
  let state = hashSeed(seed);

  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function randomSeed(): string {
  return Array.from(crypto.getRandomValues(new Uint32Array(4)))
    .map((n) => n.toString(36))
    .join("");
}

export function pickInt(rng: () => number, minInclusive: number, maxInclusive: number): number {
  return Math.floor(rng() * (maxInclusive - minInclusive + 1)) + minInclusive;
}

export function shuffle<T>(rng: () => number, items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
