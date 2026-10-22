import type { Action, ApplyResult, RejectionCode } from "./actions";
import type { BotReason, GameEvent } from "./events";
import { applyEvent } from "./evolve";
import { clockwiseFrom, opposite, orderFrom } from "./order";
import * as select from "./select";
import { handFromDice, isMitchi, worstOf } from "./hand-rank";
import {
  MAX_ROLLS,
  type DicePair,
  type Die,
  type GameConfig,
  type GameState,
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
    acting: null,
  };
}

/**
 * Never throws on bad input (ENG-4): a rejection carries the same state
 * reference and no events. It throws only for a corrupt state.
 *
 * Decide the events, then fold them: every state change goes through
 * `applyEvent`, so the returned state is always the fold of the returned
 * events. A pot that takes a player to the point limit or past it passes
 * through `potTaken` (state `roundSummary`) and `gameEnded`; the returned
 * state is `gameOver`, so no `roundSummary` is ever returned for it.
 */
export function applyAction(state: GameState, action: Action): ApplyResult {
  const code = validate(state, action);
  if (code) return reject(state, code);

  const draft = begin(state);
  const { phase } = state;
  switch (action.type) {
    case "newGame":
      newGame(draft);
      return finish(state, draft);
    case "roll":
      if (phase.kind === "rollOff") {
        rollOff(draft, action.seat, action.values[0]);
        return finish(state, draft);
      }
      if (phase.kind === "turn") {
        rollInTurn(draft, action.values, action.reason);
        return finish(state, draft);
      }
      if (phase.kind === "tieBreak") {
        rollInTieBreak(draft, action.values);
        return finish(state, draft);
      }
      break;
    case "nextRound":
      if (phase.kind === "roundSummary") {
        nextRound(draft);
        return finish(state, draft);
      }
      break;
    case "keep":
      if (phase.kind === "turn") {
        keepInTurn(draft, action.die, action.kept);
        return finish(state, draft);
      }
      break;
    case "stop":
      if (phase.kind === "turn" && phase.dice !== null) {
        endTurn(draft, "stop", action.reason);
        return finish(state, draft);
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

/**
 * The state as of the events emitted so far. No function below assigns a
 * state field: the only way state changes is `emit`, so a decision reads
 * `draft.state` and sees the effect of what it already emitted.
 */
type Draft = { state: GameState; readonly events: GameEvent[] };

const begin = (state: GameState): Draft => ({ state, events: [] });

function emit(draft: Draft, event: GameEvent): void {
  draft.state = applyEvent(draft.state, event);
  draft.events.push(event);
}

/** No events means no change: hand back the state that came in (an idempotent keep). */
function finish(start: GameState, draft: Draft): ApplyResult {
  return {
    ok: true,
    state: draft.events.length === 0 ? start : draft.state,
    events: draft.events,
  };
}

function newGame(draft: Draft): void {
  const { seats, pointLimit } = draft.state.config;
  emit(draft, { type: "gameStarted", seats, pointLimit });
  emit(draft, { type: "rollOffStarted", seats: clockwiseFrom(seats, 0) });
}

function rollOff(draft: Draft, seat: Seat, die: Die): void {
  emit(draft, { type: "rollOffRolled", seat, die });
  const { phase } = draft.state;
  if (phase.kind !== "rollOff")
    throw new Error("Corrupt state: not a roll-off");
  if (phase.rolled.length < phase.seats.length) return;

  // The pass is complete: the highest die starts, or the tied highest go again.
  const highest = Math.max(...phase.rolled.map((r) => r.die));
  const tied = phase.rolled
    .filter((r) => r.die === highest)
    .map((r) => r.seat)
    .toSorted((a, b) => a - b);

  if (tied.length > 1) {
    emit(draft, { type: "rollOffStarted", seats: tied });
    return;
  }
  const startingSeat = tied[0];
  emit(draft, { type: "roundStarted", round: 1, startingSeat });
  emit(draft, { type: "turnStarted", seat: startingSeat, context: "round" });
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
type TieBreak = Extract<Phase, { kind: "tieBreak" }>;

function roundOf(state: GameState): RoundState {
  if (!state.round) throw new Error("Corrupt state: a turn with no round");
  return state.round;
}

function turnOf(state: GameState): Turn {
  if (state.phase.kind !== "turn") throw new Error("Corrupt state: not a turn");
  return state.phase;
}

function tieBreakOf(state: GameState): TieBreak {
  if (state.phase.kind !== "tieBreak") {
    throw new Error("Corrupt state: not a tie-break");
  }
  return state.phase;
}

/** A set, not a toggle: a flag already at that value is accepted and changes nothing. */
function keepInTurn(draft: Draft, die: 0 | 1, kept: boolean): void {
  const phase = turnOf(draft.state);
  if (phase.kept[die] === kept) return;
  emit(draft, { type: "keepSet", seat: phase.seat, die, kept });
}

function rollInTurn(
  draft: Draft,
  values: readonly Die[],
  reason: BotReason | null,
): void {
  const phase = turnOf(draft.state);
  const round = roundOf(draft.state);
  // Kept slots keep their faces; the others take `values` in slot order.
  let next = 0;
  const take = (slot: 0 | 1): Die =>
    phase.dice && phase.kept[slot] ? phase.dice[slot] : values[next++];
  const dice: DicePair = [take(0), take(1)];
  const rollNumber = phase.rollsUsed + 1;
  emit(draft, {
    type: "rolled",
    seat: phase.seat,
    dice,
    hand: handFromDice(dice),
    rollNumber,
    previous: phase.dice
      ? { dice: phase.dice, hand: handFromDice(phase.dice) }
      : null,
    kept: phase.kept,
    reason: reason ?? null,
  });

  if (rollNumber >= (round.rollLimit ?? MAX_ROLLS)) {
    endTurn(draft, "noRollsLeft", null);
  }
}

/**
 * Ends the acting seat's turn: `turnEnded`, the starter's `rollLimitSet`,
 * the pot if the hand is a Mitchi, `worstHandChanged`, then the next seat's
 * `turnStarted`. The pot is assessed here and nowhere earlier (OQ 4).
 */
function endTurn(
  draft: Draft,
  cause: "stop" | "noRollsLeft",
  reason: BotReason | null,
): void {
  const { seat, dice, rollsUsed } = turnOf(draft.state);
  if (dice === null) throw new Error("Corrupt state: a turn ends with no dice");
  const hand = handFromDice(dice);
  // Captured before turnEnded folds this hand into the round.
  const worstBefore = worstOf(roundOf(draft.state).finished);

  emit(draft, {
    type: "turnEnded",
    seat,
    dice,
    hand,
    rollsUsed,
    cause,
    reason,
  });
  const round = roundOf(draft.state);

  if (seat === round.startingSeat) {
    emit(draft, { type: "rollLimitSet", seat, limit: rollsUsed });
  }
  if (isMitchi(hand)) {
    const mitchis = round.finished.filter((f) => isMitchi(f.hand)).length;
    emit(draft, {
      type: "potChanged",
      pot: 2 * mitchis,
      previous: round.pot,
      cause: "mitchi",
    });
  }

  const worstAfter = worstOf(round.finished);
  if (
    worstAfter &&
    (worstBefore?.hand !== worstAfter.hand ||
      worstBefore.seats.join() !== worstAfter.seats.join())
  ) {
    emit(draft, { type: "worstHandChanged", ...worstAfter });
  }

  const nextSeat = round.order[round.finished.length];
  if (nextSeat === undefined) {
    resolveRound(draft, worstAfter);
    return;
  }
  emit(draft, { type: "turnStarted", seat: nextSeat, context: "round" });
}

type Worst = NonNullable<ReturnType<typeof worstOf>>;

/**
 * Everyone has finished (or a tie-break has been rolled): a unique worst
 * takes the pot; seats tied on the worst roll again with the pot doubled.
 */
function resolveRound(draft: Draft, worst: Worst | null): void {
  if (!worst) throw new Error("Corrupt state: a round with no hands");
  if (worst.seats.length === 1) {
    takePot(draft, worst.seats[0], worst.hand);
  } else {
    startTieBreak(draft, worst);
  }
}

function takePot(draft: Draft, seat: Seat, hand: Worst["hand"]): void {
  const round = roundOf(draft.state);
  emit(draft, {
    type: "potTaken",
    seat,
    pot: round.pot,
    points: draft.state.points[seat] + round.pot,
    tieBreaks: round.tieBreaks,
    hand,
  });
  const { points, config } = draft.state;
  if (points[seat] < config.pointLimit) return;

  // Points are uncapped. Every seat on the fewest wins; two or more is a
  // draw. The taker cannot be among them: everyone else was under the limit.
  const fewest = Math.min(...points);
  const winners = points.flatMap((p, i) => (p === fewest ? [i] : []));
  if (!isWinners(winners)) throw new Error("Corrupt state: no winners");
  emit(draft, { type: "gameEnded", winners, points });
}

/**
 * The pot doubles before anyone rolls. The direction alternates from the
 * round's clockwise, so tie-break 1 is anticlockwise, and the walk starts
 * at the last roller.
 */
function startTieBreak(draft: Draft, tied: Worst): void {
  // Read before the first emit: the fold overwrites the pot and the direction.
  const round = roundOf(draft.state);
  if (round.lastRoller === null) {
    throw new Error("Corrupt state: a tie-break with no last roller");
  }
  const direction = opposite(round.lastDirection);
  const order = orderFrom(
    draft.state.config.seats,
    round.lastRoller,
    direction,
    tied.seats,
  );
  emit(draft, {
    type: "potChanged",
    pot: round.pot * 2,
    previous: round.pot,
    cause: "tieBreak",
  });
  emit(draft, {
    type: "tieBreakStarted",
    number: round.tieBreaks + 1,
    seats: order,
    direction,
    tiedOn: tied.hand,
  });
  emit(draft, { type: "turnStarted", seat: order[0], context: "tieBreak" });
}

/** A tie-break roll is the player's whole turn: final as it lands, so a Mitchi adds 2 at once. */
function rollInTieBreak(draft: Draft, values: readonly Die[]): void {
  const before = tieBreakOf(draft.state);
  const seat = before.order[before.rolled.length];
  const dice: DicePair = [values[0], values[1]];
  const hand = handFromDice(dice);
  emit(draft, { type: "tieBreakRolled", seat, dice, hand });

  if (isMitchi(hand)) {
    const { pot } = roundOf(draft.state);
    emit(draft, {
      type: "potChanged",
      pot: pot + 2,
      previous: pot,
      cause: "mitchi",
    });
  }

  const phase = tieBreakOf(draft.state);
  const next = phase.order[phase.rolled.length];
  if (next !== undefined) {
    emit(draft, { type: "turnStarted", seat: next, context: "tieBreak" });
    return;
  }
  resolveRound(draft, worstOf(phase.rolled));
}

/** The taker starts. The limit and the pot are fresh; nothing carries over. */
function nextRound(draft: Draft): void {
  const { phase } = draft.state;
  if (phase.kind !== "roundSummary") {
    throw new Error("Corrupt state: not a round summary");
  }
  const number = roundOf(draft.state).number + 1;
  emit(draft, {
    type: "roundStarted",
    round: number,
    startingSeat: phase.taker,
  });
  emit(draft, { type: "turnStarted", seat: phase.taker, context: "round" });
}
