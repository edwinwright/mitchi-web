import { describe, expect, it } from "vitest";
import type { Speed } from "../engine";
import { DELAY_MS, ROLL_MS } from "./pacing";

const SPEEDS: readonly Speed[] = ["slow", "normal", "fast"];

describe("tables", () => {
  it("DELAY_MS is slow 2000, normal 1200, fast 400", () => {
    expect(DELAY_MS).toStrictEqual({ slow: 2000, normal: 1200, fast: 400 });
  });

  it("ROLL_MS is 800, 500, 200", () => {
    expect(ROLL_MS).toStrictEqual({ slow: 800, normal: 500, fast: 200 });
  });

  it("both tables have exactly the three keys", () => {
    expect(Object.keys(DELAY_MS).toSorted()).toStrictEqual(SPEEDS.toSorted());
    expect(Object.keys(ROLL_MS).toSorted()).toStrictEqual(SPEEDS.toSorted());
  });

  it("ROLL_MS[s] < DELAY_MS[s] for every speed", () => {
    for (const speed of SPEEDS) {
      expect(ROLL_MS[speed]).toBeLessThan(DELAY_MS[speed]);
    }
  });
});
