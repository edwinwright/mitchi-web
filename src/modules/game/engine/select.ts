import type { HandId } from "@/data/hands";
import type { AllowedIntents } from "./session";
import { handFromDice, rankOf, worstOf } from "./hand-rank";
import {
  MAX_ROLLS,
  type DicePair,
  type GameState,
  type KeptPair,
  type RollCount,
  type Seat,
  type SeatHand,
} from "./types";

/** Pure and total on valid states (ENG-7). Nothing here is stored. */

/** Null in the roll-off: nobody holds the turn. */
export function actingSeat(state: GameState): Seat | null {
  const { phase } = state;
  if (phase.kind === "turn") return phase.seat;
  if (phase.kind === "tieBreak")
    return phase.order[phase.rolled.length] ?? null;
  return null;
}

/**
 * Who may roll now. Roll-off: the seats still to roll this pass, ascending.
 * Turn and tie-break: the acting seat. Otherwise nobody.
 */
export function toRoll(state: GameState): readonly Seat[] {
  const { phase } = state;
  if (phase.kind === "rollOff") {
    return phase.seats
      .filter((seat) => !phase.rolled.some((rolled) => rolled.seat === seat))
      .toSorted((a, b) => a - b);
  }
  const acting = actingSeat(state);
  return acting === null ? [] : [acting];
}

export function diceToRoll(state: GameState): 0 | 1 | 2 {
  const { phase } = state;
  switch (phase.kind) {
    case "rollOff":
      return 1;
    case "tieBreak":
      return 2;
    case "turn": {
      const keptCount = phase.kept.filter(Boolean).length;
      return (2 - keptCount) as 0 | 1 | 2;
    }
    default:
      return 0;
  }
}

/** The acting seat in a main-round turn only. */
export function rollsLeft(state: GameState): number | null {
  const { phase } = state;
  if (phase.kind !== "turn") return null;
  return limitOf(state) - phase.rollsUsed;
}

export function rollLimit(state: GameState): {
  set: number | null;
  max: typeof MAX_ROLLS;
} {
  return { set: state.round?.rollLimit ?? null, max: MAX_ROLLS };
}

export function worstHandSoFar(
  state: GameState,
): { hand: HandId; seats: readonly Seat[] } | null {
  const { phase, round } = state;
  if (phase.kind === "roundSummary") {
    return { hand: phase.takerHand, seats: [phase.taker] };
  }
  if (phase.kind === "turn" && round) return worstOf(round.finished);
  if (phase.kind === "tieBreak") return worstOf(phase.rolled);
  return null;
}

/**
 * The acting seat's hand against the worst so far. Null unless it is a
 * main-round turn, the seat has rolled, and someone has finished.
 */
export function standingAgainstWorst(
  state: GameState,
  seat: Seat,
): "beats" | "ties" | "worse" | null {
  const { phase } = state;
  if (phase.kind !== "turn" || phase.seat !== seat || phase.dice === null) {
    return null;
  }
  const worst = worstHandSoFar(state);
  if (!worst) return null;
  const mine = rankOf(handFromDice(phase.dice));
  const theirs = rankOf(worst.hand);
  if (mine < theirs) return "beats";
  return mine === theirs ? "ties" : "worse";
}

/** The seats with the most points, or null while nobody has any. */
export function nearestLimit(
  state: GameState,
): { seats: readonly Seat[]; points: number } | null {
  const points = Math.max(...state.points);
  if (points <= 0) return null;
  const seats = state.points.flatMap((p, seat) => (p === points ? [seat] : []));
  return { seats, points };
}

export function allowedIntents(state: GameState, seat: Seat): AllowedIntents {
  const none: AllowedIntents = {
    roll: false,
    setKeep: false,
    stop: false,
    nextRound: false,
    newGame: false,
  };
  const { phase } = state;
  switch (phase.kind) {
    case "notStarted":
    case "gameOver":
      return { ...none, newGame: true };
    case "roundSummary":
      return { ...none, nextRound: true };
    case "rollOff":
    case "tieBreak":
      return { ...none, roll: toRoll(state).includes(seat) };
    case "turn": {
      if (phase.seat !== seat) return none;
      if (phase.dice === null) return { ...none, roll: true };
      return {
        ...none,
        roll: !phase.kept[0] || !phase.kept[1],
        setKeep: true,
        stop: true,
      };
    }
  }
}

/** The acting seat in a turn, once it has dice. Null otherwise. */
export function kept(state: GameState, seat: Seat): KeptPair | null {
  const { phase } = state;
  if (phase.kind !== "turn" || phase.seat !== seat || phase.dice === null) {
    return null;
  }
  return phase.kept;
}

/** What a seat shows in the Players panel. Null when it has nothing to show. */
export function seatHand(state: GameState, seat: Seat): SeatHand | null {
  const { phase, round } = state;
  switch (phase.kind) {
    case "rollOff": {
      const rolled = phase.rolled.find((r) => r.seat === seat);
      return rolled ? { kind: "die", face: rolled.die } : null;
    }
    case "tieBreak": {
      const roll = phase.rolled.find((r) => r.seat === seat);
      return roll
        ? handOf(roll.dice, roll.hand, null, { final: true, kept: null })
        : null;
    }
    case "turn": {
      if (phase.seat === seat && phase.dice !== null) {
        return handOf(
          phase.dice,
          handFromDice(phase.dice),
          phase.rollsUsed as RollCount,
          { final: false, kept: phase.kept },
        );
      }
      return finishedHand(round, seat);
    }
    case "roundSummary":
    case "gameOver":
      return finishedHand(round, seat);
    default:
      return null;
  }
}

/** False only for non-participants in a tie-break. */
export function inContest(state: GameState, seat: Seat): boolean {
  const { phase } = state;
  return phase.kind !== "tieBreak" || phase.order.includes(seat);
}

export function tieBreakNumber(state: GameState): number | null {
  return state.phase.kind === "tieBreak" && state.round
    ? state.round.tieBreaks
    : null;
}

function limitOf(state: GameState): number {
  return state.round?.rollLimit ?? MAX_ROLLS;
}

function finishedHand(round: GameState["round"], seat: Seat): SeatHand | null {
  const finished = round?.finished.find((f) => f.seat === seat);
  return finished
    ? handOf(finished.dice, finished.hand, finished.rollsUsed as RollCount, {
        final: true,
        kept: null,
      })
    : null;
}

function handOf(
  dice: DicePair,
  hand: HandId,
  rollsUsed: RollCount | null,
  rest: { final: boolean; kept: KeptPair | null },
): SeatHand {
  return { kind: "hand", dice, hand, rollsUsed, ...rest };
}
