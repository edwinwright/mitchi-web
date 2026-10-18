import { describe, expect, it } from "vitest";
import type { Action, RejectionCode } from "./actions";
import { applyAction, createGame } from "./apply";
import type { GameEvent } from "./events";
import type { Die, GameState, Phase, RoundState, Seat } from "./types";

const CONFIG = { seats: 4, pointLimit: 5 };

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function ok(state: GameState, action: Action) {
  const result = applyAction(state, action);
  if (!result.ok) throw new Error(`Rejected ${result.rejection.code}`);
  return result;
}

function started(): GameState {
  return ok(createGame(CONFIG), { type: "newGame" }).state;
}

function roll(seat: Seat, die: Die): Action {
  return { type: "roll", seat, values: [die], reason: null };
}

/** Applies the rolls in order and returns the final state and every event. */
function play(state: GameState, rolls: readonly (readonly [Seat, Die])[]) {
  const events: GameEvent[] = [];
  let current = state;
  for (const [seat, die] of rolls) {
    const result = ok(current, roll(seat, die));
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events };
}

function expectRejected(
  state: GameState,
  action: unknown,
  code: RejectionCode,
) {
  const result = applyAction(state, action as Action);
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.rejection.code).toBe(code);
  expect(result.state).toBe(state);
}

const ROUND: RoundState = {
  number: 1,
  startingSeat: 0,
  order: [0, 1, 2, 3],
  rollLimit: null,
  finished: [],
  pot: 1,
  tieBreaks: 0,
  lastRoller: null,
  lastDirection: "clockwise",
};

function turn(
  overrides: Partial<Extract<Phase, { kind: "turn" }>> = {},
): GameState {
  return deepFreeze({
    config: CONFIG,
    points: [0, 0, 0, 0],
    round: ROUND,
    phase: {
      kind: "turn",
      seat: 0,
      rollsUsed: 0,
      dice: null,
      kept: [false, false],
      ...overrides,
    },
  });
}

describe("createGame", () => {
  it("starts notStarted with zero points and no round", () => {
    expect(createGame(CONFIG)).toStrictEqual({
      config: CONFIG,
      points: [0, 0, 0, 0],
      round: null,
      phase: { kind: "notStarted" },
    });
  });

  it("throws on a bad config", () => {
    expect(() => createGame({ seats: 1, pointLimit: 5 })).toThrow();
    expect(() => createGame({ seats: 4.5, pointLimit: 5 })).toThrow();
    expect(() => createGame({ seats: 4, pointLimit: 0 })).toThrow();
  });
});

describe("newGame", () => {
  it("newGame from notStarted starts the roll to start with every seat", () => {
    const result = ok(deepFreeze(createGame(CONFIG)), { type: "newGame" });
    expect(result.state.phase).toStrictEqual({
      kind: "rollOff",
      seats: [0, 1, 2, 3],
      rolled: [],
    });
    expect(result.events).toStrictEqual([
      { type: "gameStarted", seats: 4, pointLimit: 5 },
      { type: "rollOffStarted", seats: [0, 1, 2, 3] },
    ]);
  });

  it("newGame from gameOver resets the points and the round", () => {
    const over: GameState = deepFreeze({
      config: CONFIG,
      points: [5, 1, 2, 3],
      round: ROUND,
      phase: { kind: "gameOver", winners: [1] },
    });
    const result = ok(over, { type: "newGame" });
    expect(result.state.points).toStrictEqual([0, 0, 0, 0]);
    expect(result.state.round).toBeNull();
    expect(result.state.phase.kind).toBe("rollOff");
  });
});

describe("roll-off", () => {
  it("roll-off: highest die starts round 1", () => {
    const { state, events } = play(deepFreeze(started()), [
      [0, 3],
      [1, 6],
      [2, 2],
      [3, 5],
    ]);
    expect(state.round).toMatchObject({
      number: 1,
      startingSeat: 1,
      order: [1, 2, 3, 0],
      pot: 1,
      rollLimit: null,
    });
    expect(state.phase).toStrictEqual({
      kind: "turn",
      seat: 1,
      rollsUsed: 0,
      dice: null,
      kept: [false, false],
    });
    expect(events.slice(-2)).toStrictEqual([
      { type: "roundStarted", round: 1, startingSeat: 1 },
      { type: "turnStarted", seat: 1, context: "round" },
    ]);
  });

  it("roll-off: rolls accepted in any order", () => {
    const dice: Record<Seat, Die> = { 0: 3, 1: 6, 2: 2, 3: 5 };
    const inOrder = play(
      started(),
      [0, 1, 2, 3].map((s) => [s, dice[s]] as const),
    );
    const shuffled = play(
      started(),
      [2, 0, 3, 1].map((s) => [s, dice[s]] as const),
    );
    expect(shuffled.state).toStrictEqual(inOrder.state);
  });

  it("roll-off: tied highest roll again among themselves", () => {
    const { state, events } = play(deepFreeze(started()), [
      [0, 4],
      [1, 4],
      [2, 2],
      [3, 1],
    ]);
    expect(events.at(-1)).toStrictEqual({
      type: "rollOffStarted",
      seats: [0, 1],
    });
    expect(state.phase).toStrictEqual({
      kind: "rollOff",
      seats: [0, 1],
      rolled: [],
    });
    expect(state.round).toBeNull();
    expectRejected(state, roll(2, 3), "notYourTurn");
    expectRejected(state, roll(3, 3), "notYourTurn");
    expect(ok(state, roll(1, 3)).events).toStrictEqual([
      { type: "rollOffRolled", seat: 1, die: 3 },
    ]);
  });

  it("roll-off: three passes", () => {
    const { state, events } = play(deepFreeze(started()), [
      // Pass 1: 0, 1 and 3 tie on 5.
      [0, 5],
      [1, 5],
      [2, 1],
      [3, 5],
      // Pass 2: 0 and 1 tie on 4.
      [3, 3],
      [1, 4],
      [0, 4],
      // Pass 3: 1 beats 0.
      [0, 2],
      [1, 6],
    ]);
    expect(
      events.flatMap((e) => (e.type === "rollOffStarted" ? [e.seats] : [])),
    ).toStrictEqual([
      [0, 1, 3],
      [0, 1],
    ]);
    expect(state.round?.startingSeat).toBe(1);
  });

  it("roll-off: no pot and no round before round 1", () => {
    let current = deepFreeze(started());
    const events: GameEvent[] = [];
    for (const [seat, die] of [
      [0, 4],
      [1, 4],
      [2, 2],
      [3, 1],
      [0, 2],
    ] as const) {
      expect(current.round).toBeNull();
      const result = ok(current, roll(seat, die));
      current = result.state;
      events.push(...result.events);
    }
    expect(current.round).toBeNull();
    expect(
      events.some((e) => e.type === "potChanged" || e.type === "roundStarted"),
    ).toBe(false);
    expect(current.points).toStrictEqual([0, 0, 0, 0]);
  });
});

describe("rejections", () => {
  it("rejection: second roll in a roll-off pass is notYourTurn", () => {
    const { state } = play(started(), [[0, 3]]);
    expectRejected(deepFreeze(state), roll(0, 4), "notYourTurn");
  });

  it("rejection: seat outside the roll-off pass is notYourTurn", () => {
    const { state } = play(started(), [
      [0, 4],
      [1, 4],
      [2, 2],
      [3, 1],
    ]);
    expectRejected(deepFreeze(state), roll(3, 4), "notYourTurn");
  });

  it("rejection: wrongDiceCount", () => {
    const state = deepFreeze(started());
    expectRejected(
      state,
      { type: "roll", seat: 0, values: [], reason: null },
      "wrongDiceCount",
    );
    expectRejected(
      state,
      { type: "roll", seat: 0, values: [1, 2], reason: null },
      "wrongDiceCount",
    );
    expectRejected(
      state,
      { type: "roll", seat: 0, reason: null },
      "wrongDiceCount",
    );
    expectRejected(
      turn(),
      { type: "roll", seat: 0, values: [3], reason: null },
      "wrongDiceCount",
    );
    expectRejected(
      turn({ rollsUsed: 1, dice: [3, 4], kept: [true, false] }),
      { type: "roll", seat: 0, values: [3, 4], reason: null },
      "wrongDiceCount",
    );
  });

  it("rejection: invalidDie", () => {
    const state = deepFreeze(started());
    for (const bad of [0, 7, 2.5, -1, "3", null, NaN]) {
      expectRejected(
        state,
        { type: "roll", seat: 0, values: [bad], reason: null },
        "invalidDie",
      );
    }
    const midTurn = turn({ rollsUsed: 1, dice: [3, 4] });
    expectRejected(
      midTurn,
      { type: "keep", seat: 0, die: 2, kept: true },
      "invalidDie",
    );
    expectRejected(
      midTurn,
      { type: "keep", seat: 0, die: 0, kept: "yes" },
      "invalidDie",
    );
  });

  it("rejection: unknownAction", () => {
    const state = deepFreeze(started());
    expectRejected(state, { type: "shake", seat: 0 }, "unknownAction");
    expectRejected(state, {}, "unknownAction");
  });

  it("rejection: unknownSeat", () => {
    const state = deepFreeze(started());
    for (const seat of [-1, 4, 1.5, "0", null, undefined, NaN]) {
      expectRejected(
        state,
        { type: "roll", seat, values: [3], reason: null },
        "unknownSeat",
      );
    }
  });

  it("rejection: wrongPhase", () => {
    const fresh = deepFreeze(createGame(CONFIG));
    const rolling = deepFreeze(started());
    expectRejected(fresh, { type: "nextRound" }, "wrongPhase");
    expectRejected(fresh, roll(0, 3), "wrongPhase");
    expectRejected(rolling, { type: "newGame" }, "wrongPhase");
    expectRejected(rolling, { type: "nextRound" }, "wrongPhase");
    expectRejected(
      rolling,
      { type: "stop", seat: 0, reason: null },
      "wrongPhase",
    );
    expectRejected(
      rolling,
      { type: "keep", seat: 0, die: 0, kept: true },
      "wrongPhase",
    );
    const tieBreak: GameState = deepFreeze({
      config: CONFIG,
      points: [0, 0, 0, 0],
      round: ROUND,
      phase: {
        kind: "tieBreak",
        direction: "anticlockwise",
        tiedOn: "3-1",
        order: [1, 0],
        rolled: [],
      },
    });
    expectRejected(
      tieBreak,
      { type: "stop", seat: 1, reason: null },
      "wrongPhase",
    );
    expectRejected(
      tieBreak,
      { type: "keep", seat: 1, die: 0, kept: true },
      "wrongPhase",
    );
    const summary: GameState = deepFreeze({
      config: CONFIG,
      points: [1, 0, 0, 0],
      round: ROUND,
      phase: { kind: "roundSummary", taker: 0, takerHand: "3-1" },
    });
    expectRejected(summary, roll(0, 3), "wrongPhase");
  });

  it("rejection: notYourTurn in a turn and a tie-break", () => {
    expectRejected(
      turn(),
      { type: "roll", seat: 1, values: [3, 4], reason: null },
      "notYourTurn",
    );
    const tieBreak: GameState = deepFreeze({
      config: CONFIG,
      points: [0, 0, 0, 0],
      round: ROUND,
      phase: {
        kind: "tieBreak",
        direction: "anticlockwise",
        tiedOn: "3-1",
        order: [1, 0],
        rolled: [],
      },
    });
    expectRejected(
      tieBreak,
      { type: "roll", seat: 0, values: [3, 4], reason: null },
      "notYourTurn",
    );
  });

  it("rejection: noDiceRolled", () => {
    expectRejected(
      turn(),
      { type: "stop", seat: 0, reason: null },
      "noDiceRolled",
    );
    expectRejected(
      turn(),
      { type: "keep", seat: 0, die: 0, kept: true },
      "noDiceRolled",
    );
  });

  it("rejection: noRollsLeft", () => {
    const state = turn({ rollsUsed: 3, dice: [3, 4] });
    expectRejected(
      state,
      { type: "roll", seat: 0, values: [3, 4], reason: null },
      "noRollsLeft",
    );
  });

  it("rejection: bothKept", () => {
    const state = turn({ rollsUsed: 1, dice: [3, 4], kept: [true, true] });
    expectRejected(
      state,
      { type: "roll", seat: 0, values: [], reason: null },
      "bothKept",
    );
  });

  it("rejection precedence", () => {
    const rolling = deepFreeze(started());
    const alreadyRolled = deepFreeze(play(started(), [[0, 3]]).state);
    // 1 unknownAction over 3 unknownSeat
    expectRejected(rolling, { type: "shake", seat: 99 }, "unknownAction");
    // 2 wrongPhase over a seat that is out of range (control actions carry no seat)
    expectRejected(rolling, { type: "nextRound", seat: 99 }, "wrongPhase");
    // 3 unknownSeat over 4 wrongPhase
    expectRejected(
      rolling,
      { type: "stop", seat: 99, reason: null },
      "unknownSeat",
    );
    // 4 wrongPhase over 5 notYourTurn
    expectRejected(
      alreadyRolled,
      { type: "stop", seat: 0, reason: null },
      "wrongPhase",
    );
    // 5 notYourTurn over 9 wrongDiceCount
    expectRejected(
      alreadyRolled,
      { type: "roll", seat: 0, values: [1, 2], reason: null },
      "notYourTurn",
    );
    // 5 notYourTurn over 6 noDiceRolled
    expectRejected(
      turn(),
      { type: "stop", seat: 1, reason: null },
      "notYourTurn",
    );
    // 6 noDiceRolled over 10 invalidDie
    expectRejected(
      turn(),
      { type: "keep", seat: 0, die: 5, kept: true },
      "noDiceRolled",
    );
    // 7 noRollsLeft over 8 bothKept
    expectRejected(
      turn({ rollsUsed: 3, dice: [3, 4], kept: [true, true] }),
      { type: "roll", seat: 0, values: [], reason: null },
      "noRollsLeft",
    );
    // 8 bothKept over 9 wrongDiceCount
    expectRejected(
      turn({ rollsUsed: 1, dice: [3, 4], kept: [true, true] }),
      { type: "roll", seat: 0, values: [1, 2], reason: null },
      "bothKept",
    );
    // 9 wrongDiceCount over 10 invalidDie
    expectRejected(
      rolling,
      { type: "roll", seat: 0, values: [9, 9], reason: null },
      "wrongDiceCount",
    );
  });

  it("malformed input never throws", () => {
    const states = [
      deepFreeze(createGame(CONFIG)),
      deepFreeze(started()),
      turn(),
      turn({ rollsUsed: 1, dice: [3, 4], kept: [true, false] }),
    ];
    const junk: unknown[] = [
      undefined,
      null,
      42,
      "roll",
      [],
      {},
      { type: null },
      { type: "roll" },
      { type: "roll", seat: {} },
      { type: "roll", seat: 0, values: "34" },
      { type: "roll", seat: 0, values: [{}] },
      { type: "roll", seat: 0, values: [1.5], reason: 7 },
      { type: "keep", seat: 0 },
      { type: "keep", seat: 0, die: "0", kept: 1 },
      { type: "stop", seat: Infinity },
      { type: "newGame", seat: "x" },
      { type: "__proto__" },
      Object.create(null),
    ];
    for (const state of states) {
      for (const action of junk) {
        expect(() => applyAction(state, action as Action)).not.toThrow();
        const result = applyAction(state, action as Action);
        if (!result.ok) expect(result.state).toBe(state);
      }
    }
  });
});
