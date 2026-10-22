import { describe, expect, it } from "vitest";
import { appendEvents, appendReleased, stampEvents } from "./log";
import type { GameEvent } from "./events";

const GAME_STARTED: GameEvent = {
  type: "gameStarted",
  seats: 4,
  pointLimit: 5,
};
const OFF: GameEvent = {
  type: "rollOffStarted",
  seats: [0, 1, 2, 3],
  tiedOn: null,
};
const ROUND = (round: number): GameEvent => ({
  type: "roundStarted",
  round,
  startingSeat: 0,
});
const TURN: GameEvent = { type: "turnStarted", seat: 0, context: "round" };
const FIRST_TURN: GameEvent = {
  type: "turnStarted",
  seat: 0,
  context: "rollOff",
};
const LIMIT: GameEvent = { type: "rollLimitSet", seat: 0, limit: 2 };
const ENDED: GameEvent = {
  type: "turnEnded",
  seat: 0,
  dice: [6, 3],
  hand: "6-3",
  rollsUsed: 2,
  cause: "stop",
  reason: null,
};

describe("stampEvents", () => {
  it("numbers from seq + 1 and stamps each event with its beat's first seq", () => {
    const { events, seq } = stampEvents(10, [ENDED, LIMIT, TURN]);
    expect(events.map((e) => [e.type, e.seq, e.beat])).toStrictEqual([
      ["turnEnded", 11, 11],
      ["rollLimitSet", 12, 11],
      ["turnStarted", 13, 13],
    ]);
    expect(seq).toBe(13);
  });

  it("groups the game start as one beat", () => {
    const { events } = stampEvents(0, [GAME_STARTED, OFF, FIRST_TURN]);
    expect(events.map((e) => e.beat)).toStrictEqual([1, 1, 1]);
  });

  it("no events keeps the seq", () => {
    expect(stampEvents(4, [])).toStrictEqual({ events: [], seq: 4 });
  });
});

describe("appendReleased", () => {
  const stamped = (seq: number, events: GameEvent[]) =>
    stampEvents(seq, events).events;

  it("appends without renumbering", () => {
    const log = stamped(0, [GAME_STARTED, OFF, FIRST_TURN]);
    const more = stamped(3, [ROUND(1), TURN]);
    expect(appendReleased(log, more).map((e) => e.seq)).toStrictEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("empties the log on gameStarted and on roundStarted after round 1", () => {
    const log = stamped(0, [GAME_STARTED, OFF, FIRST_TURN, ROUND(1), TURN]);
    expect(
      appendReleased(log, stamped(5, [ROUND(2), TURN])).map((e) => e.seq),
    ).toStrictEqual([6, 7]);
    expect(
      appendReleased(log, stamped(5, [GAME_STARTED])).map((e) => e.seq),
    ).toStrictEqual([6]);
  });

  it("returns the same log for no events", () => {
    const log = stamped(0, [GAME_STARTED]);
    expect(appendReleased(log, [])).toBe(log);
  });
});

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
