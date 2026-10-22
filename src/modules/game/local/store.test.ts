import { describe, expect, it } from "vitest";
import { select, type GameEvent, type Spare } from "../engine";
import { VIEWER_SEAT } from "./config";
import { initStore, storeReducer, type Store } from "./store";

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const START = {
  type: "request",
  request: { type: "newGame" },
  spare: null,
} as const;
const STOP = {
  type: "request",
  request: { type: "stop", seat: VIEWER_SEAT },
  spare: null,
} as const;
const NEXT = {
  type: "request",
  request: { type: "nextRound" },
  spare: null,
} as const;
const keep = (die: 0 | 1, kept = true) =>
  ({
    type: "request",
    request: { type: "keep", seat: VIEWER_SEAT, die, kept },
    spare: null,
  }) as const;

/**
 * One scripted step. A pair of dice goes to whoever is to roll: the viewer's
 * roll request, or a bot step. Anything else is a viewer request, which
 * draws no dice. Each pair is consumed by exactly one roll or bot step,
 * including a bot's keep step.
 */
type Item =
  Spare | typeof START | typeof STOP | typeof NEXT | ReturnType<typeof keep>;

function play(items: readonly Item[], from: Store = initStore()): Store {
  let store = from;
  items.forEach((item, index) => {
    const next = storeReducer(
      store,
      Array.isArray(item) ? diceMessage(store, item as Spare) : (item as never),
    );
    // A script step that changes nothing means the script disagrees with the engine.
    if (next === store) {
      throw new Error(
        `Script step ${index} (${JSON.stringify(item)}) changed nothing`,
      );
    }
    store = next;
  });
  return store;
}

function diceMessage(store: Store, spare: Spare) {
  const mover = select.toRoll(store.game)[0];
  return mover === VIEWER_SEAT
    ? ({
        type: "request",
        request: { type: "roll", seat: VIEWER_SEAT },
        spare,
      } as const)
    : ({ type: "botStep", atSeq: store.seq, spare } as const);
}

const types = (store: Store) => store.log.map((e) => e.type);
const eventsOf = <T extends GameEvent["type"]>(store: Store, type: T) =>
  store.log.filter((e): e is Extract<typeof e, { type: T }> => e.type === type);

describe("initStore", () => {
  it("initStore is deterministic", () => {
    expect(initStore()).toStrictEqual(initStore());
  });

  it("initial store is notStarted with zero points", () => {
    const store = initStore();
    expect(store.game.phase).toStrictEqual({ kind: "notStarted" });
    expect(store.game.points).toStrictEqual([0, 0, 0, 0]);
    expect(store.log).toStrictEqual([]);
    expect(store.seq).toBe(0);
  });

  it("round-trips as JSON", () => {
    const store = play([START, [6, 1]]);
    expect(JSON.parse(JSON.stringify(store))).toStrictEqual(store);
  });
});

describe("requests", () => {
  it("applies a request and logs its events", () => {
    const store = play([START]);
    expect(types(store)).toStrictEqual(["gameStarted", "rollOffStarted"]);
    expect(store.log.map((e) => e.seq)).toStrictEqual([1, 2]);
    expect(store.seq).toBe(2);
  });

  it("a rejected request returns the same store", () => {
    const store = initStore();
    expect(storeReducer(store, STOP)).toBe(store);
    const started = play([START]);
    expect(storeReducer(started, START)).toBe(started);
  });

  it("a roll request with no dice returns the same store", () => {
    const started = play([START]);
    const msg = {
      type: "request",
      request: { type: "roll", seat: 0 },
      spare: null,
    } as const;
    expect(storeReducer(started, msg)).toBe(started);
  });

  it("an idempotent keep returns the same store", () => {
    const store = play([
      START,
      [6, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [5, 2],
      keep(0),
    ]);
    expect(storeReducer(store, keep(0))).toBe(store);
  });

  it("does not change the store it was given", () => {
    const store = deepFreeze(play([START]));
    expect(() => storeReducer(store, { ...START })).not.toThrow();
    expect(() =>
      storeReducer(store, {
        type: "request",
        request: { type: "roll", seat: 0 },
        spare: [3, 4],
      }),
    ).not.toThrow();
  });
});

describe("bot steps", () => {
  it("local roll-off goes lowest seat first", () => {
    let store = play([START]);
    // The viewer is to roll, so a bot step is ignored.
    const ignored = storeReducer(store, {
      type: "botStep",
      atSeq: store.seq,
      spare: [3, 3],
    });
    expect(ignored).toBe(store);

    store = play([[4, 1]], store);
    const order: number[] = [];
    for (const dice of [
      [1, 1],
      [2, 1],
      [3, 1],
    ] as const) {
      order.push(select.toRoll(store.game)[0]);
      store = play([dice], store);
    }
    expect(order).toStrictEqual([1, 2, 3]);
    expect(eventsOf(store, "rollOffRolled").map((e) => e.seat)).toStrictEqual([
      0, 1, 2, 3,
    ]);
  });

  it("botStep with current atSeq applies exactly one action", () => {
    const store = play([START, [4, 1]]);
    const next = storeReducer(store, {
      type: "botStep",
      atSeq: store.seq,
      spare: [2, 2],
    });
    expect(next.seq).toBe(store.seq + 1);
    expect(next.log.at(-1)).toMatchObject({
      type: "rollOffRolled",
      seat: 1,
      die: 2,
    });
  });

  it("duplicate botStep with stale atSeq is ignored", () => {
    const store = play([START, [4, 1]]);
    const msg = { type: "botStep", atSeq: store.seq, spare: [2, 2] } as const;
    const once = storeReducer(store, msg);
    expect(storeReducer(once, msg)).toBe(once);
    expect(storeReducer(store, { ...msg, atSeq: store.seq - 1 })).toBe(store);
  });

  it("botStep when the viewer is acting returns the same store", () => {
    const store = play([START]);
    expect(
      storeReducer(store, { type: "botStep", atSeq: store.seq, spare: [2, 2] }),
    ).toBe(store);
  });

  it("botStep outside a game returns the same store", () => {
    const store = initStore();
    expect(
      storeReducer(store, { type: "botStep", atSeq: 0, spare: [2, 2] }),
    ).toBe(store);
  });

  it("botStep during roundSummary returns the same store", () => {
    const store = play(ROUND_ONE_TO_SUMMARY);
    expect(store.game.phase.kind).toBe("roundSummary");
    expect(
      storeReducer(store, { type: "botStep", atSeq: store.seq, spare: [2, 2] }),
    ).toBe(store);
  });

  it("a rejected bot step throws", () => {
    // A bot turn that has used all its rolls cannot exist; the engine rejects the roll.
    const base = play([START]);
    const corrupt: Store = {
      ...base,
      game: {
        ...base.game,
        round: {
          number: 1,
          startingSeat: 0,
          order: [0, 1, 2, 3],
          rollLimit: 3,
          finished: [],
          pot: 1,
          tieBreaks: 0,
          lastRoller: null,
          lastDirection: "clockwise",
        },
        phase: {
          kind: "turn",
          seat: 1,
          rollsUsed: 3,
          dice: [3, 4],
          kept: [false, false],
        },
        acting: 1,
      },
    };
    expect(() =>
      storeReducer(corrupt, {
        type: "botStep",
        atSeq: corrupt.seq,
        spare: [2, 2],
      }),
    ).toThrow(/Bot step rejected \(noRollsLeft\)/);
  });
});

// The viewer starts (roll-off 6, 1, 2, 3) and loses round 1 on 3-2 with limit 1.
const ROLL_OFF: Item[] = [START, [6, 1], [1, 1], [2, 1], [3, 1]];
const ROUND_ONE_TO_SUMMARY: Item[] = [
  ...ROLL_OFF,
  [3, 2],
  STOP,
  [6, 4],
  [5, 4],
  [6, 3],
];

describe("the log", () => {
  it("round 1 keeps roll-off rows", () => {
    const store = play(ROLL_OFF);
    expect(types(store)).toStrictEqual([
      "gameStarted",
      "rollOffStarted",
      "rollOffRolled",
      "rollOffRolled",
      "rollOffRolled",
      "rollOffRolled",
      "roundStarted",
      "turnStarted",
    ]);
  });

  it("roundStarted after round 1 clears the log", () => {
    const summary = play(ROUND_ONE_TO_SUMMARY);
    expect(summary.log[0].type).toBe("gameStarted");
    const next = play([NEXT], summary);
    expect(types(next)).toStrictEqual(["roundStarted", "turnStarted"]);
    expect(next.seq).toBe(summary.seq + 2);
    expect(next.log[0].seq).toBe(summary.seq + 1);
  });

  it("gameStarted clears the log", () => {
    const finished = play(S1);
    expect(finished.game.phase.kind).toBe("gameOver");
    const again = play([START], finished);
    expect(types(again)).toStrictEqual(["gameStarted", "rollOffStarted"]);
    expect(again.seq).toBe(finished.seq + 2);
    expect(again.game.points).toStrictEqual([0, 0, 0, 0]);
  });
});

/**
 * S1: a roll-off tie, limit 1, a three-way tie, a Mitchi in a tie-break,
 * two chained tie-breaks, pot 8, past the limit, and a draw between two
 * seats who did not take the last pot.
 */
const S1: Item[] = [
  START,
  // Roll-off: 0 and 1 tie on 6, then the viewer rolls 5 to 3 and starts.
  [6, 1],
  [6, 1],
  [2, 1],
  [1, 1],
  [5, 1],
  [3, 1],
  // Round 1, limit 1: the viewer's 3-2 is the unique worst and takes 1.
  [3, 2],
  STOP,
  [6, 4],
  [5, 4],
  [6, 3],
  NEXT,
  // Round 2: the viewer, 1 and 3 tie on 3-1; seat 2 is clear.
  [3, 1],
  STOP,
  [3, 1],
  [6, 5],
  [3, 1],
  // Tie-break 1, anticlockwise from seat 3: [3, 1, 0]. A Mitchi adds 2.
  [3, 2],
  [2, 1],
  [2, 3],
  // Tie-break 2, clockwise from seat 0: [0, 3]. Seat 3 is worst and takes 8.
  [5, 1],
  [4, 3],
];

describe("scripted games", () => {
  it("S1 runs a draw through chained tie-breaks", () => {
    const store = play(S1);
    expect(store.game.phase).toStrictEqual({
      kind: "gameOver",
      winners: [1, 2],
    });
    expect(store.game.points).toStrictEqual([1, 0, 0, 8]);

    const starts = eventsOf(store, "tieBreakStarted");
    expect(starts.map((e) => [e.number, e.seats, e.direction])).toStrictEqual([
      [1, [3, 1, 0], "anticlockwise"],
      [2, [0, 3], "clockwise"],
    ]);
    const pots = store.log.flatMap((e) =>
      e.type === "potChanged" ? [[e.cause, e.pot]] : [],
    );
    expect(pots).toStrictEqual([
      ["tieBreak", 2],
      ["mitchi", 4],
      ["tieBreak", 8],
    ]);
    expect(store.log.at(-2)).toMatchObject({
      type: "potTaken",
      seat: 3,
      pot: 8,
      points: 8,
      tieBreaks: 2,
    });
    expect(store.log.at(-1)).toMatchObject({
      type: "gameEnded",
      winners: [1, 2],
    });
  });

  it("S1 starts with a roll-off tie among two seats", () => {
    const store = play(S1.slice(0, 7));
    expect(eventsOf(store, "rollOffStarted").map((e) => e.seats)).toStrictEqual(
      [
        [0, 1, 2, 3],
        [0, 1],
      ],
    );
  });

  /**
   * S2: keep, limit 2, both bot roll reasons, and a tie that is not a beat,
   * with the loser starting the next round.
   */
  const S2: Item[] = [
    START,
    [6, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    // The viewer rolls 5-2, keeps the 5, rolls a 6 and stops: limit 2, worst 6-5.
    [5, 2],
    keep(0),
    [6, 1],
    STOP,
    // Seat 1 rolls 4-1 (rerollingBoth), then 2-2: ended at the limit, a beat.
    [4, 1],
    [2, 2],
    // Seat 2 rolls 6-3, keeps the 6 (a keep step eats a pair), then 5: 6-5 ties the worst.
    [6, 3],
    [1, 1],
    [5, 5],
    // Seat 3 rolls 6-5, a tie that is not a beat, keeps the 6, then 4: 6-4 is the new worst.
    [6, 5],
    [1, 1],
    [4, 4],
    NEXT,
  ];

  it("S2 covers keep, limit 2, both reasons and a tie that is not a beat", () => {
    const store = play(S2);
    expect(store.game.round).toMatchObject({
      number: 2,
      startingSeat: 3,
      rollLimit: null,
    });
    expect(store.game.points).toStrictEqual([0, 0, 0, 1]);

    const before = play(S2.slice(0, -1));
    const rolls = before.log.filter((e) => e.type === "rolled");
    expect(rolls.map((e) => [e.seat, e.dice, e.reason])).toStrictEqual([
      [0, [5, 2], null],
      [0, [5, 6], null],
      [1, [4, 1], null],
      [1, [2, 2], "rerollingBoth"],
      [2, [6, 3], null],
      [2, [6, 5], "keepingHighDie"],
      [3, [6, 5], null],
      [3, [6, 4], "keepingHighDie"],
    ]);
    expect(eventsOf(before, "rollLimitSet")[0]).toMatchObject({
      seat: 0,
      limit: 2,
    });
    expect(eventsOf(before, "keepSet").map((e) => e.seat)).toStrictEqual([
      0, 2, 3,
    ]);
    // Seat 3's 6-5 tied the worst, so it rolled again rather than stopping.
    expect(
      eventsOf(before, "turnEnded").map((e) => [e.seat, e.cause]),
    ).toStrictEqual([
      [0, "stop"],
      [1, "noRollsLeft"],
      [2, "noRollsLeft"],
      [3, "noRollsLeft"],
    ]);
    expect(eventsOf(before, "potTaken")[0]).toMatchObject({
      seat: 3,
      pot: 1,
      points: 1,
    });
  });
});
