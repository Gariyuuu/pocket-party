import { type Browser, type BrowserContext, type Page, expect } from "@playwright/test";

/**
 * Shared setup for every per-game online-flow smoke test. Room creation now
 * happens implicitly on the first "join" action to a room (see
 * create-room-button.tsx) — there's no server-side "create" step to wait on
 * separately from "join."
 */

export async function fillIdentityDialog(page: Page, nickname: string): Promise<void> {
  await page.getByLabel("Nickname").fill(nickname);
  await page.getByRole("button", { name: /create room|join room/i }).last().click();
}

export function extractRoomCode(url: string): string {
  const code = url.split("/room/")[1]?.split("?")[0];
  if (!code) throw new Error(`Couldn't extract a room code from URL: ${url}`);
  return code;
}

export async function dismissTutorialIfPresent(page: Page): Promise<void> {
  const gotIt = page.getByRole("button", { name: "Got it" });
  if (await gotIt.isVisible().catch(() => false)) {
    await gotIt.click();
  }
}

export interface TwoPlayerRoom {
  hostContext: BrowserContext;
  guestContext: BrowserContext;
  hostPage: Page;
  guestPage: Page;
  roomCode: string;
}

/**
 * Creates a room as "Host", joins it as "Guest" from a second browser
 * context, picks `gameName` (the exact accessible name of its GameCard —
 * see games/core/registry.ts), readies both players, and has the host
 * start the match. Leaves the caller to assert on the resulting board.
 */
export async function setUpTwoPlayerMatch(browser: Browser, gameName: string): Promise<TwoPlayerRoom> {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  await hostPage.goto("/");
  await hostPage.getByRole("button", { name: "Create Room" }).click();
  await fillIdentityDialog(hostPage, "Host");
  await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/);
  const roomCode = extractRoomCode(hostPage.url());

  await guestPage.goto(`/room/${roomCode}`);
  await guestPage.getByRole("button", { name: "Join room" }).click();
  await fillIdentityDialog(guestPage, "Guest");
  await expect(hostPage.getByText("Guest")).toBeVisible();

  await hostPage.getByRole("button", { name: gameName, exact: false }).click();
  await hostPage.getByRole("button", { name: "I'm ready" }).click();
  await guestPage.getByRole("button", { name: "I'm ready" }).click();
  await hostPage.getByRole("button", { name: "Start game" }).click();

  await dismissTutorialIfPresent(hostPage);
  await dismissTutorialIfPresent(guestPage);

  return { hostContext, guestContext, hostPage, guestPage, roomCode };
}

export async function closeTwoPlayerMatch(room: TwoPlayerRoom): Promise<void> {
  await room.hostContext.close();
  await room.guestContext.close();
}
