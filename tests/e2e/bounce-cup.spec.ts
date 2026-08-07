import { test, expect } from "@playwright/test";
import { setUpTwoPlayerMatch, closeTwoPlayerMatch } from "./helpers";

/**
 * Bounce Cup online-flow smoke test. The engine passes turn after every
 * shot regardless of hit/miss (room-state.ts / engine.ts: only an instant
 * win — clearing the last cup — keeps the turn with the shooter, and that
 * can't happen on the very first shot of a fresh 6-cup rack) — so clicking
 * "Shoot" with whatever the default angle/power sliders start at is a
 * deterministic way to confirm the shot round-trips through the room's action route and
 * both clients end up agreeing on whose turn it is next.
 */
test("host takes a shot and the turn passes to the guest", async ({ browser }) => {
  const room = await setUpTwoPlayerMatch(browser, "Bounce Cup");
  const { hostPage, guestPage } = room;

  await expect(hostPage.getByRole("img", { name: /Bounce Cup table/ })).toBeVisible();
  await expect(guestPage.getByRole("img", { name: /Bounce Cup table/ })).toBeVisible();
  await expect(hostPage.getByText("Your shot — line it up")).toBeVisible();

  await hostPage.getByRole("button", { name: "Shoot" }).click();

  await expect(guestPage.getByText("Your shot — line it up")).toBeVisible();
  await expect(hostPage.getByText(/Guest is shooting/)).toBeVisible();

  await closeTwoPlayerMatch(room);
});
