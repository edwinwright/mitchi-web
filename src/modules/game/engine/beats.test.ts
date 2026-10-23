import { describe, expect, it } from "vitest";
import { simulateGame } from "../testing";
import type { Action } from "./actions";
import { applyAction, createGame } from "./apply";
import { beatsOf, type Beat } from "./beats";
import type { GameEvent } from "./events";
import type { Die, GameConfig, GameState, Seat } from "./types";

const CONFIG = { seats: 4, pointLimit: 5 };

const R = (seat: Seat, ...values: Die[]): Action => ({
  type: "roll",
  seat,
  values,
  reason: null,
});
const K = (seat: Seat, die: 0 | 1, kept: boolean): Action => ({
  type: "keep",
  seat,
  die,
  kept,
});
const S = (seat: Seat): Action => ({ type: "stop", seat, reason: null });
const NEW: Action = { type: "newGame" };
const NEXT: Action = { type: "nextRound" };

/** The viewer wins the roll to start. */
const START = [NEW, R(0, 6), R(1, 3), R(2, 2), R(3, 1)];
/** The viewer's third roll ends their turn: limit 3, seat 1 to roll. */
const LIMIT_THREE = [...START, R(0, 3, 2), R(0, 4, 2), R(0, 6, 3)];
/** The viewer stops on their second roll: limit 2, seat 1 to roll. */
const LIMIT_TWO = [...START, R(0, 3, 2), R(0, 6, 3), S(0)];
/** Seat 3's 3-2 is the unique worst of a limit-1 round. */
const ROUND_ONE = [
  ...START,
  R(0, 6, 5),
  S(0),
  R(1, 4, 6),
  R(2, 3, 3),
  R(3, 3, 2),
];
/** Seats 0 and 1 tie on 3-1. */
const TIED = [...START, R(0, 3, 1), S(0), R(1, 1, 3), R(2, 6, 5), R(3, 6, 4)];

/** Plays `setup`, then returns the events of each action in `actions`. */
function eventsOf(
  setup: readonly Action[],
  actions: readonly Action[],
  config: GameConfig = CONFIG,
): GameEvent[][] {
  let state: GameState = createGame(config);
  const batches: GameEvent[][] = [];
  for (const [index, action] of [...setup, ...actions].entries()) {
    const result = applyAction(state, action);
    if (!result.ok) throw new Error(`Rejected ${result.rejection.code}`);
    state = result.state;
    if (index >= setup.length) batches.push([...result.events]);
  }
  return batches;
}

const kinds = (beats: readonly Beat[]) => beats.map((beat) => beat.kind);
const types = (beat: Beat) => beat.events.map((event) => event.type);

describe("beatsOf", () => {
  it("bot turn that stops", () => {
    const turn = eventsOf(LIMIT_THREE, [
      R(1, 5, 2),
      K(1, 0, true),
      R(1, 4),
      S(1),
    ]);
    const beats = beatsOf(turn.flat());
    expect(kinds(beats)).toStrictEqual([
      "rolled",
      "keepSet",
      "rolled",
      "turnEnded",
      "turnStarted",
    ]);
    expect(beats.map((beat) => beat.seat)).toStrictEqual([1, 1, 1, 1, 2]);
  });

  it("bot keep swap", () => {
    const setup = [...LIMIT_THREE, R(1, 5, 2), K(1, 0, true), R(1, 6)];
    const [unkeep, keep, reroll] = eventsOf(setup, [
      K(1, 0, false),
      K(1, 1, true),
      R(1, 3),
    ]);
    // The driver receives the two keeps as one batch.
    const beats = beatsOf([...unkeep, ...keep]);
    expect(kinds(beats)).toStrictEqual(["keepSwapped"]);
    expect(beats[0].seat).toBe(1);
    expect(beats[0].events).toMatchObject([
      { type: "keepSet", die: 0, kept: false },
      { type: "keepSet", die: 1, kept: true },
    ]);
    expect(kinds(beatsOf(reroll))[0]).toBe("rolled");
  });

  it("last roll with none left", () => {
    const [, last] = eventsOf(LIMIT_TWO, [R(1, 4, 2), R(1, 3, 2)]);
    const beats = beatsOf(last);
    expect(kinds(beats)).toStrictEqual(["rolled", "turnEnded", "turnStarted"]);
    expect(beats[1].events[0]).toMatchObject({ cause: "noRollsLeft" });
  });

  it("turn end carries limit, pot and worst-hand riders", () => {
    // The starter stops on a Mitchi: limit 1, the pot 2, the first worst hand.
    const [stop] = eventsOf([...START, R(0, 2, 1)], [S(0)]);
    const beats = beatsOf(stop);
    expect(kinds(beats)).toStrictEqual(["turnEnded", "turnStarted"]);
    expect(types(beats[0])).toStrictEqual([
      "turnEnded",
      "rollLimitSet",
      "potChanged",
      "worstHandChanged",
    ]);
  });

  it("turnStarted after turnEnded is its own beat", () => {
    const [stop] = eventsOf([...START, R(0, 6, 3)], [S(0)]);
    const beats = beatsOf(stop);
    expect(beats.at(-1)).toMatchObject({
      kind: "turnStarted",
      seat: 1,
      events: [{ type: "turnStarted", seat: 1, context: "round" }],
    });
  });

  it("round ends on a unique worst", () => {
    const [last] = eventsOf(ROUND_ONE.slice(0, -1), ROUND_ONE.slice(-1));
    expect(kinds(beatsOf(last))).toStrictEqual([
      "rolled",
      "turnEnded",
      "potTaken",
    ]);
    // At the point limit the game ends on a beat of its own.
    const [ending] = eventsOf(ROUND_ONE.slice(0, -1), ROUND_ONE.slice(-1), {
      seats: 4,
      pointLimit: 1,
    });
    expect(kinds(beatsOf(ending))).toStrictEqual([
      "rolled",
      "turnEnded",
      "potTaken",
      "gameEnded",
    ]);
  });

  it("round ends on a tie", () => {
    const [last, tieRoll, mitchi] = eventsOf(TIED.slice(0, -1), [
      ...TIED.slice(-1),
      R(1, 4, 3),
      R(0, 2, 1),
    ]);
    const beats = beatsOf(last);
    expect(kinds(beats)).toStrictEqual([
      "rolled",
      "turnEnded",
      "tieBreakStarted",
      "turnStarted",
    ]);
    expect(types(beats[2])).toStrictEqual(["tieBreakStarted", "potChanged"]);
    expect(beats[2].seat).toBeNull();
    expect(kinds(beatsOf(tieRoll))).toStrictEqual([
      "tieBreakRolled",
      "turnStarted",
    ]);
    // A tie-break Mitchi rides on its roll.
    expect(types(beatsOf(mitchi)[0])).toStrictEqual([
      "tieBreakRolled",
      "potChanged",
    ]);
  });

  it("game start", () => {
    const [start] = eventsOf([], [NEW]);
    expect(beatsOf(start)).toStrictEqual([
      { kind: "gameStarted", seat: null, events: start },
    ]);
    expect(start.map((event) => event.type)).toStrictEqual([
      "gameStarted",
      "rollOffStarted",
      "turnStarted",
    ]);
    const [first, second] = eventsOf([NEW], [R(0, 4), R(1, 3)]);
    expect(kinds(beatsOf(first))).toStrictEqual([
      "rollOffRolled",
      "turnStarted",
    ]);
    expect(kinds(beatsOf(second))).toStrictEqual([
      "rollOffRolled",
      "turnStarted",
    ]);
  });

  it("roll-off tie", () => {
    const [last] = eventsOf([NEW, R(0, 4), R(1, 4), R(2, 2)], [R(3, 1)]);
    const beats = beatsOf(last);
    expect(kinds(beats)).toStrictEqual([
      "rollOffRolled",
      "rollOffStarted",
      "turnStarted",
    ]);
    expect(beats[1]).toMatchObject({ seat: null, events: [{ tiedOn: 4 }] });
  });

  it("roll-off winner", () => {
    const [last] = eventsOf(START.slice(0, -1), START.slice(-1));
    const beats = beatsOf(last);
    expect(kinds(beats)).toStrictEqual([
      "rollOffRolled",
      "roundStarted",
      "turnStarted",
    ]);
    expect(beats[1].seat).toBe(0);
  });

  it("next round", () => {
    const [next] = eventsOf(ROUND_ONE, [NEXT]);
    expect(beatsOf(next)).toStrictEqual([
      { kind: "roundStarted", seat: 3, events: next },
    ]);
  });

  it("round 1 roundStarted does not absorb turnStarted", () => {
    const events: GameEvent[] = [
      { type: "roundStarted", round: 1, startingSeat: 2 },
      { type: "turnStarted", seat: 2, context: "round" },
    ];
    expect(kinds(beatsOf(events))).toStrictEqual([
      "roundStarted",
      "turnStarted",
    ]);
  });

  it("round 2 roundStarted absorbs turnStarted", () => {
    const events: GameEvent[] = [
      { type: "roundStarted", round: 2, startingSeat: 2 },
      { type: "turnStarted", seat: 2, context: "round" },
    ];
    expect(beatsOf(events)).toStrictEqual([
      { kind: "roundStarted", seat: 2, events },
    ]);
  });

  it("concatenation at a beat boundary equals concatenation of beats", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const stream: GameEvent[] = [];
      simulateGame(seed, {
        onStep: ({ result }) => {
          if (result.ok) stream.push(...result.events);
        },
      });
      const whole = beatsOf(stream);
      expect(whole.flatMap((beat) => beat.events)).toStrictEqual(stream);
      let cut = 0;
      for (const [index, beat] of whole.entries()) {
        if (index % 7 === 3) {
          const a = stream.slice(0, cut);
          const b = stream.slice(cut);
          expect([...beatsOf(a), ...beatsOf(b)]).toStrictEqual(whole);
        }
        cut += beat.events.length;
      }
    }
  });

  it("a rider as the first event throws", () => {
    expect(() =>
      beatsOf([{ type: "rollLimitSet", seat: 0, limit: 2 }]),
    ).toThrow("Corrupt log: rider with no beat");
  });

  it("beatsOf([]) is []", () => {
    expect(beatsOf([])).toStrictEqual([]);
  });
});

describe("keepSwapped", () => {
  const unkeep: GameEvent = { type: "keepSet", seat: 1, die: 0, kept: false };
  const keep: GameEvent = { type: "keepSet", seat: 1, die: 1, kept: true };

  it("separate batches are never merged", () => {
    expect(
      [...beatsOf([unkeep]), ...beatsOf([keep])].map((b) => b.kind),
    ).toStrictEqual(["keepSet", "keepSet"]);
    expect(kinds(beatsOf([unkeep, keep]))).toStrictEqual(["keepSwapped"]);
  });

  it("groups only a same-seat different-die false-then-true pair", () => {
    const pairs: [string, GameEvent, GameEvent][] = [
      ["true then false", { ...keep, die: 0 }, { ...unkeep, die: 1 }],
      ["the same die", unkeep, { ...keep, die: 0 }],
      ["another seat", unkeep, { ...keep, seat: 2 }],
      ["false then false", unkeep, { ...unkeep, die: 1 }],
    ];
    for (const [name, first, second] of pairs) {
      expect(kinds(beatsOf([first, second])), name).toStrictEqual([
        "keepSet",
        "keepSet",
      ]);
    }
  });
});
