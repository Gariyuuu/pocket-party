import { test, expect } from "@playwright/test";
import { setUpTwoPlayerMatch, closeTwoPlayerMatch } from "./helpers";

/**
 * Pocket Shots online-flow smoke test. Unlike Bounce Cup/Mini Hoops/Tank
 * Tactics, a "shoot" here isn't a button — it's a drag-back-and-release on
 * the canvas, and whether the turn passes afterward genuinely depends on
 * what the cue ball hits (a legal potted own-group ball keeps the turn).
 * To get a deterministic assertion without running the physics ourselves,
 * this test deliberately shoots *weak*: the cue ball starts at
 * (TABLE_WIDTH*0.22, TABLE_HEIGHT/2) and the nearest rack ball sits well
 * over 300 world-units away (rack.ts: centerX = TABLE_WIDTH*0.72, six
 * balls arranged around it) — a drag just barely past the engine's
 * MIN_DRAG threshold produces a low-power shot that travels nowhere near
 * that far before friction stops it, guaranteeing a "the cue ball didn't
 * touch anything" foul (which always passes the turn) regardless of drag
 * direction.
 */
test("host takes a deliberately weak shot and the turn passes to the guest (no-contact foul)", async ({
  browser,
}) => {
  const room = await setUpTwoPlayerMatch(browser, "Pocket Shots");
  const { hostPage, guestPage } = room;

  const canvas = hostPage.getByRole("img", { name: /Pocket Shots table/ });
  await expect(canvas).toBeVisible();
  await expect(guestPage.getByRole("img", { name: /Pocket Shots table/ })).toBeVisible();
  await expect(hostPage.getByText(/Your shot — drag back/)).toBeVisible();

  const TABLE_WIDTH = 760;
  const TABLE_HEIGHT = 380;
  const CUE_BALL_X = TABLE_WIDTH * 0.22;
  const CUE_BALL_Y = TABLE_HEIGHT / 2;
  const DRAG_WORLD_UNITS = 15; // just over the engine's MIN_DRAG (12), far short of the ~300+ unit gap to the rack

  const box = (await canvas.boundingBox())!;
  const scaleX = box.width / TABLE_WIDTH;
  const scaleY = box.height / TABLE_HEIGHT;
  const cueScreenX = box.x + CUE_BALL_X * scaleX;
  const cueScreenY = box.y + CUE_BALL_Y * scaleY;
  const dragScreenX = cueScreenX + DRAG_WORLD_UNITS * scaleX;

  await hostPage.mouse.move(cueScreenX, cueScreenY);
  await hostPage.mouse.down();
  await hostPage.mouse.move(dragScreenX, cueScreenY);
  await hostPage.mouse.up();

  await expect(hostPage.getByText("Foul — the cue ball didn't touch anything.")).toBeVisible();
  await expect(guestPage.getByText(/Your shot — drag back/)).toBeVisible();

  await closeTwoPlayerMatch(room);
});
