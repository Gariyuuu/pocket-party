let cachedSet: Set<string> | null = null;
let cachedList: string[] | null = null;

/**
 * Lazy-loads the bundled word list (public-domain dictionary, filtered to
 * plain 3-8 letter lowercase entries) as its own chunk — shared by Word
 * Clash and Word Bites (both need real-word validation), fetched at most
 * once per session regardless of which game (or both) ends up using it.
 */
async function loadWordList(): Promise<string[]> {
  if (!cachedList) {
    const mod = await import("./word-list.json");
    cachedList = mod.default as string[];
  }
  return cachedList;
}

export async function isRealWord(word: string): Promise<boolean> {
  if (!cachedSet) {
    const list = await loadWordList();
    cachedSet = new Set(list.map((w) => w.toUpperCase()));
  }
  return cachedSet.has(word.toUpperCase());
}

export async function getWordList(): Promise<string[]> {
  return loadWordList();
}
