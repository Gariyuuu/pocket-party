/**
 * A bundled, family-friendly, fixed prompt list — no custom/user-submitted
 * prompts in this release, per the brief. Simple, drawable nouns only.
 */
export const QUICK_DRAW_PROMPTS = [
  "cat", "dog", "house", "tree", "sun", "moon", "star", "fish", "bird", "boat",
  "car", "bicycle", "airplane", "rocket", "robot", "guitar", "piano", "drum",
  "pizza", "cake", "ice cream", "banana", "apple", "carrot", "umbrella", "hat",
  "shoe", "sock", "clock", "camera", "book", "pencil", "scissors", "key",
  "ladder", "chair", "table", "lamp", "balloon", "kite", "snowman", "rainbow",
  "cloud", "mountain", "volcano", "island", "castle", "crown", "sword",
  "shield", "dragon", "dinosaur", "elephant", "giraffe", "lion", "monkey",
  "penguin", "octopus", "butterfly", "spider", "snail", "turtle", "frog",
  "flower", "cactus", "mushroom", "anchor", "compass", "telescope", "ghost",
  "pumpkin", "snowflake", "lightning", "waterfall", "campfire", "tent",
] as const;

export function pickPrompt(rng: () => number, exclude: Set<string> = new Set()): string {
  const pool = QUICK_DRAW_PROMPTS.filter((p) => !exclude.has(p));
  const source = pool.length > 0 ? pool : QUICK_DRAW_PROMPTS;
  return source[Math.floor(rng() * source.length)];
}

export function pickDecoys(rng: () => number, correct: string, count: number): string[] {
  const pool = QUICK_DRAW_PROMPTS.filter((p) => p !== correct);
  const decoys: string[] = [];
  const used = new Set<string>();
  while (decoys.length < count && used.size < pool.length) {
    const candidate = pool[Math.floor(rng() * pool.length)];
    if (!used.has(candidate)) {
      used.add(candidate);
      decoys.push(candidate);
    }
  }
  return decoys;
}
