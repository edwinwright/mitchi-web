import type { Action, ApplyResult, RejectionCode } from "./actions";
import type { BotReason, GameEvent } from "./events";
import { clockwiseFrom, opposite, orderFrom } from "./order";
import * as select from "./select";
import { handFromDice, isMitchi, worstOf } from "./hand-rank";
import {
  MAX_ROLLS,
  type DicePair,
  type Die,
  type FinishedHand,
  type GameConfig,
  type GameState,
  type KeptPair,
  type Phase,
  type RoundState,
  type Seat,
  type Winners,
} from "./types";

const ACTION_TYPES = ["roll", "keep", "stop", "newGame", "nextRound"] as const;

/** Throws on a bad config: a programmer error, not player input. */
export function createGame(config: GameConfig): GameState {
  const { seats, pointLimit } = config;
  if (
    !Number.isInteger(seats) ||
    seats < 2 ||
    !Number.isInteger(pointLimit) ||
    pointLimit < 1
  ) {
    throw new Error(`Bad config: ${seats} seats, point limit ${pointLimit}`);
  }
  return {
    config: { seats, pointLimit },
    points: Array.from({ length: seats }, () => 0),
    round: null,
    phase: { kind: "notStarted" },
  };
}

/**
 * Never throws on bad input (ENG-4): a rejection carries the same state
 * reference and no events. It throws only for a corrupt state.
 *
 * A pot that takes a player to the point limit or past it ends the game
 * at once: no `roundSummary`, and no extra roll.
 */
export function applyAction(state: GameState, action: Action): ApplyResult {
  const code = validate(state, action);
  if (code) return reject(state, code);

  switch (action.type) {
    case "newGame":
      return newGame(state);
    case "roll":
      if (state.phase.kind === "rollOff") {
        return rollOff(state, action.seat, action.values[0]);
      }
      if (state.phase.kind === "turn") {
        return rollInTurn(state, state.phase, action.values, action.reason);
      }
      if (state.phase.kind === "tieBreak") {
        return rollInTieBreak(state, state.phase, action.values);
      }
      break;
    case "nextRound":
      if (state.phase.kind === "roundSummary") {
        return nextRound(state, state.phase.taker);
      }
      break;
    case "keep":
      if (state.phase.kind === "turn") {
        return keepInTurn(state, state.phase, action.die, action.kept);
      }
      break;
    case "stop":
      if (state.phase.kind === "turn" && state.phase.dice !== null) {
        return endTurn(
          state,
          state.phase.seat,
          state.phase.dice,
          state.phase.rollsUsed,
          "stop",
          action.reason,
          [],
        );
      }
      break;
  }
  return reject(state, "wrongPhase");
}

function reject(state: GameState, code: RejectionCode): ApplyResult {
  return { ok: false, rejection: { code }, state };
}

/** Rejection precedence: the first failing check wins. Steps 1 to 10 of the spec. */
function validate(state: GameState, input: unknown): RejectionCode | null {
  // 1. The type is one of the five.
  if (!isRecord(input)) return "unknownAction";
  const type = ACTION_TYPES.find((t) => t === input.type);
  if (!type) return "unknownAction";
  const { phase } = state;

  // 2. A control action in its phase.
  if (type === "newGame") {
    return phase.kind === "notStarted" || phase.kind === "gameOver"
      ? null
      : "wrongPhase";
  }
  if (type === "nextRound") {
    return phase.kind === "roundSummary" ? null : "wrongPhase";
  }

  // 3. The seat is an integer in range.
  const seat = input.seat;
  if (
    typeof seat !== "number" ||
    !Number.isInteger(seat) ||
    seat < 0 ||
    seat >= state.config.seats
  ) {
    return "unknownSeat";
  }

  // 4. The action is legal in this phase.
  const legal =
    type === "roll"
      ? phase.kind === "rollOff" ||
        phase.kind === "turn" ||
        phase.kind === "tieBreak"
      : phase.kind === "turn";
  if (!legal) return "wrongPhase";

  // 5. The seat may act: the acting seat, or any seat still to roll in the roll-off.
  if (!select.toRoll(state).includes(seat)) return "notYourTurn";

  if (phase.kind === "turn") {
    // 6. Keep or stop needs dice.
    if (type !== "roll" && phase.dice === null) return "noDiceRolled";
    // 7. Rolls remain (defensive).
    if (type === "roll" && select.rollsLeft(state) === 0) return "noRollsLeft";
    // 8. A roll with both dice kept.
    if (type === "roll" && phase.kept[0] && phase.kept[1]) return "bothKept";
  }

  // 9. The right number of dice.
  if (type === "roll") {
    const values = input.values;
    if (!Array.isArray(values) || values.length !== select.diceToRoll(state)) {
      return "wrongDiceCount";
    }
    // 10. Each die a whole number from 1 to 6.
    if (!values.every(isDie)) return "invalidDie";
  }

  // 10. A die slot of 0 or 1, and a boolean flag.
  if (type === "keep") {
    if (
      (input.die !== 0 && input.die !== 1) ||
      typeof input.kept !== "boolean"
    ) {
      return "invalidDie";
    }
  }
  return null;
}

function newGame(state: GameState): ApplyResult {
  const { seats, pointLimit } = state.config;
  const everyone = clockwiseFrom(seats, 0);
  return {
    ok: true,
    state: {
      config: state.config,
      points: state.points.map(() => 0),
      round: null,
      phase: { kind: "rollOff", seats: everyone, rolled: [] },
    },
    events: [
      { type: "gameStarted", seats, pointLimit },
      { type: "rollOffStarted", seats: everyone },
    ],
  };
}

function rollOff(state: GameState, seat: Seat, die: Die): ApplyResult {
  const { phase } = state;
  if (phase.kind !== "rollOff")
    throw new Error("Corrupt state: not a roll-off");

  const rolled = [...phase.rolled, { seat, die }];
  const events: GameEvent[] = [{ type: "rollOffRolled", seat, die }];

  if (rolled.length < phase.seats.length) {
    return {
      ok: true,
      state: { ...state, phase: { ...phase, rolled } },
      events,
    };
  }

  // The pass is complete: the highest die starts, or the tied highest go again.
  const highest = Math.max(...rolled.map((r) => r.die));
  const tied = rolled
    .filter((r) => r.die === highest)
    .map((r) => r.seat)
    .toSorted((a, b) => a - b);

  if (tied.length > 1) {
    events.push({ type: "rollOffStarted", seats: tied });
    return {
      ok: true,
      state: { ...state, phase: { kind: "rollOff", seats: tied, rolled: [] } },
      events,
    };
  }

  const startingSeat = tied[0];
  events.push(
    { type: "roundStarted", round: 1, startingSeat },
    { type: "turnStarted", seat: startingSeat, context: "round" },
  );
  return {
    ok: true,
    state: {
      ...state,
      round: {
        number: 1,
        startingSeat,
        order: clockwiseFrom(state.config.seats, startingSeat),
        rollLimit: null,
        finished: [],
        pot: 1,
        tieBreaks: 0,
        lastRoller: null,
        lastDirection: "clockwise",
      },
      phase: {
        kind: "turn",
        seat: startingSeat,
        rollsUsed: 0,
        dice: null,
        kept: [false, false],
      },
    },
    events,
  };
}

function isWinners(seats: readonly Seat[]): seats is Winners {
  return seats.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDie(value: unknown): value is Die {
  return (
    Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 6
  );
}

type Turn = Extract<Phase, { kind: "turn" }>;

function roundOf(state: GameState): RoundState {
  if (!state.round) throw new Error("Corrupt state: a turn with no round");
  return state.round;
}

/** A set, not a toggle: a flag already at that value is accepted and changes nothing. */
function keepInTurn(
  state: GameState,
  phase: Turn,
  die: 0 | 1,
  kept: boolean,
): ApplyResult {
  if (phase.kept[die] === kept) return { ok: true, state, events: [] };
  const flags: KeptPair =
    die === 0 ? [kept, phase.kept[1]] : [phase.kept[0], kept];
  return {
    ok: true,
    state: { ...state, phase: { ...phase, kept: flags } },
    events: [{ type: "keepSet", seat: phase.seat, die, kept }],
  };
}

function rollInTurn(
  state: GameState,
  phase: Turn,
  values: readonly Die[],
  reason: BotReason | null,
): ApplyResult {
  const round = roundOf(state);
  // Kept slots keep their faces; the others take `values` in slot order.
  let next = 0;
  const take = (slot: 0 | 1): Die =>
    phase.dice && phase.kept[slot] ? phase.dice[slot] : values[next++];
  const dice: DicePair = [take(0), take(1)];
  const rollsUsed = phase.rollsUsed + 1;
  const rolled: GameEvent = {
    type: "rolled",
    seat: phase.seat,
    dice,
    hand: handFromDice(dice),
    rollNumber: rollsUsed,
    previous: phase.dice
      ? { dice: phase.dice, hand: handFromDice(phase.dice) }
      : null,
    kept: phase.kept,
    reason: reason ?? null,
  };
  const rolledState: GameState = {
    ...state,
    round: { ...round, lastRoller: phase.seat },
  };

  if (rollsUsed >= (round.rollLimit ?? MAX_ROLLS)) {
    return endTurn(
      rolledState,
      phase.seat,
      dice,
      rollsUsed,
      "noRollsLeft",
      null,
      [rolled],
    );
  }
  return {
    ok: true,
    state: { ...rolledState, phase: { ...phase, rollsUsed, dice } },
    events: [rolled],
  };
}

/**
 * Ends the acting seat's turn: `turnEnded`, the starter's `rollLimitSet`,
 * the pot if the hand is a Mitchi, `worstHandChanged`, then the next seat's
 * `turnStarted`. The pot is assessed here and nowhere earlier (OQ 4).
 */
function endTurn(
  state: GameState,
  seat: Seat,
  dice: DicePair,
  rollsUsed: number,
  cause: "stop" | "noRollsLeft",
  reason: BotReason | null,
  before: readonly GameEvent[],
): ApplyResult {
  const round = roundOf(state);
  const hand = handFromDice(dice);
  const events: GameEvent[] = [
    ...before,
    { type: "turnEnded", seat, dice, hand, rollsUsed, cause, reason },
  ];
  const finished: readonly FinishedHand[] = [
    ...round.finished,
    { seat, dice, hand, rollsUsed },
  ];
  let { rollLimit, pot } = round;

  if (seat === round.startingSeat) {
    rollLimit = rollsUsed;
    events.push({ type: "rollLimitSet", seat, limit: rollsUsed });
  }
  if (isMitchi(hand)) {
    const mitchis = finished.filter((f) => isMitchi(f.hand)).length;
    events.push({
      type: "potChanged",
      pot: 2 * mitchis,
      previous: pot,
      cause: "mitchi",
    });
    pot = 2 * mitchis;
  }

  const worstBefore = worstOf(round.finished);
  const worstAfter = worstOf(finished);
  if (
    worstAfter &&
    (worstBefore?.hand !== worstAfter.hand ||
      worstBefore.seats.join() !== worstAfter.seats.join())
  ) {
    events.push({ type: "worstHandChanged", ...worstAfter });
  }

  const updated: RoundState = { ...round, rollLimit, finished, pot };
  const nextSeat = round.order[finished.length];
  if (nextSeat === undefined) {
    return resolveRound({ ...state, round: updated }, worstAfter, events);
  }

  events.push({ type: "turnStarted", seat: nextSeat, context: "round" });
  return {
    ok: true,
    state: {
      ...state,
      round: updated,
      phase: {
        kind: "turn",
        seat: nextSeat,
        rollsUsed: 0,
        dice: null,
        kept: [false, false],
      },
    },
    events,
  };
}

type Worst = NonNullable<ReturnType<typeof worstOf>>;
type TieBreak = Extract<Phase, { kind: "tieBreak" }>;

/**
 * Everyone has finished (or a tie-break has been rolled): a unique worst
 * takes the pot; seats tied on the worst roll again with the pot doubled.
 */
function resolveRound(
  state: GameState,
  worst: Worst | null,
  events: GameEvent[],
): ApplyResult {
  if (!worst) throw new Error("Corrupt state: a round with no hands");
  return worst.seats.length === 1
    ? takePot(state, worst.seats[0], worst.hand, events)
    : startTieBreak(state, worst, events);
}

function takePot(
  state: GameState,
  seat: Seat,
  hand: Worst["hand"],
  events: GameEvent[],
): ApplyResult {
  const round = roundOf(state);
  const points = state.points.map((p, i) => (i === seat ? p + round.pot : p));
  events.push({
    type: "potTaken",
    seat,
    pot: round.pot,
    points: points[seat],
    tieBreaks: round.tieBreaks,
  });
  if (points[seat] >= state.config.pointLimit) {
    // Points are uncapped. Every seat on the fewest wins; two or more is a
    // draw. The taker cannot be among them: everyone else was under the limit.
    const fewest = Math.min(...points);
    const winners = points.flatMap((p, i) => (p === fewest ? [i] : []));
    if (!isWinners(winners)) throw new Error("Corrupt state: no winners");
    events.push({ type: "gameEnded", winners, points });
    return {
      ok: true,
      state: { ...state, points, phase: { kind: "gameOver", winners } },
      events,
    };
  }
  return {
    ok: true,
    state: {
      ...state,
      points,
      phase: { kind: "roundSummary", taker: seat, takerHand: hand },
    },
    events,
  };
}

/**
 * The pot doubles before anyone rolls. The direction alternates from the
 * round's clockwise, so tie-break 1 is anticlockwise, and the walk starts
 * at the last roller.
 */
function startTieBreak(
  state: GameState,
  tied: Worst,
  events: GameEvent[],
): ApplyResult {
  const round = roundOf(state);
  if (round.lastRoller === null) {
    throw new Error("Corrupt state: a tie-break with no last roller");
  }
  const number = round.tieBreaks + 1;
  const direction = opposite(round.lastDirection);
  const order = orderFrom(
    state.config.seats,
    round.lastRoller,
    direction,
    tied.seats,
  );
  const pot = round.pot * 2;
  events.push(
    { type: "potChanged", pot, previous: round.pot, cause: "tieBreak" },
    {
      type: "tieBreakStarted",
      number,
      seats: order,
      direction,
      tiedOn: tied.hand,
    },
    { type: "turnStarted", seat: order[0], context: "tieBreak" },
  );
  return {
    ok: true,
    state: {
      ...state,
      round: { ...round, pot, tieBreaks: number, lastDirection: direction },
      phase: {
        kind: "tieBreak",
        direction,
        tiedOn: tied.hand,
        order,
        rolled: [],
      },
    },
    events,
  };
}

/** A tie-break roll is the player's whole turn: final as it lands, so a Mitchi adds 2 at once. */
function rollInTieBreak(
  state: GameState,
  phase: TieBreak,
  values: readonly Die[],
): ApplyResult {
  const round = roundOf(state);
  const seat = phase.order[phase.rolled.length];
  const dice: DicePair = [values[0], values[1]];
  const hand = handFromDice(dice);
  const rolled = [...phase.rolled, { seat, dice, hand }];
  const events: GameEvent[] = [{ type: "tieBreakRolled", seat, dice, hand }];

  let pot = round.pot;
  if (isMitchi(hand)) {
    pot += 2;
    events.push({
      type: "potChanged",
      pot,
      previous: round.pot,
      cause: "mitchi",
    });
  }
  const updated: GameState = {
    ...state,
    round: { ...round, pot, lastRoller: seat },
  };

  const next = phase.order[rolled.length];
  if (next !== undefined) {
    events.push({ type: "turnStarted", seat: next, context: "tieBreak" });
    return {
      ok: true,
      state: { ...updated, phase: { ...phase, rolled } },
      events,
    };
  }
  return resolveRound(updated, worstOf(rolled), events);
}

/** The taker starts. The limit and the pot are fresh; nothing carries over. */
function nextRound(state: GameState, taker: Seat): ApplyResult {
  const round = roundOf(state);
  const number = round.number + 1;
  return {
    ok: true,
    state: {
      ...state,
      round: {
        number,
        startingSeat: taker,
        order: clockwiseFrom(state.config.seats, taker),
        rollLimit: null,
        finished: [],
        pot: 1,
        tieBreaks: 0,
        lastRoller: null,
        lastDirection: "clockwise",
      },
      phase: {
        kind: "turn",
        seat: taker,
        rollsUsed: 0,
        dice: null,
        kept: [false, false],
      },
    },
    events: [
      { type: "roundStarted", round: number, startingSeat: taker },
      { type: "turnStarted", seat: taker, context: "round" },
    ],
  };
}
