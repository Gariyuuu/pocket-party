import { describe, expect, it } from "vitest";
import {
  generateRoomCode,
  normalizeRoomCode,
  isPlausibleRoomCode,
} from "@/lib/multiplayer/room-code";

describe("generateRoomCode", () => {
  it("produces a 6-character code without ambiguous characters", () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
    expect(code).not.toMatch(/[01OIL]/);
  });

  it("produces different codes across calls (extremely unlikely to collide)", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateRoomCode()));
    expect(codes.size).toBeGreaterThan(45);
  });
});

describe("normalizeRoomCode", () => {
  it("uppercases and strips non-alphanumeric characters", () => {
    expect(normalizeRoomCode(" ab-12 cd ")).toBe("AB12CD");
  });
});

describe("isPlausibleRoomCode", () => {
  it("requires exactly 6 characters", () => {
    expect(isPlausibleRoomCode("ABC123")).toBe(true);
    expect(isPlausibleRoomCode("ABC12")).toBe(false);
    expect(isPlausibleRoomCode("ABC1234")).toBe(false);
  });
});
