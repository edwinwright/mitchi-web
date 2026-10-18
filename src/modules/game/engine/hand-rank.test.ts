import { describe, expect, it } from "vitest";
import { HANDS } from "@/data/hands";
import { handFromDice, isMitchi, rankOf } from "./hand-rank";
import type { Die } from "./types";

const FACES: readonly Die[] = [1, 2, 3, 4, 5, 6];
const PAIRS = FACES.flatMap((a) => FACES.map((b) => [a, b] as const));

describe("handFromDice", () => {
  it("maps all 36 dice pairs to one of the 21 hands", () => {
    expect(PAIRS).toHaveLength(36);
    const ids = new Set(PAIRS.map((pair) => handFromDice(pair)));
    expect(ids).toEqual(new Set(HANDS.map((hand) => hand.id)));
  });

  it("is order-insensitive", () => {
    for (const [a, b] of PAIRS) {
      expect(handFromDice([a, b])).toBe(handFromDice([b, a]));
    }
  });

  it("reads the higher die first", () => {
    expect(handFromDice([1, 3])).toBe("3-1");
    expect(handFromDice([5, 6])).toBe("6-5");
  });
});

describe("rankOf", () => {
  it("is the index of the hand in HANDS, read never restated", () => {
    for (const pair of PAIRS) {
      const hand = handFromDice(pair);
      expect(rankOf(hand)).toBe(HANDS.findIndex((h) => h.id === hand));
    }
  });

  it("ranks the Mitchi best and three-one worst", () => {
    expect(rankOf("2-1")).toBe(0);
    expect(rankOf("3-1")).toBe(HANDS.length - 1);
  });
});

describe("isMitchi", () => {
  it("is true only for 2-1", () => {
    const mitchis = HANDS.filter((hand) => isMitchi(hand.id));
    expect(mitchis.map((hand) => hand.id)).toEqual(["2-1"]);
  });
});
