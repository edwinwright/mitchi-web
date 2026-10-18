import type { Action, ApplyResult, RejectionCode } from "./actions";
import type { GameEvent } from "./events";
import { clockwiseFrom } from "./order";
import * as select from "./select";
import type { Die, GameConfig, GameState, Seat } from "./types";

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
 * Slice 4 builds `newGame` and the roll-off. A turn, tie-break or
 * round-summary action that passes validation is answered `wrongPhase`
 * until the slice that builds that phase.
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDie(value: unknown): value is Die {
  return (
    Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 6
  );
}
