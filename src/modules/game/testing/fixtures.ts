import {
  appendEvents,
  applyAction,
  caughtUp,
  createGame,
  receive,
  release,
  select,
  startPlayback,
  type Action,
  type BeatKind,
  type Die,
  type GameConfig,
  type GameEvent,
  type GameSession,
  type GameState,
  type LoggedEvent,
  type Pacing,
  type Seat,
} from "../engine";
import type { Step } from "./batch";

/** Four seats to five points, the viewer in seat 0: the practice game. */
export const FIXTURE_CONFIG: GameConfig = { seats: 4, pointLimit: 5 };
export const FIXTURE_VIEWER: Seat = 0;

/** A state and the log that led to it, built by running the real engine. */
export type Fixture = {
  readonly state: GameState;
  readonly events: readonly LoggedEvent[];
  /** false for a mid-action beat. Default true. */
  readonly caughtUp?: boolean;
  /** Animation length of the last beat; default 0. */
  readonly rollMs?: number;
};

/** `ROLL_MS.normal` in local/pacing: testing/ cannot import local/. */
const DEFAULT_ROLL_MS = 500;

const ROLL_BEATS: readonly BeatKind[] = [
  "rollOffRolled",
  "rolled",
  "tieBreakRolled",
];

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

/** Each action's events are stamped as their own batch, as a session receives them. */
function build(steps: readonly Action[]): Fixture {
  let state = createGame(FIXTURE_CONFIG);
  let log: readonly LoggedEvent[] = [];
  let seq = 0;
  for (const step of steps) {
    const game = run(state, [step]);
    state = game.state;
    ({ log, seq } = appendEvents(log, seq, game.events));
  }
  return { state, events: log };
}

const isBatch = (step: Step): step is readonly Action[] => Array.isArray(step);

/**
 * One fixture per released beat of a script. An array entry is one batch:
 * its actions are applied in order and their events received together, as
 * the store does for a bot's keep swap, so the swap is one `keepSwapped`
 * beat. The last fixture of each step is caught up and equals the engine's
 * state; a roll beat carries `rollMs`.
 */
export function beatFixtures(
  steps: readonly Step[],
  options: { rollMs?: number } = {},
): readonly Fixture[] {
  const rollMs = options.rollMs ?? DEFAULT_ROLL_MS;
  let state = createGame(FIXTURE_CONFIG);
  let playback = startPlayback(state);
  const fixtures: Fixture[] = [];
  for (const step of steps) {
    const batch = run(state, isBatch(step) ? step : [step]);
    state = batch.state;
    playback = receive(playback, batch.events);
    while (!caughtUp(playback)) {
      playback = release(playback);
      const beat = select.lastBeat(playback.released);
      fixtures.push({
        state: playback.shown,
        events: playback.released,
        caughtUp: caughtUp(playback),
        rollMs: beat && ROLL_BEATS.includes(beat.kind) ? rollMs : 0,
      });
    }
  }
  return fixtures;
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

const tiedOnFour = [newGame, roll(0, 4), roll(1, 4), roll(2, 2), roll(3, 1)];

/** A tie on the highest die: 0 and 1 roll again. */
export const rollOffReroll: Fixture = build(tiedOnFour);

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

const mitchiStop = [...viewerStarts, roll(0, 2, 1), stop(0)];

/** A Mitchi ended the starter's turn: the pot is 2 and the limit 1. */
export const mitchiInRound: Fixture = build(mitchiStop);

/** Round one of a limit-1 round that ends with seat 3's 3-2 as the unique worst. */
const seat3Loses = [
  roll(0, 6, 5),
  stop(0),
  roll(1, 4, 6),
  roll(2, 3, 3),
  roll(3, 3, 2),
];

const roundOne = [...viewerStarts, ...seat3Loses];

export const roundSummary: Fixture = build(roundOne);

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

const fiveRounds = [
  ...[newGame, roll(0, 6), roll(1, 3), roll(2, 2), roll(3, 1)],
  ...lossRounds([3, 3, 3, 1, 1]),
];

/** Between rounds: seat 3 on 3 points, close to the limit; seat 1 on 2, not. */
export const closeToLimit: Fixture = build(fiveRounds);

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

/**
 * The latest beat of `kind` in a script, or its last beat: the moment a
 * story wants, such as "after the stop, before the next turn starts".
 */
function beatOf(steps: readonly Step[], kind?: BeatKind): Fixture {
  const beats = beatFixtures(steps);
  const found =
    kind === undefined
      ? beats.at(-1)
      : beats.findLast((f) => select.lastBeat(f.events)?.kind === kind);
  if (!found) throw new Error(`No ${kind ?? "last"} beat in the script`);
  return found;
}

/** The starter's third roll ends their turn: limit 3, seat 1 to roll. */
const limitThree = [
  ...viewerStarts,
  roll(0, 3, 2),
  roll(0, 4, 2),
  roll(0, 6, 3),
];

/** The game starts: the viewer rolls first. */
export const beatGameStart: Fixture = beatOf([newGame]);
/** The viewer's roll to start, before the handover to seat 1. */
export const beatViewerRollToStart: Fixture = beatOf(
  [newGame, roll(0, 4)],
  "rollOffRolled",
);
/** Seat 1 rolls a 3 to start, before the handover to seat 2. */
export const beatBotRollToStart: Fixture = beatOf(
  [newGame, roll(0, 4), roll(1, 3)],
  "rollOffRolled",
);
/** Seats 0 and 1 tied on 4, before the viewer's turn to roll again. */
export const beatRollOffTie: Fixture = beatOf(tiedOnFour, "rollOffStarted");
/** The viewer won the roll to start, before their turn starts. */
export const beatRollOffWinner: Fixture = beatOf(viewerStarts, "roundStarted");
/** The viewer rolls 5-2: `viewerRolledKeepable` with its animation. */
export const beatViewerRolls: Fixture = beatOf([
  ...viewerStarts,
  roll(0, 5, 2),
]);
/** The viewer stopped on 6-3, before the handover to seat 1. */
export const beatViewerStops: Fixture = beatOf(limitTwo, "turnEnded");
/** Seat 1's roll against the viewer's 6-3: better, equal, worse. */
export const botBeats: Fixture = beatOf([...limitTwo, roll(1, 6, 5)]);
export const botTies: Fixture = beatOf([...limitTwo, roll(1, 3, 6)]);
export const botWorse: Fixture = beatOf([...limitTwo, roll(1, 4, 2)]);
/** Seat 1 let go of its 5 and kept the 6 instead: one beat. */
export const beatBotKeepSwap: Fixture = beatOf([
  ...limitThree,
  roll(1, 5, 2),
  keep(1, 0, true),
  roll(1, 6),
  [keep(1, 0, false), keep(1, 1, true)],
]);
/** Seat 1's second roll used its last, before the handover to seat 2. */
export const beatNoRollsLeft: Fixture = beatOf(
  [...limitTwo, roll(1, 4, 2), roll(1, 3, 2)],
  "turnEnded",
);
/** The viewer stopped on a Mitchi: limit 1 and the pot 2 ride on the stop. */
export const beatStopMitchi: Fixture = beatOf(mitchiStop, "turnEnded");
/** Tie-break 1 opens and the pot doubles, before seat 1's turn. */
export const beatTieBreakOpens: Fixture = beatOf(
  tieOnThreeOne,
  "tieBreakStarted",
);
/** Seat 1's tie-break roll, before the viewer's turn. */
export const beatTieBreakRolled: Fixture = beatOf(
  [...tieOnThreeOne, roll(1, 4, 3)],
  "tieBreakRolled",
);
/** Seat 3's 3-2 ends the round, before the pot is taken. */
export const beatLastHandOfRound: Fixture = beatOf(roundOne, "turnEnded");
/** Round 6 starts with seat 1, a bot: its turn rides on the round start. */
export const beatRoundTwoBotStarts: Fixture = beatOf([
  ...fiveRounds,
  nextRound,
]);

export type SessionOptions = {
  readonly pending?: boolean;
  /** Overrides the fixture's. */
  readonly rollMs?: number;
  /** Overrides the fixture's. false makes `allowed` none. */
  readonly caughtUp?: boolean;
  /** The viewer's dice are animating: `allowed` is none. */
  readonly animating?: boolean;
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
  const live =
    (options.caughtUp ?? fixture.caughtUp ?? true) && !options.animating;
  return {
    view: {
      state: fixture.state,
      events: fixture.events,
      viewerSeat,
      pending: options.pending ?? false,
      rollMs: options.rollMs ?? fixture.rollMs ?? 0,
    },
    allowed: live
      ? select.allowedIntents(fixture.state, viewerSeat)
      : select.noIntents,
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
