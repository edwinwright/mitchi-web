import {
  appendEvents,
  applyAction,
  createGame,
  select,
  type Action,
  type Die,
  type GameConfig,
  type GameEvent,
  type GameSession,
  type GameState,
  type LoggedEvent,
  type Pacing,
  type Seat,
} from "../engine";

/** Four seats to five points, the viewer in seat 0: the practice game. */
export const FIXTURE_CONFIG: GameConfig = { seats: 4, pointLimit: 5 };
export const FIXTURE_VIEWER: Seat = 0;

/** A state and the log that led to it, built by running the real engine. */
export type Fixture = {
  readonly state: GameState;
  readonly events: readonly LoggedEvent[];
};

/**
 * Applies actions that already carry their dice. A rejected step throws:
 * a fixture that cannot be reached is a bug in the fixture.
 */
export function run(
  state: GameState,
  steps: readonly Action[],
): { state: GameState; events: readonly GameEvent[] } {
  const events: GameEvent[] = [];
  let current = state;
  for (const step of steps) {
    const result = applyAction(current, step);
    if (!result.ok) {
      throw new Error(
        `Fixture step ${JSON.stringify(step)} rejected: ${result.rejection.code}`,
      );
    }
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events };
}

function build(steps: readonly Action[]): Fixture {
  const game = run(createGame(FIXTURE_CONFIG), steps);
  return {
    state: game.state,
    events: appendEvents([], 0, game.events).log,
  };
}

const roll = (seat: Seat, ...values: Die[]): Action => ({
  type: "roll",
  seat,
  values,
  reason: null,
});
const keep = (seat: Seat, die: 0 | 1, kept: boolean): Action => ({
  type: "keep",
  seat,
  die,
  kept,
});
const stop = (seat: Seat): Action => ({ type: "stop", seat, reason: null });
const newGame: Action = { type: "newGame" };

/** The viewer starts round 1. */
const viewerStarts = [newGame, roll(0, 6), roll(1, 3), roll(2, 2), roll(3, 1)];

export const notStarted: Fixture = build([]);

/** The viewer has rolled; the bots are to go. */
export const rollOff: Fixture = build([newGame, roll(0, 4)]);

/** A tie on the highest die: 0 and 1 roll again. */
export const rollOffReroll: Fixture = build([
  newGame,
  roll(0, 4),
  roll(1, 4),
  roll(2, 2),
  roll(3, 1),
]);

export const viewerToRoll: Fixture = build(viewerStarts);

export const viewerRolledKeepable: Fixture = build([
  ...viewerStarts,
  roll(0, 5, 2),
]);

export const viewerKeptOne: Fixture = build([
  ...viewerStarts,
  roll(0, 5, 2),
  keep(0, 0, true),
]);

export const viewerKeptBoth: Fixture = build([
  ...viewerStarts,
  roll(0, 5, 2),
  keep(0, 0, true),
  keep(0, 1, true),
]);

/** The viewer stopped on 6-3 after two rolls: limit 2, seat 1 to roll. */
const limitTwo = [...viewerStarts, roll(0, 3, 2), roll(0, 6, 3), stop(0)];

export const starterLimitSet: Fixture = build(limitTwo);

/** Seat 1 has used one of two rolls on a poor hand. */
export const botMidTurn: Fixture = build([...limitTwo, roll(1, 4, 2)]);

/** Seat 1 rolled a 5 and has kept it, ready to roll the other die. */
export const botKept: Fixture = build([
  ...limitTwo,
  roll(1, 5, 2),
  keep(1, 0, true),
]);

/** A Mitchi ended the starter's turn: the pot is 2 and the limit 1. */
export const mitchiInRound: Fixture = build([
  ...viewerStarts,
  roll(0, 2, 1),
  stop(0),
]);

/** Round one of a limit-1 round that ends with seat 3's 3-2 as the unique worst. */
const seat3Loses = [
  roll(0, 6, 5),
  stop(0),
  roll(1, 4, 6),
  roll(2, 3, 3),
  roll(3, 3, 2),
];

export const roundSummary: Fixture = build([...viewerStarts, ...seat3Loses]);

/** Seats 0 and 1 tie on 3-1 and seat 3 rolled last: tie-break 1 runs [1, 0]. */
const tieOnThreeOne = [
  ...viewerStarts,
  roll(0, 3, 1),
  stop(0),
  roll(1, 1, 3),
  roll(2, 6, 5),
  roll(3, 6, 4),
];

/** Tie-break 1 has just started: seat 1 is to roll. */
export const tieBreakRunning: Fixture = build(tieOnThreeOne);

/** Seat 1 has rolled 4-3; the viewer is to roll. */
export const tieBreakViewerToRoll: Fixture = build([
  ...tieOnThreeOne,
  roll(1, 4, 3),
]);

/** The viewer matched 4-3: tie-break 2 runs clockwise, [0, 1], pot 4. */
export const secondTieBreak: Fixture = build([
  ...tieOnThreeOne,
  roll(1, 4, 3),
  roll(0, 3, 4),
]);

/**
 * Limit-1 rounds, each lost by a different seat in turn. The loser of a
 * round starts the next, so the starter is read from the previous loser.
 * Every round has a unique worst, so each loser takes 1 point.
 */
function lossRounds(losers: readonly Seat[]): Action[] {
  let starter: Seat = FIXTURE_VIEWER;
  return losers.flatMap((loser, index) => {
    const order = [0, 1, 2, 3].map((n) => (starter + n) % 4);
    const hands = order.flatMap((seat): Action[] => {
      const lose = seat === loser;
      if (seat === starter) {
        return [lose ? roll(seat, 3, 2) : roll(seat, 6, 5), stop(seat)];
      }
      return [lose ? roll(seat, 3, 2) : roll(seat, 6, 4)];
    });
    starter = loser;
    return [...(index > 0 ? [nextRound] : []), ...hands];
  });
}
const nextRound: Action = { type: "nextRound" };

/** Seat 3 reaches 5; seat 0 has none: one winner. */
export const gameOverUnique: Fixture = build([
  ...[newGame, roll(0, 6), roll(1, 3), roll(2, 2), roll(3, 1)],
  ...lossRounds([3, 3, 1, 3, 2, 3, 3]),
]);

/** Seat 3 reaches 5; seats 0 and 2 are tied on none: a draw. */
export const gameOverDraw: Fixture = build([
  ...[newGame, roll(0, 6), roll(1, 3), roll(2, 2), roll(3, 1)],
  ...lossRounds([3, 3, 3, 3, 1, 3]),
]);

export type SessionOptions = {
  readonly pending?: boolean;
  readonly viewerSeat?: Seat;
  /** `null` gives the online shape: no pacing at all. */
  readonly pacing?: Pacing | null;
};

const noop = () => {};

const DEFAULT_PACING: Pacing = {
  paused: false,
  speed: "normal",
  canStep: false,
  pause: noop,
  resume: noop,
  step: noop,
  setSpeed: noop,
};

/** A GameSession for a fixture. The intents do nothing: the board can render with no engine running. */
export function fixtureSession(
  fixture: Fixture,
  options: SessionOptions = {},
): GameSession {
  const viewerSeat = options.viewerSeat ?? FIXTURE_VIEWER;
  const pacing = options.pacing === undefined ? DEFAULT_PACING : options.pacing;
  return {
    view: {
      state: fixture.state,
      events: fixture.events,
      viewerSeat,
      pending: options.pending ?? false,
    },
    allowed: select.allowedIntents(fixture.state, viewerSeat),
    intents: {
      roll: noop,
      setKeep: noop,
      stop: noop,
      nextRound: noop,
      newGame: noop,
    },
    ...(pacing ? { pacing } : {}),
  };
}
