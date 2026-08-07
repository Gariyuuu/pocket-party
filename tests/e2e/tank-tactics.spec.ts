import { test, expect } from "@playwright/test";
import { setUpTwoPlayerMatch, closeTwoPlayerMatch } from "./helpers";

/**
 * Tank Tactics online-flow smoke test. Both tanks start at full health, so
 * a single shot can't reduce either side to 0 alive tanks — the engine
 * always passes turn to the next alive tank after a "fire" action unless
 * there's already a winner, which can't be true yet. Firing with whatever
 * the default angle/power/projectile controls start at is deterministic
 * for confirming the action round-trips through the room's action route.
 */
test("host fires and the turn passes to the guest", async ({ browser }) => {
  const room = await setUpTwoPlayerMatch(browser, "Tank Tactics");
  const { hostPage, guestPage } = room;

  await expect(hostPage.getByRole("img", { name: /Tank Tactics terrain/ })).toBeVisible();
  await expect(guestPage.getByRole("img", { name: /Tank Tactics terrain/ })).toBeVisible();
  await expect(hostPage.getByText(/Your turn —/)).toBeVisible();

  await hostPage.getByRole("button", { name: "Fire" }).click();

  await expect(guestPage.getByText(/Your turn —/)).toBeVisible();
  await expect(hostPage.getByText(/Guest's turn/)).toBeVisible();

  await closeTwoPlayerMatch(room);
});
