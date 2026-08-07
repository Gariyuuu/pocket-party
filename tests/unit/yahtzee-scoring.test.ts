import { describe, expect, it } from "vitest";
import { scoreForCategory, totalScore, upperSectionSubtotal, UPPER_BONUS, UPPER_BONUS_THRESHOLD } from "@/games/yahtzee/scoring";

describe("scoreForCategory", () => {
  it("scores the upper section as count times face value", () => {
    expect(scoreForCategory([1, 1, 3, 4, 5], "ones")).toBe(2);
    expect(scoreForCategory([6, 6, 6, 2, 3], "sixes")).toBe(18);
  });

  it("scores three/four of a kind as the sum of all dice, or zero if not met", () => {
    expect(scoreForCategory([3, 3, 3, 5, 6], "threeOfKind")).toBe(20);
    expect(scoreForCategory([3, 3, 5, 5, 6], "threeOfKind")).toBe(0);
    expect(scoreForCategory([4, 4, 4, 4, 2], "fourOfKind")).toBe(18);
    expect(scoreForCategory([4, 4, 4, 2, 2], "fourOfKind")).toBe(0);
  });

  it("scores a full house as 25, and rejects anything else", () => {
    expect(scoreForCategory([2, 2, 5, 5, 5], "fullHouse")).toBe(25);
    expect(scoreForCategory([2, 2, 2, 2, 5], "fullHouse")).toBe(0);
    expect(scoreForCategory([1, 2, 3, 4, 5], "fullHouse")).toBe(0);
  });

  it("scores small and large straights correctly", () => {
    expect(scoreForCategory([1, 2, 3, 4, 6], "smallStraight")).toBe(30);
    expect(scoreForCategory([2, 3, 4, 5, 5], "smallStraight")).toBe(30);
    expect(scoreForCategory([1, 2, 3, 5, 6], "smallStraight")).toBe(0);
    expect(scoreForCategory([1, 2, 3, 4, 5], "largeStraight")).toBe(40);
    expect(scoreForCategory([2, 3, 4, 5, 6], "largeStraight")).toBe(40);
    expect(scoreForCategory([1, 2, 3, 4, 4], "largeStraight")).toBe(0);
  });

  it("scores a Yahtzee as 50, and anything else as zero", () => {
    expect(scoreForCategory([4, 4, 4, 4, 4], "yahtzee")).toBe(50);
    expect(scoreForCategory([4, 4, 4, 4, 3], "yahtzee")).toBe(0);
  });

  it("scores chance as the plain sum, always", () => {
    expect(scoreForCategory([1, 1, 1, 1, 1], "chance")).toBe(5);
    expect(scoreForCategory([6, 6, 6, 6, 6], "chance")).toBe(30);
  });
});

describe("totalScore", () => {
  it("adds the upper-section bonus once the subtotal reaches 63", () => {
    const scores = { ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 }; // subtotal 63
    expect(upperSectionSubtotal(scores)).toBe(UPPER_BONUS_THRESHOLD);
    expect(totalScore(scores)).toBe(UPPER_BONUS_THRESHOLD + UPPER_BONUS);
  });

  it("gives no bonus just under the threshold", () => {
    const scores = { ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 17 }; // subtotal 62
    expect(totalScore(scores)).toBe(62);
  });

  it("sums every filled category, including zeros", () => {
    expect(totalScore({ ones: 0, chance: 12, yahtzee: 50 })).toBe(62);
  });
});
