import { test, expect } from "@playwright/test";
import { fillIdentityDialog, extractRoomCode } from "./helpers";

/**
 * Covers the room lifecycle: two independent browser contexts (each gets
 * its own guest_id cookie/localStorage, same as two separate players)
 * create and join a room, see each other via Ably's "state" broadcast,
 * host status migrates correctly when the host leaves, and a disconnected
 * player reconnects into the same seat rather than duplicating it (a
 * `navigator.sendBeacon` disconnect signal on tab close — see
 * use-realtime-room.ts's header comment for why this is a best-effort
 * heuristic rather than a guaranteed one).
 *
 * There is no more "invalid room code" error case: a room is created
 * implicitly the moment its first "join" action lands (see
 * create-room-button.tsx's comment), so any well-formed 6-character code is
 * always joinable. The old third test covering that case was replaced with
 * the reconnect test below.
 *
 * Requires real Neon/Clerk/Ably credentials in .env.local — never run
 * successfully, see TESTING.md.
 */

test("two players create and join the same room, then see each other", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  await hostPage.goto("/");
  await hostPage.getByRole("button", { name: "Create Room" }).click();
  await fillIdentityDialog(hostPage, "HostPlayer");

  await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/);
  const roomCode = extractRoomCode(hostPage.url());

  await guestPage.goto(`/room/${roomCode}`);
  await guestPage.getByRole("button", { name: "Join room" }).click();
  await fillIdentityDialog(guestPage, "GuestPlayer");

  await expect(hostPage.getByText("GuestPlayer")).toBeVisible();
  await expect(guestPage.getByText("HostPlayer")).toBeVisible();
  await expect(hostPage.getByText("Players (2/4)")).toBeVisible();

  await hostContext.close();
  await guestContext.close();
});

test("host leaving migrates host status to the remaining player", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  await hostPage.goto("/");
  await hostPage.getByRole("button", { name: "Create Room" }).click();
  await fillIdentityDialog(hostPage, "Host2");
  await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/);
  const roomCode = extractRoomCode(hostPage.url());

  await guestPage.goto(`/room/${roomCode}`);
  await guestPage.getByRole("button", { name: "Join room" }).click();
  await fillIdentityDialog(guestPage, "Guest2");
  await expect(guestPage.getByText("Host2")).toBeVisible();

  await hostPage.getByRole("button", { name: "Leave" }).click();

  // The remaining player should now render with the host crown — checked
  // indirectly via the accessible label on the badge. room-state.ts's
  // leaveRoom() promotes the earliest-remaining player (players[0] after
  // the departing player is filtered out).
  await expect(guestPage.getByLabel("Room host")).toBeVisible();

  await hostContext.close();
  await guestContext.close();
});

test("a disconnected player reconnects into the same seat instead of duplicating it", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  let hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  await hostPage.goto("/");
  await hostPage.getByRole("button", { name: "Create Room" }).click();
  await fillIdentityDialog(hostPage, "HostR");
  await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/);
  const roomCode = extractRoomCode(hostPage.url());

  await guestPage.goto(`/room/${roomCode}`);
  await guestPage.getByRole("button", { name: "Join room" }).click();
  await fillIdentityDialog(guestPage, "GuestR");
  await expect(guestPage.getByText("Players (2/4)")).toBeVisible();

  // Closing the tab (not clicking "Leave") fires a `pagehide`-triggered
  // `navigator.sendBeacon` -> the "disconnect" action -> markDisconnected
  // (see use-realtime-room.ts) — the player stays in the roster with
  // connectionStatus: "disconnected", not removed.
  await hostPage.close();
  await expect(guestPage.getByText("Reconnecting…")).toBeVisible();

  // Reopening the bare room URL (no ?autojoin=1) in the same browser
  // context reuses the same guest_id cookie, so useRealtimeRoom's initial
  // GET fetch resolves the same profileId and RoomPageClient's isMember
  // check finds it already in the roster — it renders the Lobby directly,
  // skipping the "Join room?" prompt entirely, because reconnecting is not
  // the same thing as joining.
  hostPage = await hostContext.newPage();
  await hostPage.goto(`/room/${roomCode}`);
  await expect(hostPage.getByText("Players (2/4)")).toBeVisible();
  await expect(hostPage.getByRole("button", { name: "Join room" })).not.toBeVisible();
  await expect(guestPage.getByText("Reconnecting…")).not.toBeVisible();

  await hostContext.close();
  await guestContext.close();
});
