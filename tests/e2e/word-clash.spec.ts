import { test, expect } from "@playwright/test";
import { setUpTwoPlayerMatch, closeTwoPlayerMatch } from "./helpers";

/**
 * Word Clash online-flow smoke test. Deliberately does *not* attempt to
 * submit a word: the letter pool is generated from a per-match seed that
 * isn't known until the match actually starts, and there's no way to
 * compute a real, dictionary-valid word formable from an arbitrary pool
 * without either running the app or reimplementing its word list — a
 * blindly-guessed word (e.g. a common word chosen ahead of time) would
 * fail `isFormableFromPool` most of the time and assert nothing meaningful
 * either way. This still verifies the part that's actually at risk from
 * the backend migration: that starting the match and syncing the round/
 * letter-pool state through the room's action route + Ably sync works for both clients.
 */
test("both players see the same round and letter pool after starting", async ({ browser }) => {
  const room = await setUpTwoPlayerMatch(browser, "Word Clash");
  const { hostPage, guestPage } = room;

  await expect(hostPage.getByText("Round 1/3")).toBeVisible();
  await expect(guestPage.getByText("Round 1/3")).toBeVisible();

  const hostLetters = await hostPage.getByLabel("Letter pool").locator("span").allTextContents();
  const guestLetters = await guestPage.getByLabel("Letter pool").locator("span").allTextContents();
  expect(hostLetters.length).toBeGreaterThan(0);
  expect(hostLetters).toEqual(guestLetters);

  await closeTwoPlayerMatch(room);
});
