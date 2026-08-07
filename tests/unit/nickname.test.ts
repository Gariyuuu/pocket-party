import { describe, expect, it } from "vitest";
import { isValidNickname, sanitizeNickname, withCollisionSuffix } from "@/lib/validation/nickname";

describe("sanitizeNickname", () => {
  it("collapses internal whitespace and trims", () => {
    expect(sanitizeNickname("  Big   Bird  ")).toBe("Big Bird");
  });
});

describe("isValidNickname", () => {
  it("accepts ordinary names", () => {
    expect(isValidNickname("Gary")).toBe(true);
    expect(isValidNickname("O'Brien")).toBe(true);
    expect(isValidNickname("Player_2")).toBe(true);
  });

  it("rejects names that are too short", () => {
    expect(isValidNickname("a")).toBe(false);
  });

  it("rejects names that are too long", () => {
    expect(isValidNickname("a".repeat(25))).toBe(false);
  });

  it("rejects disallowed characters", () => {
    expect(isValidNickname("<script>")).toBe(false);
  });
});

describe("withCollisionSuffix", () => {
  it("leaves the first attempt untouched", () => {
    expect(withCollisionSuffix("Gary", 1)).toBe("Gary");
  });

  it("suffixes subsequent attempts", () => {
    expect(withCollisionSuffix("Gary", 2)).toBe("Gary (2)");
    expect(withCollisionSuffix("Gary", 3)).toBe("Gary (3)");
  });
});
