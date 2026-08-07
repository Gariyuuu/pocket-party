import { test, expect, type Page } from "@playwright/test";
import { setUpTwoPlayerMatch, closeTwoPlayerMatch } from "./helpers";

/**
 * The spec's required multiplayer smoke test: two independent browser
 * contexts join the same room, start Grid Three, play out a full game
 * through real moves synced over Ably, and the UI reports the correct
 * winner on both sides.
 *
 * Grid Three's engine/board are entirely unaffected by the backend
 * choice — what matters here is the transport underneath (a POST to the
 * room's action route + an Ably subscription via useRealtimeRoom), the
 * room-creation flow (identity dialog runs before navigating, with
 * ?autojoin=1 doing the actual "join" on landing), and a first-time
 * tutorial dialog that needs dismissing before either player's board is
 * interactable — all handled by setUpTwoPlayerMatch.
 *
 * Requires real Neon/Clerk/Ably credentials in .env.local — never run
 * successfully, see TESTING.md.
 */
test("two players play Grid Three to a verified win", async ({ browser }) => {
  const room = await setUpTwoPlayerMatch(browser, "Grid Three");
  const { hostPage, guestPage } = room;

  await expect(hostPage.getByRole("grid", { name: "Grid Three board" })).toBeVisible();
  await expect(guestPage.getByRole("grid", { name: "Grid Three board" })).toBeVisible();

  // Host is seat 1 (X, moves first). Play out a top-row win for the host:
  // X@0, O@3, X@1, O@4, X@2 completes the top row.
  const sequence: [Page, number][] = [
    [hostPage, 0],
    [guestPage, 3],
    [hostPage, 1],
    [guestPage, 4],
    [hostPage, 2],
  ];

  for (const [page, cellIndex] of sequence) {
    await page.locator(`[data-cell-index="${cellIndex}"]`).click();
    // Wait for the action route's response + its Ably "state" publish to
    // land before the next move, so both clients (and the turn indicator)
    // are settled before acting again.
    await hostPage.waitForTimeout(300);
  }

  await expect(hostPage.getByText("You won!")).toBeVisible();
  await expect(guestPage.getByText(/Host won/)).toBeVisible();

  await closeTwoPlayerMatch(room);
});
