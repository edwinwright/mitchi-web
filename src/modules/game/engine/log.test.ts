import { describe, expect, it } from "vitest";
import { appendEvents } from "./log";
import type { GameEvent } from "./events";

const GAME_STARTED: GameEvent = {
  type: "gameStarted",
  seats: 4,
  pointLimit: 5,
};
const OFF: GameEvent = { type: "rollOffStarted", seats: [0, 1, 2, 3] };
const ROUND = (round: number): GameEvent => ({
  type: "roundStarted",
  round,
  startingSeat: 0,
});
const TURN: GameEvent = { type: "turnStarted", seat: 0, context: "round" };

describe("appendEvents", () => {
  it("numbers events from the last seq", () => {
    const { log, seq } = appendEvents([], 0, [GAME_STARTED, OFF]);
    expect(log.map((e) => e.seq)).toStrictEqual([1, 2]);
    expect(seq).toBe(2);
    expect(
      appendEvents(log, seq, [ROUND(1)]).log.map((e) => e.seq),
    ).toStrictEqual([1, 2, 3]);
  });

  it("returns the same seq for no events", () => {
    const first = appendEvents([], 0, [GAME_STARTED]);
    const again = appendEvents(first.log, first.seq, []);
    expect(again.seq).toBe(first.seq);
    expect(again.log).toBe(first.log);
  });

  it("round 1 keeps the roll-off rows", () => {
    const first = appendEvents([], 0, [GAME_STARTED, OFF]);
    const { log } = appendEvents(first.log, first.seq, [ROUND(1), TURN]);
    expect(log.map((e) => e.type)).toStrictEqual([
      "gameStarted",
      "rollOffStarted",
      "roundStarted",
      "turnStarted",
    ]);
  });

  it("roundStarted after round 1 clears the log", () => {
    const first = appendEvents([], 0, [GAME_STARTED, OFF, ROUND(1), TURN]);
    const { log, seq } = appendEvents(first.log, first.seq, [ROUND(2), TURN]);
    expect(log.map((e) => e.type)).toStrictEqual([
      "roundStarted",
      "turnStarted",
    ]);
    expect(log.map((e) => e.seq)).toStrictEqual([5, 6]);
    expect(seq).toBe(6);
  });

  it("gameStarted clears the log and seq carries on", () => {
    const first = appendEvents([], 0, [GAME_STARTED, OFF, ROUND(1), TURN]);
    const { log } = appendEvents(first.log, first.seq, [GAME_STARTED, OFF]);
    expect(log.map((e) => e.seq)).toStrictEqual([5, 6]);
  });

  it("does not change the log it was given", () => {
    const first = appendEvents([], 0, [GAME_STARTED]);
    appendEvents(first.log, first.seq, [ROUND(2)]);
    expect(first.log).toHaveLength(1);
  });
});
