import { test, expect } from "@playwright/test";
import { setUpTwoPlayerMatch, closeTwoPlayerMatch } from "./helpers";

/**
 * Orb Hockey online-flow smoke test. Deliberately does not attempt to
 * script a goal: paddle/puck motion is real-time client-side physics
 * (games/orb-hockey/physics.ts) driven by a requestAnimationFrame loop and
 * a generic ephemeral "broadcast" published directly between clients over
 * Ably, not a single scriptable action — there's no deterministic move
 * sequence to fabricate the way there is for the turn-based games. What
 * *is* deterministic and worth testing here: the countdown-to-live
 * transition, which fires a real "start-serve" action automatically
 * (client-side timer, COUNTDOWN_MS = 3000) and must round-trip through the
 * room's action route and back to both clients over Ably before the
 * "Serving in Xs…" badge can disappear on either side.
 */
test("the serve countdown clears automatically and both clients agree the match is live", async ({ browser }) => {
  const room = await setUpTwoPlayerMatch(browser, "Orb Hockey");
  const { hostPage, guestPage } = room;

  await expect(hostPage.getByRole("application", { name: /Orb Hockey table/ })).toBeVisible();
  await expect(guestPage.getByRole("application", { name: /Orb Hockey table/ })).toBeVisible();
  await expect(hostPage.getByText(/Serving in/)).toBeVisible();
  await expect(guestPage.getByText(/Serving in/)).toBeVisible();

  // COUNTDOWN_MS is 3000 — give it real margin over a slow CI machine.
  await expect(hostPage.getByText(/Serving in/)).not.toBeVisible({ timeout: 8_000 });
  await expect(guestPage.getByText(/Serving in/)).not.toBeVisible({ timeout: 8_000 });

  await closeTwoPlayerMatch(room);
});
