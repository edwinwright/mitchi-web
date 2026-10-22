import { describe, expect, it } from "vitest";
import { DELAY_MS, ROLL_MS } from "./pacing";

describe("tables", () => {
  it("has the agreed values", () => {
    expect(DELAY_MS).toStrictEqual({ normal: 1200, fast: 400 });
    expect(ROLL_MS).toStrictEqual({ normal: 500, fast: 200 });
  });

  it("ROLL_MS[s] < DELAY_MS[s] for every speed", () => {
    for (const speed of Object.keys(DELAY_MS) as (keyof typeof DELAY_MS)[]) {
      expect(ROLL_MS[speed]).toBeLessThan(DELAY_MS[speed]);
    }
  });
});
