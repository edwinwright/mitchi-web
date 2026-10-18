import { describe, expect, it } from "vitest";
import { clockwiseFrom, opposite, orderFrom } from "./order";

describe("opposite", () => {
  it("swaps the direction", () => {
    expect(opposite("clockwise")).toBe("anticlockwise");
    expect(opposite("anticlockwise")).toBe("clockwise");
  });
});

describe("clockwiseFrom", () => {
  it("lists every seat from the starter, wrapping", () => {
    expect(clockwiseFrom(4, 0)).toEqual([0, 1, 2, 3]);
    expect(clockwiseFrom(4, 2)).toEqual([2, 3, 0, 1]);
  });
});

describe("orderFrom", () => {
  it("walks clockwise from a seat in the set, wrapping", () => {
    expect(orderFrom(4, 2, "clockwise", [0, 2, 3])).toEqual([2, 3, 0]);
  });

  it("walks anticlockwise from a seat in the set, wrapping", () => {
    expect(orderFrom(4, 1, "anticlockwise", [0, 1, 3])).toEqual([1, 0, 3]);
  });

  it("starts at a seat outside the set and skips it", () => {
    expect(orderFrom(4, 2, "clockwise", [0, 1])).toEqual([0, 1]);
    expect(orderFrom(4, 2, "anticlockwise", [0, 1, 3])).toEqual([1, 0, 3]);
  });

  it("keeps only the seats in the set, whatever order they are given in", () => {
    expect(orderFrom(4, 0, "clockwise", [3, 1])).toEqual([1, 3]);
  });

  it("orderFrom: four-seat worked example", () => {
    // Round started by seat 2 (order 2, 3, 0, 1), so the last roller is 1.
    const round = clockwiseFrom(4, 2);
    expect(round).toEqual([2, 3, 0, 1]);
    const lastRoller = round[round.length - 1];

    // Seats 0, 1 and 3 tie. Tie-break 1 runs anticlockwise from 1.
    const first = orderFrom(4, lastRoller, opposite("clockwise"), [0, 1, 3]);
    expect(first).toEqual([1, 0, 3]);

    // Seats 1 and 3 tie again. Tie-break 2 runs clockwise from 3.
    const second = orderFrom(4, first[first.length - 1], "clockwise", [1, 3]);
    expect(second).toEqual([3, 1]);
  });

  it("throws on a broken precondition", () => {
    expect(() => orderFrom(4, 4, "clockwise", [0])).toThrow("Corrupt state");
    expect(() => orderFrom(4, 0, "clockwise", [])).toThrow("Corrupt state");
    expect(() => orderFrom(4, 0, "clockwise", [5])).toThrow("Corrupt state");
    expect(() => orderFrom(0, 0, "clockwise", [0])).toThrow("Corrupt state");
  });
});
