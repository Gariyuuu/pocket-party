import { test, expect } from "@playwright/test";
import { setUpTwoPlayerMatch, closeTwoPlayerMatch } from "./helpers";

/**
 * Mini Hoops online-flow smoke test. Same reasoning as Bounce Cup: the
 * engine passes turn after every shot (make or miss) unless it's the
 * match's final shot, which the very first shot of a fresh match never is
 * — so clicking "Shoot" with the default aim is a deterministic way to
 * confirm the shot round-trips and both clients agree on the next turn.
 */
test("host takes a shot and the turn passes to the guest", async ({ browser }) => {
  const room = await setUpTwoPlayerMatch(browser, "Mini Hoops");
  const { hostPage, guestPage } = room;

  await expect(hostPage.getByRole("img", { name: /Mini Hoops court/ })).toBeVisible();
  await expect(guestPage.getByRole("img", { name: /Mini Hoops court/ })).toBeVisible();
  await expect(hostPage.getByText("Your shot", { exact: true })).toBeVisible();

  await hostPage.getByRole("button", { name: "Shoot" }).click();

  await expect(guestPage.getByText("Your shot", { exact: true })).toBeVisible();
  await expect(hostPage.getByText(/Guest's shot/)).toBeVisible();

  await closeTwoPlayerMatch(room);
});
