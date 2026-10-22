import { describe, expect, it } from "vitest";
import type { Action, RejectionCode } from "./actions";
import { applyAction, createGame } from "./apply";
import type { GameEvent } from "./events";
import * as select from "./select";
import type {
  Die,
  GameConfig,
  GameState,
  Phase,
  RoundState,
  Seat,
} from "./types";

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
    acting: overrides.seat ?? 0,
  });
}

describe("createGame", () => {
  it("starts notStarted with zero points and no round", () => {
    expect(createGame(CONFIG)).toStrictEqual({
      config: CONFIG,
      points: [0, 0, 0, 0],
      round: null,
      phase: { kind: "notStarted" },
      acting: null,
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
    expect(result.state.acting).toBe(0);
    expect(result.events).toStrictEqual([
      { type: "gameStarted", seats: 4, pointLimit: 5 },
      { type: "rollOffStarted", seats: [0, 1, 2, 3], tiedOn: null },
      { type: "turnStarted", seat: 0, context: "rollOff" },
    ]);
  });

  it("newGame from gameOver resets the points and the round", () => {
    const over: GameState = deepFreeze({
      config: CONFIG,
      points: [5, 1, 2, 3],
      round: ROUND,
      phase: { kind: "gameOver", winners: [1] },
      acting: null,
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

  it("a roll out of seat order is notYourTurn", () => {
    const state = deepFreeze(started());
    expect(state.acting).toBe(0);
    expectRejected(state, roll(2, 3), "notYourTurn");
    const after = ok(state, roll(0, 3)).state;
    expectRejected(after, roll(0, 3), "notYourTurn");
  });

  it("acting seat may roll, others may not on every pass", () => {
    // Pass 1: 1 and 3 tie on 4. Pass 2: 3 beats 1.
    let current = deepFreeze(started());
    for (const [seat, die] of [
      [0, 2],
      [1, 4],
      [2, 1],
      [3, 4],
      [1, 2],
      [3, 5],
    ] as const) {
      expect(select.toRoll(current)).toStrictEqual([seat]);
      for (const other of [0, 1, 2, 3].filter((s) => s !== seat)) {
        expectRejected(current, roll(other, die), "notYourTurn");
      }
      current = deepFreeze(ok(current, roll(seat, die)).state);
    }
    expect(current.round?.startingSeat).toBe(3);
  });

  it("emits turnStarted for each seat in order, the winner beats and roundStarted+turnStarted last", () => {
    const start = ok(deepFreeze(createGame(CONFIG)), { type: "newGame" });
    const rolls = play(start.state, [
      [0, 6],
      [1, 3],
      [2, 2],
      [3, 1],
    ]);
    expect([...start.events, ...rolls.events]).toStrictEqual([
      { type: "gameStarted", seats: 4, pointLimit: 5 },
      { type: "rollOffStarted", seats: [0, 1, 2, 3], tiedOn: null },
      { type: "turnStarted", seat: 0, context: "rollOff" },
      { type: "rollOffRolled", seat: 0, die: 6 },
      { type: "turnStarted", seat: 1, context: "rollOff" },
      { type: "rollOffRolled", seat: 1, die: 3 },
      { type: "turnStarted", seat: 2, context: "rollOff" },
      { type: "rollOffRolled", seat: 2, die: 2 },
      { type: "turnStarted", seat: 3, context: "rollOff" },
      { type: "rollOffRolled", seat: 3, die: 1 },
      { type: "roundStarted", round: 1, startingSeat: 0 },
      { type: "turnStarted", seat: 0, context: "round" },
    ]);
  });

  it("tied highest roll again among the tied, tiedOn is the face, turnStarted last", () => {
    const before = play(deepFreeze(started()), [
      [0, 2],
      [1, 4],
      [2, 1],
    ]);
    const { state, events } = ok(before.state, roll(3, 4));
    expect(events).toStrictEqual([
      { type: "rollOffRolled", seat: 3, die: 4 },
      { type: "rollOffStarted", seats: [1, 3], tiedOn: 4 },
      { type: "turnStarted", seat: 1, context: "rollOff" },
    ]);
    expect(state.phase).toStrictEqual({
      kind: "rollOff",
      seats: [1, 3],
      rolled: [],
    });
    expect(state.acting).toBe(1);
    expect(state.round).toBeNull();
    expectRejected(state, roll(0, 3), "notYourTurn");
    expectRejected(state, roll(2, 3), "notYourTurn");
    expectRejected(state, roll(3, 3), "notYourTurn");
    expect(ok(state, roll(1, 3)).events).toStrictEqual([
      { type: "rollOffRolled", seat: 1, die: 3 },
      { type: "turnStarted", seat: 3, context: "rollOff" },
    ]);
  });

  it("three passes roll in ascending seat order", () => {
    const { state, events } = play(deepFreeze(started()), [
      // Pass 1: 0, 1 and 3 tie on 5.
      [0, 5],
      [1, 5],
      [2, 1],
      [3, 5],
      // Pass 2: 0 and 1 tie on 4.
      [0, 4],
      [1, 4],
      [3, 3],
      // Pass 3: 1 beats 0.
      [0, 2],
      [1, 6],
    ]);
    expect(
      events.flatMap((e) =>
        e.type === "rollOffStarted" ? [[e.seats, e.tiedOn]] : [],
      ),
    ).toStrictEqual([
      [[0, 1, 3], 5],
      [[0, 1], 4],
    ]);
    expect(
      events.flatMap((e) =>
        e.type === "turnStarted" && e.context === "rollOff" ? [e.seat] : [],
      ),
    ).toStrictEqual([1, 2, 3, 0, 1, 3, 0, 1]);
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
      acting: 1,
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
      acting: null,
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
      acting: 1,
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

// Main-round turns. Seat 0 starts every game below (roll-off 6, 3, 2, 1).
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

function inRound(...actions: Action[]) {
  let state = deepFreeze(started());
  const events: GameEvent[] = [];
  for (const action of [R(0, 6), R(1, 3), R(2, 2), R(3, 1), ...actions]) {
    const result = ok(state, action);
    state = deepFreeze(result.state);
    events.push(...result.events);
  }
  return { state, events };
}

function turnPhase(state: GameState) {
  if (state.phase.kind !== "turn") throw new Error("Not in a turn");
  return state.phase;
}

/** Events from the last action of a sequence. */
function lastStep(...actions: Action[]) {
  const before = inRound(...actions.slice(0, -1));
  return ok(before.state, actions[actions.length - 1]);
}

const types = (events: readonly GameEvent[]) => events.map((e) => e.type);

describe("keep and roll", () => {
  it("keep: set, roll one die, stays kept", () => {
    const { state, events } = inRound(R(0, 5, 2), K(0, 0, true), R(0, 3));
    expect(turnPhase(state)).toMatchObject({
      dice: [5, 3],
      kept: [true, false],
      rollsUsed: 2,
    });
    expect(events.at(-2)).toStrictEqual({
      type: "keepSet",
      seat: 0,
      die: 0,
      kept: true,
    });
    expect(events.at(-1)).toMatchObject({
      type: "rolled",
      dice: [5, 3],
      previous: { dice: [5, 2], hand: "5-2" },
      kept: [true, false],
    });
  });

  it("roll: kept slot retains value", () => {
    const { state } = inRound(R(0, 2, 6), K(0, 1, true), R(0, 4));
    expect(turnPhase(state).dice).toStrictEqual([4, 6]);
    expect(turnPhase(state).kept).toStrictEqual([false, true]);
  });

  it("roll: no keep re-rolls both dice", () => {
    const { state } = inRound(R(0, 5, 2), R(0, 3, 4));
    expect(turnPhase(state).dice).toStrictEqual([3, 4]);
  });

  it("keep: false clears", () => {
    const { state, events } = inRound(
      R(0, 5, 2),
      K(0, 0, true),
      K(0, 0, false),
    );
    expect(turnPhase(state).kept).toStrictEqual([false, false]);
    expect(events.at(-1)).toStrictEqual({
      type: "keepSet",
      seat: 0,
      die: 0,
      kept: false,
    });
  });

  it("keep: both dice can be kept", () => {
    const { state } = inRound(R(0, 5, 2), K(0, 0, true), K(0, 1, true));
    expect(turnPhase(state).kept).toStrictEqual([true, true]);
  });

  it("keep: same flag is idempotent", () => {
    const { state } = inRound(R(0, 5, 2), K(0, 0, true));
    for (const action of [K(0, 0, true), K(0, 1, false)]) {
      const result = ok(state, action);
      expect(result.state).toBe(state);
      expect(result.events).toStrictEqual([]);
    }
  });

  it("keep: flags reset at turn start", () => {
    const { state } = inRound(R(0, 5, 2), K(0, 0, true), S(0));
    expect(turnPhase(state)).toMatchObject({
      seat: 1,
      dice: null,
      kept: [false, false],
    });
  });

  it("rejection: bothKept", () => {
    const { state } = inRound(R(0, 5, 2), K(0, 0, true), K(0, 1, true));
    expectRejected(state, R(0), "bothKept");
  });

  it("rejection: noDiceRolled in a live round", () => {
    const { state } = inRound();
    expectRejected(state, S(0), "noDiceRolled");
    expectRejected(state, K(0, 0, true), "noDiceRolled");
  });
});

describe("the roll limit", () => {
  it("turn: starter stops after one roll sets limit 1", () => {
    const { state, events } = inRound(R(0, 6, 5), S(0));
    expect(events.slice(-5, -2)).toMatchObject([
      { type: "rolled" },
      { type: "turnEnded", cause: "stop", rollsUsed: 1 },
      { type: "rollLimitSet", seat: 0, limit: 1 },
    ]);
    expect(state.round?.rollLimit).toBe(1);
  });

  it("turn: starter stops after two rolls sets limit 2", () => {
    const { state, events } = inRound(R(0, 3, 2), R(0, 6, 3), S(0));
    expect(events.find((e) => e.type === "rollLimitSet")).toStrictEqual({
      type: "rollLimitSet",
      seat: 0,
      limit: 2,
    });
    expect(state.round?.rollLimit).toBe(2);
  });

  it("turn: starter's third roll ends turn and sets limit 3", () => {
    const { state, events } = inRound(R(0, 3, 2), R(0, 4, 2), R(0, 6, 3));
    expect(events.slice(-5, -1)).toMatchObject([
      { type: "rolled", rollNumber: 3 },
      { type: "turnEnded", cause: "noRollsLeft", rollsUsed: 3 },
      { type: "rollLimitSet", limit: 3 },
      { type: "worstHandChanged" },
    ]);
    expect(state.round?.rollLimit).toBe(3);
    expect(turnPhase(state).seat).toBe(1);
  });

  it("turn: non-starter is ended at the limit", () => {
    const afterStarter = inRound(R(0, 3, 2), R(0, 6, 3), S(0));
    const midway = ok(afterStarter.state, R(1, 4, 2));
    expect(types(midway.events)).toStrictEqual(["rolled"]);
    const last = ok(midway.state, R(1, 5, 6));
    expect(types(last.events)).toStrictEqual([
      "rolled",
      "turnEnded",
      "turnStarted",
    ]);
    expect(last.events[1]).toMatchObject({
      cause: "noRollsLeft",
      rollsUsed: 2,
      seat: 1,
    });
    expect(turnPhase(last.state).seat).toBe(2);
  });

  it("turn: limit 1 non-starter has no decisions", () => {
    const { events, state } = lastStep(R(0, 6, 5), S(0), R(1, 3, 2));
    expect(events).toMatchObject([
      { type: "rolled", seat: 1, rollNumber: 1, previous: null },
      { type: "turnEnded", seat: 1, cause: "noRollsLeft", rollsUsed: 1 },
      { type: "worstHandChanged" },
      { type: "turnStarted", seat: 2 },
    ]);
    expect(turnPhase(state)).toMatchObject({ seat: 2, dice: null });
  });
});

describe("worst hand so far", () => {
  const worstEvents = (events: readonly GameEvent[]) =>
    events.filter((e) => e.type === "worstHandChanged");

  it("worst hand so far: first finisher", () => {
    const { events } = lastStep(R(0, 6, 5), S(0));
    expect(worstEvents(events)).toStrictEqual([
      { type: "worstHandChanged", hand: "6-5", seats: [0] },
    ]);
  });

  it("worst hand so far: worse hand replaces", () => {
    const { events } = lastStep(R(0, 6, 5), S(0), R(1, 4, 6));
    expect(worstEvents(events)).toStrictEqual([
      { type: "worstHandChanged", hand: "6-4", seats: [1] },
    ]);
  });

  it("worst hand so far: better hand changes nothing", () => {
    const { events } = lastStep(R(0, 6, 5), S(0), R(1, 4, 6), R(2, 3, 3));
    expect(worstEvents(events)).toStrictEqual([]);
    expect(types(events)).toStrictEqual(["rolled", "turnEnded", "turnStarted"]);
  });

  it("worst hand so far: tie extends holders", () => {
    const { events } = lastStep(R(0, 5, 6), S(0), R(1, 6, 5));
    expect(worstEvents(events)).toStrictEqual([
      { type: "worstHandChanged", hand: "6-5", seats: [0, 1] },
    ]);
  });
});

describe("the pot", () => {
  it("pot: starts at 1", () => {
    expect(inRound().state.round?.pot).toBe(1);
    expect(inRound(R(0, 6, 5), S(0), R(1, 4, 6)).state.round?.pot).toBe(1);
  });

  it("pot: one Mitchi replaces 1", () => {
    const { state, events } = lastStep(R(0, 2, 1), S(0));
    expect(types(events)).toStrictEqual([
      "turnEnded",
      "rollLimitSet",
      "potChanged",
      "worstHandChanged",
      "turnStarted",
    ]);
    expect(events[2]).toStrictEqual({
      type: "potChanged",
      pot: 2,
      previous: 1,
      cause: "mitchi",
    });
    expect(state.round?.pot).toBe(2);
  });

  it("pot: two Mitchis give 4", () => {
    const { state, events } = lastStep(R(0, 2, 1), S(0), R(1, 1, 2));
    expect(events.find((e) => e.type === "potChanged")).toStrictEqual({
      type: "potChanged",
      pot: 4,
      previous: 2,
      cause: "mitchi",
    });
    expect(state.round?.pot).toBe(4);
  });

  it("pot: a Mitchi mid-turn does not change the pot", () => {
    const { state, events } = lastStep(R(0, 2, 1));
    expect(types(events)).toStrictEqual(["rolled"]);
    expect(state.round?.pot).toBe(1);
  });

  it("pot: a Mitchi re-rolled away does not count", () => {
    const { state, events } = inRound(R(0, 2, 1), R(0, 4, 3), S(0));
    expect(types(events)).not.toContain("potChanged");
    expect(state.round?.pot).toBe(1);
  });

  it("pot: a Mitchi counts once, when the turn ends", () => {
    const { state, events } = inRound(R(0, 2, 6), K(0, 0, true), R(0, 1), S(0));
    expect(turnPhase(state).seat).toBe(1);
    expect(events.filter((e) => e.type === "potChanged")).toHaveLength(1);
    expect(state.round?.pot).toBe(2);
  });
});

describe("event ordering", () => {
  it("events: a final roll gives rolled then turnEnded noRollsLeft", () => {
    const { events } = lastStep(R(0, 3, 2), R(0, 4, 2), R(0, 6, 3));
    expect(events.slice(0, 2)).toMatchObject([
      { type: "rolled" },
      { type: "turnEnded", cause: "noRollsLeft" },
    ]);
  });

  it("events: a starter's turnEnded is followed by rollLimitSet", () => {
    const { events } = lastStep(R(0, 6, 5), S(0));
    const ended = types(events).indexOf("turnEnded");
    expect(events[ended + 1].type).toBe("rollLimitSet");
  });

  it("events: a Mitchi turn end gives turnEnded, rollLimitSet, then potChanged", () => {
    const { events } = lastStep(R(0, 2, 1), S(0));
    expect(types(events).slice(0, 3)).toStrictEqual([
      "turnEnded",
      "rollLimitSet",
      "potChanged",
    ]);
    const second = lastStep(R(0, 6, 5), S(0), R(1, 2, 1));
    expect(types(second.events).slice(0, 3)).toStrictEqual([
      "rolled",
      "turnEnded",
      "potChanged",
    ]);
  });

  it("events: rolled is never followed directly by potChanged", () => {
    const { events } = inRound(R(0, 3, 2), R(0, 4, 2), R(0, 2, 1), R(1, 1, 2));
    events.forEach((event, i) => {
      if (event.type === "rolled") {
        expect(events[i + 1]?.type).not.toBe("potChanged");
      }
    });
    expect(types(events)).toContain("potChanged");
  });

  it("events: turnStarted is the last event of a step that hands over the turn", () => {
    for (const actions of [
      [R(0, 6, 5), S(0)],
      [R(0, 2, 1), S(0)],
      [R(0, 3, 2), R(0, 4, 2), R(0, 6, 3)],
      [R(0, 6, 5), S(0), R(1, 3, 2)],
    ]) {
      const { events } = lastStep(...actions);
      expect(events.at(-1)).toMatchObject({
        type: "turnStarted",
        context: "round",
      });
    }
  });

  it("events: round 1 starts with roundStarted then turnStarted", () => {
    const { events } = inRound();
    expect(events.slice(-2)).toMatchObject([
      { type: "roundStarted", round: 1, startingSeat: 0 },
      { type: "turnStarted", seat: 0, context: "round" },
    ]);
  });
});

describe("the lastRoller", () => {
  it("is written by each roll", () => {
    expect(inRound().state.round?.lastRoller).toBeNull();
    expect(inRound(R(0, 6, 5)).state.round?.lastRoller).toBe(0);
    expect(inRound(R(0, 6, 5), S(0), R(1, 4, 6)).state.round?.lastRoller).toBe(
      1,
    );
  });
});

// Round resolution and tie-breaks. A roll limit of 1 makes every non-starter's
// turn a single roll, so a round is five short steps. Seat 0 starts unless noted.
const NEXT: Action = { type: "nextRound" };
const BIG = { seats: 4, pointLimit: 25 };

function inGame(config: GameConfig, ...actions: Action[]) {
  let state = deepFreeze(ok(createGame(config), { type: "newGame" }).state);
  const events: GameEvent[] = [];
  const rollOffDice: Die[] = [6, 3, 2, 1];
  const opening = rollOffDice
    .slice(0, config.seats)
    .map((d, seat) => R(seat, d));
  for (const action of [...opening, ...actions]) {
    const result = ok(state, action);
    state = deepFreeze(result.state);
    events.push(...result.events);
  }
  return { state, events };
}

function inBig(...actions: Action[]) {
  return inGame(BIG, ...actions);
}

/** The events of the final action of a sequence, from a 25-point four-seat game. */
function lastBig(...actions: Action[]) {
  const before = inBig(...actions.slice(0, -1));
  return ok(before.state, actions[actions.length - 1]);
}

/** Round one of a limit-1 round ending with seat 3's 3-2 as the unique worst. */
const UNIQUE_WORST = [R(0, 6, 5), S(0), R(1, 4, 6), R(2, 3, 3), R(3, 3, 2)];
/** Seats 0 and 1 tie on 3-1; seats 2 and 3 are better. Seat 3 rolled last. */
const TIED_NOT_LAST = [R(0, 3, 1), S(0), R(1, 1, 3), R(2, 6, 5), R(3, 6, 4)];
/** All four on 3-1. */
const ALL_TIED = [R(0, 3, 1), S(0), R(1, 3, 1), R(2, 3, 1), R(3, 3, 1)];

function tieBreakStarts(events: readonly GameEvent[]) {
  return events.flatMap((e) => (e.type === "tieBreakStarted" ? [e] : []));
}

describe("round resolution", () => {
  it("round: unique worst takes pot and starts next round", () => {
    const { events, state } = lastBig(...UNIQUE_WORST);
    expect(types(events)).toStrictEqual([
      "rolled",
      "turnEnded",
      "worstHandChanged",
      "potTaken",
    ]);
    expect(events.at(-1)).toStrictEqual({
      type: "potTaken",
      seat: 3,
      pot: 1,
      points: 1,
      tieBreaks: 0,
      hand: "3-2",
    });
    expect(state.points).toStrictEqual([0, 0, 0, 1]);
    expect(state.phase).toStrictEqual({
      kind: "roundSummary",
      taker: 3,
      takerHand: "3-2",
    });

    const next = ok(state, NEXT);
    expect(next.events).toStrictEqual([
      { type: "roundStarted", round: 2, startingSeat: 3 },
      { type: "turnStarted", seat: 3, context: "round" },
    ]);
    expect(next.state.round).toStrictEqual({
      number: 2,
      startingSeat: 3,
      order: [3, 0, 1, 2],
      rollLimit: null,
      finished: [],
      pot: 1,
      tieBreaks: 0,
      lastRoller: null,
      lastDirection: "clockwise",
    });
    expect(turnPhase(next.state)).toMatchObject({ seat: 3, dice: null });
    expect(next.state.points).toStrictEqual([0, 0, 0, 1]);
  });

  it("turn: limit does not carry into the next round", () => {
    const { state } = inBig(...UNIQUE_WORST);
    expect(state.round?.rollLimit).toBe(1);
    const next = ok(state, NEXT).state;
    expect(select.rollLimit(next).set).toBeNull();
    expect(select.rollsLeft(next)).toBe(3);
  });

  it("round: roundSummary awaits nextRound", () => {
    const { state } = inBig(...UNIQUE_WORST);
    for (const seat of [0, 1, 2, 3]) {
      expect(select.allowedIntents(state, seat)).toStrictEqual({
        roll: false,
        setKeep: false,
        stop: false,
        nextRound: true,
        newGame: false,
      });
    }
    expectRejected(state, R(3, 3, 4), "wrongPhase");
    expectRejected(state, S(3), "wrongPhase");
    expectRejected(state, K(3, 0, true), "wrongPhase");
    expectRejected(state, { type: "newGame" }, "wrongPhase");
  });

  it("round: the points add up across rounds", () => {
    const first = inBig(...UNIQUE_WORST).state;
    const second = ok(first, NEXT).state;
    const done = [R(3, 3, 2), S(3), R(0, 6, 5), R(1, 6, 4), R(2, 3, 3)];
    let state = second;
    for (const action of done) state = ok(state, action).state;
    expect(state.points).toStrictEqual([0, 0, 0, 2]);
  });
});

describe("potTaken", () => {
  it("carries the hand of the pot taker", () => {
    const unique = inBig(...UNIQUE_WORST);
    expect(unique.events.at(-1)).toMatchObject({
      type: "potTaken",
      seat: 3,
      hand: "3-2",
    });

    // Tie-break 1 runs [1, 0]: seat 0's 3-2 is the unique worst.
    const tieBreak = inBig(...TIED_NOT_LAST, R(1, 6, 5), R(0, 3, 2));
    expect(tieBreak.events.at(-1)).toMatchObject({
      type: "potTaken",
      seat: 0,
      tieBreaks: 1,
      hand: "3-2",
    });
  });
});

describe("tie-breaks", () => {
  it("events: tieBreakStarted, potChanged tieBreak, turnStarted", () => {
    const { events } = lastBig(...TIED_NOT_LAST);
    expect(types(events).slice(-3)).toStrictEqual([
      "tieBreakStarted",
      "potChanged",
      "turnStarted",
    ]);
    expect(events.slice(-2)).toStrictEqual([
      { type: "potChanged", pot: 2, previous: 1, cause: "tieBreak" },
      { type: "turnStarted", seat: 1, context: "tieBreak" },
    ]);
  });

  it("pot: rules example A three-way tie gives 2", () => {
    const config = { seats: 3, pointLimit: 25 };
    const tie = [R(0, 3, 1), S(0), R(1, 1, 3), R(2, 3, 1)];
    const before = inGame(config, ...tie.slice(0, -1));
    const { events, state } = ok(before.state, tie[tie.length - 1]);
    expect(events).toStrictEqual([
      expect.objectContaining({ type: "rolled" }),
      expect.objectContaining({ type: "turnEnded" }),
      { type: "worstHandChanged", hand: "3-1", seats: [0, 1, 2] },
      {
        type: "tieBreakStarted",
        number: 1,
        seats: [2, 1, 0],
        direction: "anticlockwise",
        tiedOn: "3-1",
      },
      { type: "potChanged", pot: 2, previous: 1, cause: "tieBreak" },
      { type: "turnStarted", seat: 2, context: "tieBreak" },
    ]);
    expect(state.points).toStrictEqual([0, 0, 0]);

    // The unique worst in the tie-break takes 2.
    const rolls = [R(2, 4, 3), R(1, 6, 2), R(0, 5, 4)];
    let current = state;
    let last: GameEvent[] = [];
    for (const roll of rolls) {
      const result = ok(current, roll);
      current = result.state;
      last = [...result.events];
    }
    expect(last).toStrictEqual([
      expect.objectContaining({ type: "tieBreakRolled", seat: 0 }),
      {
        type: "potTaken",
        seat: 2,
        pot: 2,
        points: 2,
        tieBreaks: 1,
        hand: "4-3",
      },
    ]);
    expect(current.points).toStrictEqual([0, 0, 2]);
    expect(current.phase).toStrictEqual({
      kind: "roundSummary",
      taker: 2,
      takerHand: "4-3",
    });
  });

  it("pot: rules example B chain 1 2 4 8", () => {
    const pots: number[] = [];
    let { state } = inBig(R(0, 6, 5), S(0), R(1, 3, 1), R(2, 1, 3), R(3, 3, 1));
    pots.push(state.round?.pot ?? 0);
    expect(state.phase).toMatchObject({ kind: "tieBreak", order: [3, 2, 1] });

    // Tie-break 1: a Mitchi adds 2 as it lands, then 3 and 1 tie on 4-3.
    const first = ok(state, R(3, 4, 3));
    expect(types(first.events)).toStrictEqual([
      "tieBreakRolled",
      "turnStarted",
    ]);
    const mitchi = ok(first.state, R(2, 2, 1));
    expect(mitchi.events).toStrictEqual([
      expect.objectContaining({ type: "tieBreakRolled", seat: 2 }),
      { type: "potChanged", pot: 4, previous: 2, cause: "mitchi" },
      { type: "turnStarted", seat: 1, context: "tieBreak" },
    ]);
    pots.push(mitchi.state.round?.pot ?? 0);
    const tiedAgain = ok(mitchi.state, R(1, 3, 4));
    expect(tiedAgain.events).toStrictEqual([
      expect.objectContaining({ type: "tieBreakRolled", seat: 1 }),
      {
        type: "tieBreakStarted",
        number: 2,
        seats: [1, 3],
        direction: "clockwise",
        tiedOn: "4-3",
      },
      { type: "potChanged", pot: 8, previous: 4, cause: "tieBreak" },
      { type: "turnStarted", seat: 1, context: "tieBreak" },
    ]);
    state = tiedAgain.state;
    pots.push(state.round?.pot ?? 0);

    // Tie-break 2: the unique worst takes 8.
    state = ok(state, R(1, 5, 4)).state;
    const last = ok(state, R(3, 3, 2));
    expect(last.events.at(-1)).toStrictEqual({
      type: "potTaken",
      seat: 3,
      pot: 8,
      points: 8,
      tieBreaks: 2,
      hand: "3-2",
    });
    expect(pots).toStrictEqual([2, 4, 8]);
    expect(last.state.points).toStrictEqual([0, 0, 0, 8]);
  });

  it("tie-break direction alternates", () => {
    const { events } = inBig(
      ...ALL_TIED,
      ...[3, 2, 1, 0].map((s) => R(s, 3, 1)),
      ...[0, 1, 2, 3].map((s) => R(s, 3, 1)),
    );
    expect(tieBreakStarts(events).map((e) => e.direction)).toStrictEqual([
      "anticlockwise",
      "clockwise",
      "anticlockwise",
    ]);
  });

  it("tie-break: four-seat worked example", () => {
    // Seat 2 starts (order 2, 3, 0, 1), so seat 1 rolls last. 0, 1 and 3 tie.
    let state = deepFreeze(started());
    const events: GameEvent[] = [];
    for (const action of [
      R(0, 3),
      R(1, 2),
      R(2, 6),
      R(3, 1),
      R(2, 6, 5),
      S(2),
      R(3, 3, 1),
      R(0, 3, 1),
      R(1, 3, 1),
      // Tie-break 1 runs [1, 0, 3]: 1 and 3 tie on 4-3.
      R(1, 4, 3),
      R(0, 6, 2),
      R(3, 4, 3),
      // Tie-break 2 runs [3, 1].
    ]) {
      const result = ok(state, action);
      state = deepFreeze(result.state);
      events.push(...result.events);
    }
    expect(
      tieBreakStarts(events).map((e) => [e.number, e.seats, e.direction]),
    ).toStrictEqual([
      [1, [1, 0, 3], "anticlockwise"],
      [2, [3, 1], "clockwise"],
    ]);
    expect(state.phase).toMatchObject({ kind: "tieBreak", order: [3, 1] });
  });

  it("tie-break: last roller not in tie-break", () => {
    const { state, events } = inBig(...TIED_NOT_LAST);
    expect(state.round?.lastRoller).toBe(3);
    expect(tieBreakStarts(events)[0]).toMatchObject({
      number: 1,
      seats: [1, 0],
      direction: "anticlockwise",
    });
    expect(select.inContest(state, 2)).toBe(false);
    expect(select.inContest(state, 1)).toBe(true);
    expect(select.actingSeat(state)).toBe(1);
  });

  it("tie-break: keep and stop rejected", () => {
    const { state } = inBig(...TIED_NOT_LAST);
    expectRejected(state, K(1, 0, true), "wrongPhase");
    expectRejected(state, S(1), "wrongPhase");
    expectRejected(state, R(1, 3), "wrongDiceCount");
    expectRejected(state, R(1, 3, 4, 5), "wrongDiceCount");
    expectRejected(state, R(1), "wrongDiceCount");
    expectRejected(state, R(0, 3, 4), "notYourTurn");
    expectRejected(state, R(2, 3, 4), "notYourTurn");
    expect(select.allowedIntents(state, 1)).toMatchObject({
      roll: true,
      setKeep: false,
      stop: false,
    });
  });

  it("tie-break: three consecutive with all four tied", () => {
    const { state, events } = inBig(
      ...ALL_TIED,
      ...[3, 2, 1, 0].map((s) => R(s, 3, 1)),
      ...[0, 1, 2, 3].map((s) => R(s, 3, 1)),
      // Tie-break 3 runs [3, 2, 1, 0]: seat 2 is the unique worst.
      R(3, 6, 5),
      R(2, 3, 1),
      R(1, 6, 5),
      R(0, 6, 5),
    );
    expect(tieBreakStarts(events).map((e) => e.direction)).toStrictEqual([
      "anticlockwise",
      "clockwise",
      "anticlockwise",
    ]);
    expect(
      events.flatMap((e) =>
        e.type === "potChanged" && e.cause === "tieBreak" ? [e.pot] : [],
      ),
    ).toStrictEqual([2, 4, 8]);
    expect(events.at(-1)).toStrictEqual({
      type: "potTaken",
      seat: 2,
      pot: 8,
      points: 8,
      tieBreaks: 3,
      hand: "3-1",
    });
    expect(state.points).toStrictEqual([0, 0, 8, 0]);
  });

  it("tie-break: all tied players roll Mitchi tie again", () => {
    const { state } = inBig(...TIED_NOT_LAST);
    expect(state.round?.pot).toBe(2);
    const first = ok(state, R(1, 2, 1));
    expect(first.state.round?.pot).toBe(4);
    const second = ok(first.state, R(0, 1, 2));
    expect(second.events).toStrictEqual([
      expect.objectContaining({ type: "tieBreakRolled", seat: 0 }),
      { type: "potChanged", pot: 6, previous: 4, cause: "mitchi" },
      expect.objectContaining({
        type: "tieBreakStarted",
        number: 2,
        tiedOn: "2-1",
      }),
      { type: "potChanged", pot: 12, previous: 6, cause: "tieBreak" },
      { type: "turnStarted", seat: 0, context: "tieBreak" },
    ]);
    expect(second.state.round?.pot).toBe(12);
    expect(second.state.points).toStrictEqual([0, 0, 0, 0]);
  });

  it("pot: all four Mitchis tie then double", () => {
    const mitchis = [R(0, 2, 1), S(0), R(1, 2, 1), R(2, 2, 1)];
    expect(inBig(...mitchis).state.round?.pot).toBe(6);
    const { events, state } = lastBig(...mitchis, R(3, 2, 1));
    expect(events).toStrictEqual([
      expect.objectContaining({ type: "rolled" }),
      expect.objectContaining({ type: "turnEnded" }),
      { type: "potChanged", pot: 8, previous: 6, cause: "mitchi" },
      { type: "worstHandChanged", hand: "2-1", seats: [0, 1, 2, 3] },
      expect.objectContaining({ type: "tieBreakStarted", number: 1 }),
      { type: "potChanged", pot: 16, previous: 8, cause: "tieBreak" },
      { type: "turnStarted", seat: 3, context: "tieBreak" },
    ]);
    expect(state.round?.pot).toBe(16);
    expect(state.points).toStrictEqual([0, 0, 0, 0]);
  });

  it("events: a tie-break Mitchi gives tieBreakRolled then potChanged", () => {
    const { state } = inBig(...TIED_NOT_LAST);
    const { events } = ok(state, R(1, 1, 2));
    expect(types(events).slice(0, 2)).toStrictEqual([
      "tieBreakRolled",
      "potChanged",
    ]);
  });

  it("events: turnStarted is the last event of a tie-break step that hands over", () => {
    const { state } = inBig(...ALL_TIED);
    const { events } = ok(state, R(3, 4, 3));
    expect(events.at(-1)).toStrictEqual({
      type: "turnStarted",
      seat: 2,
      context: "tieBreak",
    });
  });

  it("a tie-break stays pure: the input state is not changed", () => {
    const { state } = inBig(...ALL_TIED);
    const snapshot = JSON.stringify(state);
    ok(state, R(3, 4, 3));
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

// The game end. Plays all but the last action, sets the points the scenario
// needs, then applies the last one. Limit 5, four seats, seat 0 starts.
function endingWith(points: number[], ...actions: Action[]) {
  const before = inGame(CONFIG, ...actions.slice(0, -1));
  const state = deepFreeze({ ...before.state, points });
  return ok(state, actions[actions.length - 1]);
}

describe("game end", () => {
  it("game end: points exactly equal to limit ends game", () => {
    const { state, events } = endingWith([4, 2, 3, 4], ...UNIQUE_WORST);
    expect(state.points).toStrictEqual([4, 2, 3, 5]);
    expect(state.phase).toStrictEqual({ kind: "gameOver", winners: [1] });
    expect(types(events)).not.toContain("roundSummary");
    expect(events.slice(-2)).toStrictEqual([
      {
        type: "potTaken",
        seat: 3,
        pot: 1,
        points: 5,
        tieBreaks: 0,
        hand: "3-2",
      },
      { type: "gameEnded", winners: [1], points: [4, 2, 3, 5] },
    ]);
  });

  it("game end: tie-break pushes player past limit", () => {
    // The tie-break pot is 2, so seat 1 goes from 4 to 6: uncapped.
    const { state, events } = endingWith(
      [3, 4, 3, 3],
      ...TIED_NOT_LAST,
      R(1, 4, 3),
      R(0, 6, 2),
    );
    expect(state.points).toStrictEqual([3, 6, 3, 3]);
    expect(state.phase.kind).toBe("gameOver");
    expect(events.at(-2)).toMatchObject({
      type: "potTaken",
      seat: 1,
      pot: 2,
      points: 6,
    });
  });

  it("game end: limit reached by unique fewest", () => {
    const { state, events } = endingWith([4, 2, 3, 4], ...UNIQUE_WORST);
    expect(state.phase).toStrictEqual({ kind: "gameOver", winners: [1] });
    expect(events.at(-1)).toMatchObject({ type: "gameEnded", winners: [1] });
  });

  it("game end: tied fewest is a draw", () => {
    const two = endingWith([2, 1, 1, 4], ...UNIQUE_WORST);
    expect(two.state.phase).toStrictEqual({
      kind: "gameOver",
      winners: [1, 2],
    });
    expect(two.events.at(-1)).toMatchObject({
      type: "gameEnded",
      winners: [1, 2],
    });
    const three = endingWith([1, 1, 1, 4], ...UNIQUE_WORST);
    expect(three.state.phase).toStrictEqual({
      kind: "gameOver",
      winners: [0, 1, 2],
    });
  });

  it("game end: the final taker is never a winner", () => {
    const { state } = endingWith([4, 4, 4, 4], ...UNIQUE_WORST);
    expect(state.phase).toStrictEqual({ kind: "gameOver", winners: [0, 1, 2] });
  });

  it("game end: the round is kept, and only newGame is allowed", () => {
    const { state } = endingWith([4, 2, 3, 4], ...UNIQUE_WORST);
    expect(state.round?.number).toBe(1);
    expect(select.allowedIntents(state, 0)).toMatchObject({
      newGame: true,
      nextRound: false,
      roll: false,
    });
    expectRejected(state, NEXT, "wrongPhase");
    expectRejected(state, R(3, 3, 4), "wrongPhase");
  });

  it("game end: a game that has not reached the limit goes to roundSummary", () => {
    const { state } = endingWith([3, 2, 3, 3], ...UNIQUE_WORST);
    expect(state.phase.kind).toBe("roundSummary");
    expect(state.points).toStrictEqual([3, 2, 3, 4]);
  });

  it("game end: newGame resets", () => {
    const { state } = endingWith([4, 2, 3, 4], ...UNIQUE_WORST);
    const result = ok(state, { type: "newGame" });
    expect(result.state.points).toStrictEqual([0, 0, 0, 0]);
    expect(result.state.round).toBeNull();
    expect(result.state.phase).toStrictEqual({
      kind: "rollOff",
      seats: [0, 1, 2, 3],
      rolled: [],
    });
    expect(types(result.events)).toStrictEqual([
      "gameStarted",
      "rollOffStarted",
      "turnStarted",
    ]);
  });
});

describe("purity", () => {
  // A full scripted round with a tie-break, then the game end.
  const SCRIPT: Action[] = [...TIED_NOT_LAST, R(1, 4, 3), R(0, 6, 2)];

  function replay(freeze: boolean) {
    let state: GameState = ok(createGame(BIG), { type: "newGame" }).state;
    const results = [];
    const actions: Action[] = [
      ...[6, 3, 2, 1].map((d, seat) => R(seat, d as Die)),
      ...SCRIPT,
    ];
    for (const action of actions) {
      const input = freeze ? deepFreeze(structuredClone(state)) : state;
      const result = applyAction(
        input,
        freeze ? deepFreeze(structuredClone(action)) : action,
      );
      results.push(result);
      if (!result.ok) throw new Error("Rejected");
      state = result.state;
    }
    return results;
  }

  it("purity: same inputs same result", () => {
    expect(replay(false)).toStrictEqual(replay(false));
    const state = deepFreeze(started());
    expect(applyAction(state, R(0, 4))).toStrictEqual(
      applyAction(state, R(0, 4)),
    );
    expect(applyAction(state, R(0, 9 as never))).toStrictEqual(
      applyAction(state, R(0, 9 as never)),
    );
  });

  it("purity: input state is not mutated", () => {
    // Frozen state and frozen action: any write throws in strict mode.
    expect(() => replay(true)).not.toThrow();
    const state = deepFreeze(started());
    const before = JSON.stringify(state);
    applyAction(state, R(0, 4));
    applyAction(state, R(5, 4));
    expect(JSON.stringify(state)).toBe(before);
  });
});
