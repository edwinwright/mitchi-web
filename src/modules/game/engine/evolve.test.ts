import { describe, expect, it, vi } from "vitest";
import * as fixtures from "../testing";
import { simulateGame } from "../testing";
import type { GameEvent } from "./events";
import { applyEvent } from "./evolve";
import { clockwiseFrom } from "./order";
import type { GameState } from "./types";

// Every accepted action, in this file and in apply.test.ts when it runs
// below, also checks that folding its events reproduces its state.
const folds = vi.hoisted(() => ({ checked: 0 }));
vi.mock("./apply", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./apply")>();
  const { applyEvent: fold } = await import("./evolve");
  const { expect: expectFold } = await import("vitest");
  return {
    ...actual,
    applyAction: (...args: Parameters<typeof actual.applyAction>) => {
      const result = actual.applyAction(...args);
      if (result.ok) {
        expectFold(result.events.reduce(fold, args[0])).toStrictEqual(
          result.state,
        );
        folds.checked += 1;
      }
      return result;
    },
  };
});

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const roundTrip = <T>(value: T): T => JSON.parse(JSON.stringify(value));

type Step = {
  readonly before: GameState;
  readonly event: GameEvent;
  readonly after: GameState;
};

/** Every event of 100 seeded games, folded one at a time. */
function sample(): Step[] {
  const steps: Step[] = [];
  for (let seed = 1; seed <= 100; seed++) {
    simulateGame(seed, {
      onStep: ({ state, result }) => {
        if (!result.ok) return;
        let before = state;
        for (const event of result.events) {
          const after = applyEvent(before, event);
          steps.push({ before, event, after });
          before = after;
        }
      },
    });
  }
  return steps;
}

const STEPS = sample();

const EVENT_TYPES: GameEvent["type"][] = [
  "gameStarted",
  "rollOffStarted",
  "rollOffRolled",
  "roundStarted",
  "turnStarted",
  "rolled",
  "keepSet",
  "turnEnded",
  "rollLimitSet",
  "potChanged",
  "worstHandChanged",
  "tieBreakStarted",
  "tieBreakRolled",
  "potTaken",
  "gameEnded",
];

/** The Result column of the fold table, for one step. */
function expectResult({ before, event, after }: Step) {
  switch (event.type) {
    case "gameStarted":
      expect(after).toStrictEqual({
        config: { seats: event.seats, pointLimit: event.pointLimit },
        points: Array.from({ length: event.seats }, () => 0),
        round: null,
        phase: { kind: "notStarted" },
        acting: null,
      });
      return;
    case "rollOffStarted":
      expect(after).toStrictEqual({
        ...before,
        phase: { kind: "rollOff", seats: event.seats, rolled: [] },
        acting: null,
      });
      return;
    case "rollOffRolled":
      if (before.phase.kind !== "rollOff") throw new Error("not a roll-off");
      expect(after).toStrictEqual({
        ...before,
        phase: {
          ...before.phase,
          rolled: [
            ...before.phase.rolled,
            { seat: event.seat, die: event.die },
          ],
        },
        acting: null,
      });
      return;
    case "roundStarted":
      expect(after.round).toStrictEqual({
        number: event.round,
        startingSeat: event.startingSeat,
        order: clockwiseFrom(before.config.seats, event.startingSeat),
        rollLimit: null,
        finished: [],
        pot: 1,
        tieBreaks: 0,
        lastRoller: null,
        lastDirection: "clockwise",
      });
      expect(after.phase).toStrictEqual({
        kind: "turn",
        seat: event.startingSeat,
        rollsUsed: 0,
        dice: null,
        kept: [false, false],
      });
      expect(after.acting).toBeNull();
      return;
    case "turnStarted":
      expect(after.acting).toBe(event.seat);
      if (event.context === "round") {
        expect(after.phase).toStrictEqual({
          kind: "turn",
          seat: event.seat,
          rollsUsed: 0,
          dice: null,
          kept: [false, false],
        });
      } else {
        expect(after.phase).toBe(before.phase);
      }
      return;
    case "rolled":
      expect(after.phase).toStrictEqual({
        ...before.phase,
        rollsUsed: event.rollNumber,
        dice: event.dice,
      });
      expect(after.round?.lastRoller).toBe(event.seat);
      expect(after.acting).toBe(before.acting);
      return;
    case "keepSet": {
      if (before.phase.kind !== "turn") throw new Error("not a turn");
      const kept = [...before.phase.kept];
      kept[event.die] = event.kept;
      expect(after.phase).toStrictEqual({ ...before.phase, kept });
      return;
    }
    case "turnEnded":
      expect(after.round?.finished).toStrictEqual([
        ...(before.round?.finished ?? []),
        {
          seat: event.seat,
          dice: event.dice,
          hand: event.hand,
          rollsUsed: event.rollsUsed,
        },
      ]);
      expect(after.phase).toBe(before.phase);
      expect(after.acting).toBeNull();
      return;
    case "rollLimitSet":
      expect(after.round?.rollLimit).toBe(event.limit);
      return;
    case "potChanged":
      expect(after.round?.pot).toBe(event.pot);
      return;
    case "worstHandChanged":
      expect(after).toBe(before);
      return;
    case "tieBreakStarted":
      expect(after.phase).toStrictEqual({
        kind: "tieBreak",
        direction: event.direction,
        tiedOn: event.tiedOn,
        order: event.seats,
        rolled: [],
      });
      expect(after.round?.tieBreaks).toBe(event.number);
      expect(after.round?.lastDirection).toBe(event.direction);
      expect(after.acting).toBeNull();
      return;
    case "tieBreakRolled":
      if (before.phase.kind !== "tieBreak") throw new Error("not a tie-break");
      expect(after.phase).toStrictEqual({
        ...before.phase,
        rolled: [
          ...before.phase.rolled,
          { seat: event.seat, dice: event.dice, hand: event.hand },
        ],
      });
      expect(after.round?.lastRoller).toBe(event.seat);
      expect(after.acting).toBeNull();
      return;
    case "potTaken":
      expect(after.points[event.seat]).toBe(event.points);
      expect(after.phase).toStrictEqual({
        kind: "roundSummary",
        taker: event.seat,
        takerHand: event.hand,
      });
      expect(after.acting).toBeNull();
      return;
    case "gameEnded":
      expect(after.points).toStrictEqual(event.points);
      expect(after.phase).toStrictEqual({
        kind: "gameOver",
        winners: event.winners,
      });
      expect(after.round).toBe(before.round);
      expect(after.acting).toBeNull();
      return;
  }
}

describe("applyEvent", () => {
  it.each(EVENT_TYPES)("%s folds as the fold table says", (type) => {
    const steps = STEPS.filter((step) => step.event.type === type);
    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps) expectResult(step);
  });

  it("never mutates a deep-frozen input", () => {
    expect(STEPS.length).toBeGreaterThan(1000);
    for (const { before, event, after } of STEPS) {
      // A write to a frozen object throws in a module (strict mode).
      const folded = applyEvent(
        deepFreeze(roundTrip(before)),
        deepFreeze(roundTrip(event)),
      );
      expect(folded).toStrictEqual(after);
    }
  });

  it("returns plain JSON (JSON round-trip deep-equal)", () => {
    for (const { after } of STEPS) {
      expect(roundTrip(after)).toStrictEqual(after);
    }
  });

  it("worstHandChanged returns the same reference", () => {
    const state = fixtures.roundSummary.state;
    expect(
      applyEvent(state, { type: "worstHandChanged", hand: "3-1", seats: [0] }),
    ).toBe(state);
  });

  describe('throws "Corrupt log: …" for each out-of-sequence event in the Throws column', () => {
    const notStarted = fixtures.notStarted.state;
    const rollOff = fixtures.rollOff.state;
    const toRoll = fixtures.viewerToRoll.state;
    const rolled = fixtures.viewerRolledKeepable.state;
    const tieBreak = fixtures.tieBreakRunning.state;
    const summary = fixtures.roundSummary.state;
    const over = fixtures.gameOverUnique.state;
    const midTurn = { ...rolled, acting: null };

    const cases: [string, GameState, GameEvent][] = [
      [
        "gameStarted mid-game",
        toRoll,
        { type: "gameStarted", seats: 4, pointLimit: 5 },
      ],
      [
        "rollOffStarted in a turn",
        toRoll,
        { type: "rollOffStarted", seats: [0, 1], tiedOn: null },
      ],
      [
        "rollOffStarted before the pass is done",
        rollOff,
        { type: "rollOffStarted", seats: [0, 1], tiedOn: null },
      ],
      [
        "rollOffRolled in a turn",
        toRoll,
        { type: "rollOffRolled", seat: 0, die: 3 },
      ],
      [
        "rollOffRolled by a seat that is not acting",
        rollOff,
        { type: "rollOffRolled", seat: 2, die: 3 },
      ],
      [
        "turnStarted rollOff out of seat order",
        { ...rollOff, acting: null },
        { type: "turnStarted", seat: 3, context: "rollOff" },
      ],
      [
        "roundStarted 1 before the pass is done",
        rollOff,
        { type: "roundStarted", round: 1, startingSeat: 0 },
      ],
      [
        "roundStarted 2 for a seat that is not the taker",
        summary,
        { type: "roundStarted", round: 2, startingSeat: 0 },
      ],
      [
        "roundStarted 3 after round 1",
        summary,
        { type: "roundStarted", round: 3, startingSeat: 3 },
      ],
      [
        "turnStarted while a seat is acting",
        toRoll,
        { type: "turnStarted", seat: 1, context: "round" },
      ],
      [
        "turnStarted for a seat out of order",
        midTurn,
        { type: "turnStarted", seat: 3, context: "round" },
      ],
      [
        "turnStarted tieBreak in a turn",
        midTurn,
        { type: "turnStarted", seat: 1, context: "tieBreak" },
      ],
      [
        "rolled by a seat that is not acting",
        toRoll,
        {
          type: "rolled",
          seat: 1,
          dice: [3, 4],
          hand: "4-3",
          rollNumber: 1,
          previous: null,
          kept: [false, false],
          reason: null,
        },
      ],
      [
        "rolled with the wrong roll number",
        toRoll,
        {
          type: "rolled",
          seat: 0,
          dice: [3, 4],
          hand: "4-3",
          rollNumber: 2,
          previous: null,
          kept: [false, false],
          reason: null,
        },
      ],
      [
        "keepSet with no dice",
        toRoll,
        { type: "keepSet", seat: 0, die: 0, kept: true },
      ],
      [
        "turnEnded with no dice",
        toRoll,
        {
          type: "turnEnded",
          seat: 0,
          dice: [3, 4],
          hand: "4-3",
          rollsUsed: 1,
          cause: "stop",
          reason: null,
        },
      ],
      [
        "rollLimitSet with no round",
        notStarted,
        { type: "rollLimitSet", seat: 0, limit: 2 },
      ],
      [
        "potChanged with no round",
        notStarted,
        { type: "potChanged", pot: 2, previous: 1, cause: "mitchi" },
      ],
      [
        "tieBreakStarted before every seat has finished",
        midTurn,
        {
          type: "tieBreakStarted",
          number: 1,
          seats: [1, 0],
          direction: "anticlockwise",
          tiedOn: "3-1",
        },
      ],
      [
        "tieBreakRolled by a seat that is not acting",
        tieBreak,
        { type: "tieBreakRolled", seat: 3, dice: [3, 4], hand: "4-3" },
      ],
      [
        "potTaken before every seat has finished",
        midTurn,
        {
          type: "potTaken",
          seat: 0,
          pot: 1,
          points: 1,
          tieBreaks: 0,
          hand: "3-1",
        },
      ],
      [
        "gameEnded outside a round summary",
        over,
        { type: "gameEnded", winners: [0], points: [0, 0, 0, 5] },
      ],
    ];

    it.each(cases)("%s", (_, state, event) => {
      expect(() => applyEvent(state, event)).toThrow(/^Corrupt log: /);
    });
  });
});

describe("the fold of each scripted game in apply.test.ts equals applyAction's state", async () => {
  await import("./apply.test");
  it("checked the fold of every accepted action", () => {
    expect(folds.checked).toBeGreaterThan(100);
  });
});
