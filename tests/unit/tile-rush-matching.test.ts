import { describe, expect, it } from "vitest";
import { findConnectedGroup, clearAndRefill, columnIndices, rowIndices, shuffleColors } from "@/games/tile-rush/matching";
import { BOARD_SIZE } from "@/games/tile-rush/constants";
import { createSeededRng } from "@/games/core/rng";
import type { Tile } from "@/games/tile-rush/types";

function flatBoard(colors: number[]): Tile[] {
  return colors.map((color) => ({ color, powerUp: null }));
}

describe("findConnectedGroup", () => {
  it("finds a 4-directionally connected same-color group", () => {
    const colors = new Array(BOARD_SIZE * BOARD_SIZE).fill(0);
    // A small cross of color 1 at the top-left.
    colors[0] = 1;
    colors[1] = 1;
    colors[BOARD_SIZE] = 1;
    const tiles = flatBoard(colors);
    const group = findConnectedGroup(tiles, 0);
    expect(group.sort((a, b) => a - b)).toEqual([0, 1, BOARD_SIZE].sort((a, b) => a - b));
  });

  it("does not include diagonal neighbors", () => {
    const colors = new Array(BOARD_SIZE * BOARD_SIZE).fill(0);
    colors[0] = 1;
    colors[BOARD_SIZE + 1] = 1; // diagonal from index 0
    const tiles = flatBoard(colors);
    const group = findConnectedGroup(tiles, 0);
    expect(group).toEqual([0]);
  });

  it("returns just the tile itself when isolated", () => {
    const colors = new Array(BOARD_SIZE * BOARD_SIZE).fill(0);
    colors[5] = 3;
    const tiles = flatBoard(colors);
    expect(findConnectedGroup(tiles, 5)).toEqual([5]);
  });
});

describe("rowIndices / columnIndices", () => {
  it("returns every index in a row", () => {
    expect(rowIndices(2)).toEqual(Array.from({ length: BOARD_SIZE }, (_, c) => 2 * BOARD_SIZE + c));
  });

  it("returns every index in a column", () => {
    expect(columnIndices(3)).toEqual(Array.from({ length: BOARD_SIZE }, (_, r) => r * BOARD_SIZE + 3));
  });
});

describe("clearAndRefill", () => {
  it("drops surviving tiles to the bottom of their column and fills the top with new tiles", () => {
    const colors = new Array(BOARD_SIZE * BOARD_SIZE).fill(0);
    // Column 0: mark every tile except the bottom-most as "cleared".
    const cleared = new Set<number>();
    for (let row = 0; row < BOARD_SIZE - 1; row++) cleared.add(row * BOARD_SIZE + 0);
    colors[(BOARD_SIZE - 1) * BOARD_SIZE + 0] = 9; // the survivor, distinctly colored
    const tiles = flatBoard(colors);

    const next = clearAndRefill(tiles, cleared, createSeededRng("fill-seed"));
    // The survivor should now be at the very bottom of column 0.
    expect(next[(BOARD_SIZE - 1) * BOARD_SIZE + 0].color).toBe(9);
  });

  it("keeps the board full-size with no empty slots", () => {
    const tiles = flatBoard(new Array(BOARD_SIZE * BOARD_SIZE).fill(1));
    const cleared = new Set([0, 1, 2, BOARD_SIZE, BOARD_SIZE + 1]);
    const next = clearAndRefill(tiles, cleared, createSeededRng("seed"));
    expect(next).toHaveLength(BOARD_SIZE * BOARD_SIZE);
    expect(next.every((t) => t != null)).toBe(true);
  });
});

describe("shuffleColors", () => {
  it("preserves the multiset of colors while (usually) changing their positions", () => {
    const tiles = flatBoard(Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => i % 5));
    const shuffled = shuffleColors(tiles, createSeededRng("shuffle-seed"));
    expect(shuffled.map((t) => t.color).sort()).toEqual(tiles.map((t) => t.color).sort());
  });

  it("is deterministic for the same seed", () => {
    const tiles = flatBoard(Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => i % 5));
    const a = shuffleColors(tiles, createSeededRng("same-seed"));
    const b = shuffleColors(tiles, createSeededRng("same-seed"));
    expect(a.map((t) => t.color)).toEqual(b.map((t) => t.color));
  });
});
