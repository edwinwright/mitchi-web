import { describe, expect, it, vi } from "vitest";
import {
  applyEvent,
  select,
  type BotStep,
  type GameEvent,
  type GameState,
  type Spare,
} from "../engine";
import { mulberry32 } from "../testing";
import { VIEWER_SEAT } from "./config";
import { ROLL_MS } from "./pacing";
import {
  allowedOf,
  initStore,
  releasedSeq,
  storeReducer,
  viewOf,
  whatsNext,
  type Store,
  type StoreMsg,
} from "./store";

// botStep runs for real unless a test queues stubbed steps.
const stub = vi.hoisted(() => ({ steps: [] as BotStep[] }));
vi.mock("../engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../engine")>();
  return {
    ...actual,
    botStep: (...args: Parameters<typeof actual.botStep>) =>
      stub.steps.shift() ?? actual.botStep(...args),
  };
});

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

const START = { type: "request", request: { type: "newGame" } } as const;
const STOP = {
  type: "request",
  request: { type: "stop", seat: VIEWER_SEAT },
} as const;
const NEXT = { type: "request", request: { type: "nextRound" } } as const;
const keep = (die: 0 | 1, kept = true) =>
  ({
    type: "request",
    request: { type: "keep", seat: VIEWER_SEAT, die, kept },
  }) as const;
const roll = (spare: Spare, speed: "normal" | "fast" = "normal") =>
  ({ type: "roll", spare, speed }) as const;
const advance = (store: Store, spare: Spare | null = null) =>
  ({
    type: "advance",
    atRelease: releasedSeq(store),
    spare,
    speed: "normal",
  }) as const;

/** S1 to S5, after every message. */
function expectInvariants(store: Store) {
  const { playback } = store;
  // S1: the queue folds from what is shown to the engine's state.
  expect(
    playback.queue.reduce<GameState>(applyEvent, playback.shown),
  ).toStrictEqual(store.game);
  const beat = select.lastBeat(playback.released);
  const rolls =
    beat !== null &&
    ["rolled", "tieBreakRolled", "rollOffRolled"].includes(beat.kind);
  // S2: rollMs only on a roll beat.
  if (store.rollMs > 0) expect(rolls).toBe(true);
  // S3: animating is the last released beat, the viewer's roll.
  if (store.animating !== null) {
    expect(store.animating).toBe(beat?.id);
    expect(rolls && beat?.seat === VIEWER_SEAT).toBe(true);
  }
  // S4: the queue is whole beats.
  const queued = new Set(playback.queue.map((e) => e.seq));
  if (playback.queue.length > 0) {
    expect(playback.queue[0].beat).toBe(playback.queue[0].seq);
  }
  for (const event of playback.queue) expect(queued.has(event.beat)).toBe(true);
  // S5: plain JSON.
  expect(JSON.parse(JSON.stringify(store))).toStrictEqual(store);
}

function send(store: Store, msg: StoreMsg): Store {
  const next = storeReducer(store, msg);
  expectInvariants(next);
  return next;
}

/** Lets the viewer's dice land, then releases every queued beat. */
function drain(from: Store, kinds?: string[]): Store {
  let store = from;
  for (;;) {
    if (store.animating !== null) {
      store = send(store, { type: "settled", beat: store.animating });
    }
    if (whatsNext(store) !== "beat") return store;
    store = send(store, advance(store));
    const beat = select.lastBeat(store.playback.released);
    kinds?.push(`${beat?.kind} ${beat?.seat}`);
  }
}

/**
 * One scripted step. A pair of dice goes to whoever is to roll: the viewer's
 * roll, or a bot's move. Anything else is a viewer request, which draws no
 * dice. Each pair is consumed by exactly one roll or bot move, including a
 * bot's keep. Every queued beat is released between steps.
 */
type Item = Spare | Extract<StoreMsg, { type: "request" }>;

function play(
  items: readonly Item[],
  from: Store = initStore(),
  kinds?: string[],
): Store {
  let store = from;
  items.forEach((item, index) => {
    store = drain(store, kinds);
    const msg: StoreMsg = !Array.isArray(item)
      ? (item as StoreMsg)
      : whatsNext(store) === "bot"
        ? advance(store, item as Spare)
        : roll(item as Spare);
    const next = send(store, msg);
    // A script step that changes nothing means the script disagrees with the engine.
    if (next === store) {
      throw new Error(
        `Script step ${index} (${JSON.stringify(item)}) changed nothing`,
      );
    }
    store = next;
    const beat = select.lastBeat(store.playback.released);
    kinds?.push(`${beat?.kind} ${beat?.seat}`);
  });
  return drain(store, kinds);
}

const log = (store: Store) => store.playback.released;
const types = (store: Store) => log(store).map((e) => e.type);
const eventsOf = <T extends GameEvent["type"]>(store: Store, type: T) =>
  log(store).filter(
    (e): e is Extract<typeof e, { type: T }> => e.type === type,
  );
const lastKind = (store: Store) => select.lastBeat(log(store))?.kind;

// The viewer starts (roll to start 6, 1, 2, 3) and loses round 1 on 3-2 with limit 1.
const ROLL_OFF: Item[] = [START, [6, 1], [1, 1], [2, 1], [3, 1]];
const ROUND_ONE_TO_SUMMARY: Item[] = [
  ...ROLL_OFF,
  [3, 2],
  STOP,
  [6, 4],
  [5, 4],
  [6, 3],
];

/** The viewer's turn, nothing queued, dice landed. */
const viewerToRoll = () => play(ROLL_OFF);
/** The viewer rolled 5-2, the dice still in the air. */
const viewerRolling = () => send(viewerToRoll(), roll([5, 2]));
/** The viewer rolled 5-2 and the dice have landed. */
const viewerRolled = () => drain(viewerRolling());

describe("initStore", () => {
  it("initStore is deterministic", () => {
    expect(initStore()).toStrictEqual(initStore());
  });

  it("initial store is notStarted with nothing released or queued", () => {
    const store = initStore();
    expect(store.game.phase).toStrictEqual({ kind: "notStarted" });
    expect(store.playback.shown).toBe(store.game);
    expect(log(store)).toStrictEqual([]);
    expect(store.playback.queue).toStrictEqual([]);
    expect([store.animating, store.rollMs]).toStrictEqual([null, 0]);
  });

  it("round-trips as JSON", () => {
    const store = play([START, [6, 1]]);
    expect(JSON.parse(JSON.stringify(store))).toStrictEqual(store);
  });
});

describe("whatsNext", () => {
  it("null when caught up and the viewer moves", () => {
    expect(whatsNext(play([START]))).toBeNull();
    expect(whatsNext(initStore())).toBeNull();
  });

  it("beat while a beat is queued, bot when caught up and a bot moves", () => {
    const rolled = send(play([START]), roll([6, 1]));
    expect(whatsNext(rolled)).toBe("beat");
    expect(whatsNext(drain(rolled))).toBe("bot");
  });
});

describe("viewOf and allowedOf", () => {
  it("the view shows the released beats, never pending", () => {
    const rolled = send(play([START]), roll([6, 1]));
    expect(viewOf(rolled)).toStrictEqual({
      state: rolled.playback.shown,
      events: rolled.playback.released,
      viewerSeat: VIEWER_SEAT,
      pending: false,
      rollMs: ROLL_MS.normal,
    });
    expect(rolled.playback.shown).not.toBe(rolled.game);
  });

  it("allows nothing until caught up and the dice have landed", () => {
    expect(allowedOf(viewerRolling())).toStrictEqual(select.noIntents);
    expect(allowedOf(viewerRolled())).toMatchObject({ roll: true, stop: true });
  });
});

describe("request", () => {
  it("newGame releases gameStarted, rollOffStarted and turnStarted in one beat", () => {
    const store = send(initStore(), START);
    expect(types(store)).toStrictEqual([
      "gameStarted",
      "rollOffStarted",
      "turnStarted",
    ]);
    expect(store.playback.queue).toStrictEqual([]);
    expect(store.playback.shown.acting).toBe(VIEWER_SEAT);
  });

  it("nextRound releases roundStarted with the starter's turnStarted in one beat", () => {
    const summary = play(ROUND_ONE_TO_SUMMARY);
    expect(summary.game.phase).toMatchObject({
      kind: "roundSummary",
      taker: 0,
    });
    const next = send(summary, NEXT);
    expect(types(next)).toStrictEqual(["roundStarted", "turnStarted"]);
    expect(lastKind(next)).toBe("roundStarted");
    expect(next.playback.queue).toStrictEqual([]);
    expect(next.playback.shown.acting).toBe(VIEWER_SEAT);
  });

  it("newGame resets animating and rollMs", () => {
    const over = play(S1);
    expect(over.game.phase.kind).toBe("gameOver");
    const again = send(over, START);
    expect([again.animating, again.rollMs]).toStrictEqual([null, 0]);
    expect(again.game.points).toStrictEqual([0, 0, 0, 0]);
  });

  it("keep and stop release their first beat immediately", () => {
    const kept = send(viewerRolled(), keep(0));
    expect(lastKind(kept)).toBe("keepSet");
    expect([kept.playback.queue.length, kept.rollMs]).toStrictEqual([0, 0]);

    const stopped = send(kept, STOP);
    expect(lastKind(stopped)).toBe("turnEnded");
    expect(stopped.rollMs).toBe(0);
    expect(stopped.playback.queue.map((e) => e.type)).toStrictEqual([
      "turnStarted",
    ]);
  });

  it("a rejected request returns the same store", () => {
    const store = initStore();
    expect(storeReducer(store, STOP)).toBe(store);
    const started = play([START]);
    expect(storeReducer(started, START)).toBe(started);
  });

  it("an idempotent keep returns the same store", () => {
    const store = send(viewerRolled(), keep(0));
    expect(storeReducer(store, keep(0))).toBe(store);
  });

  it("ignored while queued, same reference", () => {
    const stopped = send(viewerRolled(), STOP);
    expect(whatsNext(stopped)).toBe("beat");
    for (const msg of [keep(0), STOP, NEXT, START]) {
      expect(storeReducer(stopped, msg)).toBe(stopped);
    }
  });

  it("ignored while animating", () => {
    const rolling = viewerRolling();
    expect(rolling.animating).not.toBeNull();
    expect(storeReducer(rolling, keep(0))).toBe(rolling);
    expect(storeReducer(rolling, STOP)).toBe(rolling);
  });

  it("does not change the store it was given", () => {
    const store = deepFreeze(play([START]));
    expect(() => storeReducer(store, roll([3, 4]))).not.toThrow();
    expect(() => storeReducer(store, { ...START })).not.toThrow();
  });
});

describe("roll", () => {
  it("sets animating and rollMs for the viewer's roll beat", () => {
    const rolling = viewerRolling();
    expect(lastKind(rolling)).toBe("rolled");
    expect(rolling.animating).toBe(select.lastBeat(log(rolling))?.id);
    expect(rolling.rollMs).toBe(ROLL_MS.normal);
    expect(send(viewerToRoll(), roll([5, 2], "fast")).rollMs).toBe(
      ROLL_MS.fast,
    );
  });

  it("settled for the current beat clears animating", () => {
    const rolling = viewerRolling();
    const settled = send(rolling, {
      type: "settled",
      beat: rolling.animating!,
    });
    expect(settled.animating).toBeNull();
    expect(settled.rollMs).toBe(rolling.rollMs);
  });

  it("ignored while a beat is queued", () => {
    // The viewer's roll to start: the handover to seat 1 is queued.
    const rolled = send(play([START]), roll([6, 1]));
    const landed = send(rolled, { type: "settled", beat: rolled.animating! });
    expect(whatsNext(landed)).toBe("beat");
    expect(storeReducer(landed, roll([3, 3]))).toBe(landed);
  });

  it("a second roll is ignored while the first animates", () => {
    const rolling = viewerRolling();
    expect(storeReducer(rolling, roll([3, 3]))).toBe(rolling);
  });

  it("a bot's roll beat carries rollMs but never locks", () => {
    const store = drain(send(play([START]), roll([6, 1])));
    const botRolled = send(store, advance(store, [3, 1]));
    expect(lastKind(botRolled)).toBe("rollOffRolled");
    expect([botRolled.rollMs, botRolled.animating]).toStrictEqual([
      ROLL_MS.normal,
      null,
    ]);
  });
});

describe("roll/request", () => {
  it("ignored when not caught up leaves the store reference unchanged", () => {
    const stopped = send(viewerRolled(), STOP);
    expect(storeReducer(stopped, roll([1, 1]))).toBe(stopped);
    expect(storeReducer(stopped, NEXT)).toBe(stopped);
  });
});

describe("advance", () => {
  it("releases one queued beat", () => {
    const stopped = send(viewerRolled(), STOP);
    const next = send(stopped, advance(stopped));
    expect(lastKind(next)).toBe("turnStarted");
    expect(next.playback.queue).toStrictEqual([]);
  });

  it("a bot move releases its first beat and queues the rest", () => {
    const store = drain(send(play([START]), roll([4, 1])));
    const next = send(store, advance(store, [2, 2]));
    expect(log(next).at(-1)).toMatchObject({
      type: "rollOffRolled",
      seat: 1,
      die: 2,
    });
    expect(next.playback.queue).toMatchObject([
      { type: "turnStarted", seat: 2, context: "rollOff" },
    ]);
  });

  it("stale atRelease is ignored", () => {
    const store = drain(send(play([START]), roll([4, 1])));
    const msg = advance(store, [2, 2]);
    const once = send(store, msg);
    expect(storeReducer(once, msg)).toBe(once);
    expect(storeReducer(store, { ...msg, atRelease: msg.atRelease - 1 })).toBe(
      store,
    );
  });

  it("a queued beat needs no spare (spare null)", () => {
    const stopped = send(viewerRolled(), STOP);
    expect(() => send(stopped, advance(stopped, null))).not.toThrow();
  });

  it("a bot move with spare null throws", () => {
    const store = drain(send(play([START]), roll([4, 1])));
    expect(whatsNext(store)).toBe("bot");
    expect(() => storeReducer(store, advance(store, null))).toThrow(
      "advance: a bot move needs dice",
    );
  });

  it("does nothing when the viewer moves, outside a game or between rounds", () => {
    for (const store of [
      play([START]),
      initStore(),
      play(ROUND_ONE_TO_SUMMARY),
    ]) {
      expect(storeReducer(store, advance(store, [2, 2]))).toBe(store);
    }
  });

  it("a rejected bot step throws", () => {
    // A bot turn that has used all its rolls cannot exist; the engine rejects the roll.
    const base = play([START]);
    const game: GameState = {
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
    };
    const corrupt: Store = {
      ...base,
      game,
      playback: { ...base.playback, shown: game },
    };
    expect(() => storeReducer(corrupt, advance(corrupt, [2, 2]))).toThrow(
      /Bot step rejected \(noRollsLeft\)/,
    );
  });
});

describe("animating", () => {
  it("a Step that releases the next beat clears animating and ignores the stale settled", () => {
    // The viewer's third roll uses their last: the turn end is queued behind it.
    const third = play([[5, 2]], play([[3, 2]], viewerToRoll()));
    const rolling = send(third, roll([4, 1]));
    expect(rolling.animating).not.toBeNull();
    expect(rolling.playback.queue[0].type).toBe("turnEnded");

    const stepped = send(rolling, advance(rolling));
    expect(lastKind(stepped)).toBe("turnEnded");
    expect(stepped.animating).toBeNull();
    expect(
      storeReducer(stepped, { type: "settled", beat: rolling.animating! }),
    ).toBe(stepped);
  });
});

describe("settled", () => {
  it("a beat that is no longer current is ignored", () => {
    const rolling = viewerRolling();
    const stale = { type: "settled", beat: rolling.animating! - 1 } as const;
    expect(storeReducer(rolling, stale)).toBe(rolling);
    expect(storeReducer(viewerRolled(), stale)).toEqual(viewerRolled());
  });
});

/** The viewer stops on 5-5 with limit 3; seat 1 keeps a 5, then rolls a 6. */
function botHoldingFiveRollsSix(): Store {
  const store = play([
    ...ROLL_OFF,
    [3, 2],
    [4, 2],
    [5, 5],
    [5, 2],
    [1, 1],
    [6, 1],
  ]);
  expect(store.game.phase).toMatchObject({
    kind: "turn",
    seat: 1,
    dice: [5, 6],
    kept: [true, false],
  });
  return store;
}

describe("bot driver", () => {
  it("a keep swap is one keepSwapped beat", () => {
    const store = botHoldingFiveRollsSix();
    const swapped = send(store, advance(store, [2, 2]));
    const beat = select.lastBeat(log(swapped));
    expect(beat?.kind).toBe("keepSwapped");
    expect(beat?.events).toMatchObject([
      { type: "keepSet", seat: 1, die: 0, kept: false },
      { type: "keepSet", seat: 1, die: 1, kept: true },
    ]);
    // Neither the shown state nor the engine ever holds nothing kept.
    expect(swapped.playback.shown).toStrictEqual(swapped.game);
    expect(swapped.game.phase).toMatchObject({ kept: [false, true] });
  });

  it("throws when the second step is not keep true on the other die", () => {
    const store = botHoldingFiveRollsSix();
    stub.steps = [
      { request: { type: "keep", seat: 1, die: 0, kept: false }, reason: null },
      { request: { type: "roll", seat: 1 }, reason: "rerollingBoth" },
    ];
    try {
      expect(() => storeReducer(store, advance(store, [2, 2]))).toThrow(
        /^Bot keep swap: expected a keep of the other die/,
      );
    } finally {
      stub.steps = [];
    }
  });
});

describe("the log", () => {
  it("round 1 keeps roll-off rows", () => {
    expect(types(play(ROLL_OFF))).toStrictEqual([
      "gameStarted",
      "rollOffStarted",
      "turnStarted",
      "rollOffRolled",
      "turnStarted",
      "rollOffRolled",
      "turnStarted",
      "rollOffRolled",
      "turnStarted",
      "rollOffRolled",
      "roundStarted",
      "turnStarted",
    ]);
  });

  it("roundStarted after round 1 clears the log", () => {
    const summary = play(ROUND_ONE_TO_SUMMARY);
    expect(log(summary)[0].type).toBe("gameStarted");
    const next = play([NEXT], summary);
    expect(types(next)).toStrictEqual(["roundStarted", "turnStarted"]);
    expect(log(next)[0].seq).toBe(releasedSeq(summary) + 1);
  });

  it("gameStarted clears the log", () => {
    const finished = play(S1);
    const again = play([START], finished);
    expect(types(again)).toStrictEqual([
      "gameStarted",
      "rollOffStarted",
      "turnStarted",
    ]);
    expect(log(again)[0].seq).toBe(releasedSeq(finished) + 1);
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

describe("scripted game S1", () => {
  it("runs a draw through chained tie-breaks", () => {
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
    const pots = log(store).flatMap((e) =>
      e.type === "potChanged" ? [[e.cause, e.pot]] : [],
    );
    expect(pots).toStrictEqual([
      ["tieBreak", 2],
      ["mitchi", 4],
      ["tieBreak", 8],
    ]);
    expect(log(store).at(-2)).toMatchObject({
      type: "potTaken",
      seat: 3,
      pot: 8,
      points: 8,
      tieBreaks: 2,
    });
    expect(log(store).at(-1)).toMatchObject({
      type: "gameEnded",
      winners: [1, 2],
    });
  });

  it("roll-off beat sequence", () => {
    const kinds: string[] = [];
    play(S1.slice(0, 7), initStore(), kinds);
    expect(kinds).toStrictEqual([
      "gameStarted null",
      "rollOffRolled 0",
      "turnStarted 1",
      "rollOffRolled 1",
      "turnStarted 2",
      "rollOffRolled 2",
      "turnStarted 3",
      "rollOffRolled 3",
      "rollOffStarted null",
      "turnStarted 0",
      "rollOffRolled 0",
      "turnStarted 1",
      "rollOffRolled 1",
      "roundStarted 0",
      "turnStarted 0",
    ]);
  });
});

describe("scripted game S2", () => {
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

  it("covers keep, limit 2, both reasons and a tie that is not a beat", () => {
    const store = play(S2);
    expect(store.game.round).toMatchObject({
      number: 2,
      startingSeat: 3,
      rollLimit: null,
    });
    expect(store.game.points).toStrictEqual([0, 0, 0, 1]);

    const before = play(S2.slice(0, -1));
    const rolls = log(before).filter((e) => e.type === "rolled");
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

describe("invariants", () => {
  it("S4 the queue is whole beats after every message", () => {
    // play and drain assert S1 to S5 after every message they send.
    expect(() => play(S1)).not.toThrow();
  });

  it("hold through a seeded random walk of every message (20 seeds, 250 messages)", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const random = mulberry32(seed);
      const pick = <T>(items: readonly T[]): T =>
        items[Math.floor(random() * items.length)];
      const die = () => (Math.floor(random() * 6) + 1) as Spare[0];
      const spare = (): Spare => [die(), die()];
      let store = initStore();
      for (let i = 0; i < 250; i++) {
        const stale = random() < 0.1;
        const msg: StoreMsg = pick<() => StoreMsg>([
          () => roll(spare(), pick(["normal", "fast"])),
          () => keep(pick([0, 1]), random() < 0.5),
          () => STOP,
          () => NEXT,
          () => START,
          () => ({
            ...advance(store, whatsNext(store) === "bot" ? spare() : null),
            atRelease: releasedSeq(store) - (stale ? 1 : 0),
          }),
          () => ({
            type: "settled",
            beat: (store.animating ?? 0) - (stale ? 1 : 0),
          }),
        ])();
        store = send(store, msg);
      }
    }
  });
});
