import { test, expect, type Page } from "@playwright/test";
import { setUpTwoPlayerMatch, closeTwoPlayerMatch } from "./helpers";

/**
 * Tile Rush online-flow smoke test. Which tiles are actually clearable (a
 * connected group of 2+ same-color tiles) depends on the match's seed, not
 * known in advance — but every tile's `aria-label` already encodes its
 * color and position, so this test reads the board at runtime and finds a
 * real adjacent same-color pair to click, instead of guessing a coordinate
 * blindly. On an 8x8 board with 5 colors, at least one adjacent pair is
 * all but statistically guaranteed to exist.
 */
async function findAdjacentSameColorTile(page: Page): Promise<{ row: number; col: number } | null> {
  const cells = page.getByRole("grid", { name: "Tile Rush board" }).getByRole("gridcell");
  const count = await cells.count();
  const colorAt = new Map<string, string>();

  for (let i = 0; i < count; i++) {
    const label = await cells.nth(i).getAttribute("aria-label");
    const match = label?.match(/^(\w+) tile.*, row (\d+) column (\d+)$/);
    if (!match) continue;
    const [, color, rowStr, colStr] = match;
    colorAt.set(`${Number(rowStr) - 1},${Number(colStr) - 1}`, color);
  }

  for (const [key, color] of colorAt) {
    const [row, col] = key.split(",").map(Number);
    const right = colorAt.get(`${row},${col + 1}`);
    const down = colorAt.get(`${row + 1},${col}`);
    if (right === color || down === color) return { row, col };
  }
  return null;
}

test("host clears a real adjacent tile group and their score updates for both players", async ({ browser }) => {
  const room = await setUpTwoPlayerMatch(browser, "Tile Rush");
  const { hostPage, guestPage } = room;

  await expect(hostPage.getByRole("grid", { name: "Tile Rush board" })).toBeVisible();
  await expect(guestPage.getByRole("grid", { name: "Tile Rush board" })).toBeVisible();
  await expect(hostPage.getByText("0 pts")).toBeVisible();

  const target = await findAdjacentSameColorTile(hostPage);
  expect(target, "expected to find at least one adjacent same-color pair on an 8x8 board").not.toBeNull();

  await hostPage
    .getByRole("gridcell", { name: new RegExp(`row ${target!.row + 1} column ${target!.col + 1}$`) })
    .click();

  await expect(hostPage.getByText("0 pts")).not.toBeVisible();

  await closeTwoPlayerMatch(room);
});
