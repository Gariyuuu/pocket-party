import { test, expect } from "@playwright/test";
import { setUpTwoPlayerMatch, closeTwoPlayerMatch } from "./helpers";

/**
 * Fourfall online-flow smoke test: room -> select Fourfall -> ready/start ->
 * host drops a token -> the guest's turn indicator confirms the move synced
 * through the room's action route + Ably sync. A single drop can never win Fourfall (a
 * win needs 4 in a row), so the turn is guaranteed to pass — no need to
 * script an entire winning sequence to get a deterministic assertion.
 */
test("host drops a token and the turn passes to the guest", async ({ browser }) => {
  const room = await setUpTwoPlayerMatch(browser, "Fourfall");
  const { hostPage, guestPage } = room;

  await expect(hostPage.getByRole("grid", { name: "Fourfall board" })).toBeVisible();
  await expect(guestPage.getByRole("grid", { name: "Fourfall board" })).toBeVisible();
  await expect(hostPage.getByText("Your turn — pick a column")).toBeVisible();

  await hostPage.getByRole("button", { name: "Drop in column 1" }).click();

  await expect(guestPage.getByText("Your turn — pick a column")).toBeVisible();
  await expect(hostPage.getByText(/Guest's turn/)).toBeVisible();

  await closeTwoPlayerMatch(room);
});
