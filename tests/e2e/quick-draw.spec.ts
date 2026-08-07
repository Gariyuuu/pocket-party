import { test, expect } from "@playwright/test";
import { setUpTwoPlayerMatch, closeTwoPlayerMatch } from "./helpers";

/**
 * Quick Draw online-flow smoke test. Which of the two players is round 1's
 * artist is deterministic (the first-joined player, per room-state.ts's
 * startMatch), but this test detects it from the rendered UI instead of
 * assuming that ordering directly — the artist's page shows "Draw: ..."
 * text, the guesser's page shows the 4 answer-option buttons. Guessing (an
 * always-accepted action for a non-artist, right or wrong) is the only
 * player-facing action a non-drawing player can take in this game, so this
 * is the most meaningful accepted-action test available without needing to
 * actually draw anything recognizable or know the seeded prompt in advance.
 */
test("the guesser submits a guess and it's reflected in their own UI", async ({ browser }) => {
  const room = await setUpTwoPlayerMatch(browser, "Quick Draw");
  const { hostPage, guestPage } = room;

  const hostIsArtist = await hostPage.getByText(/^Draw:/).isVisible().catch(() => false);
  const [artistPage, guesserPage] = hostIsArtist ? [hostPage, guestPage] : [guestPage, hostPage];

  await expect(artistPage.getByText(/^Draw:/)).toBeVisible();
  await expect(guesserPage.getByRole("img", { name: /artist's drawing/ })).toBeVisible();

  // The 4 guess options are seeded prompt words, unknown in advance and not
  // individually labeled — select them by their container instead of text.
  const optionButtons = guesserPage.locator(".grid.w-full.max-w-md button");
  await expect(optionButtons).toHaveCount(4);
  await optionButtons.first().click();

  await expect(optionButtons.first()).toBeDisabled();

  await closeTwoPlayerMatch(room);
});
