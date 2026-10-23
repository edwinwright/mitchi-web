import type { BotReason, GameEvent } from "./events";
import type { Die, DieSlot, GameState, Seat } from "./types";

/**
 * `roll.values` holds only the dice being rolled; kept slots keep their
 * values and the unkept slots take `values` in slot order. `reason` is
 * informational: the engine copies it onto the event and never validates
 * on it.
 */
export type PlayerAction =
  | {
      readonly type: "roll";
      readonly seat: Seat;
      readonly values: readonly Die[];
      readonly reason: BotReason | null;
    }
  /** A set, not a toggle: a duplicate is harmless (ENG-5). */
  | {
      readonly type: "keep";
      readonly seat: Seat;
      readonly die: DieSlot;
      readonly kept: boolean;
    }
  | {
      readonly type: "stop";
      readonly seat: Seat;
      readonly reason: BotReason | null;
    };

/** Seatless. Who may send one online is a session permission, not an engine rule. */
export type ControlAction =
  { readonly type: "newGame" } | { readonly type: "nextRound" };

export type Action = PlayerAction | ControlAction;

/** What a client may send: no dice, no reason. */
export type ActionRequest =
  | { readonly type: "roll"; readonly seat: Seat }
  | {
      readonly type: "keep";
      readonly seat: Seat;
      readonly die: DieSlot;
      readonly kept: boolean;
    }
  | { readonly type: "stop"; readonly seat: Seat }
  | ControlAction;

export type RejectionCode =
  /** type is not one of the five. */
  | "unknownAction"
  /** Not an integer in 0..seats-1. */
  | "unknownSeat"
  /** Not legal in this phase, including keep or stop in a tie-break. */
  | "wrongPhase"
  | "notYourTurn"
  /** keep or stop before the first roll of the turn. */
  | "noDiceRolled"
  /** Defensive; unreachable from a valid state. */
  | "noRollsLeft"
  /** roll with both dice kept: un-keep one or stop. */
  | "bothKept"
  /** values.length !== diceToRoll(state). */
  | "wrongDiceCount"
  /** A value outside 1..6, a die slot outside {0, 1}, or `kept` not a boolean. */
  | "invalidDie";

export type Rejection = { readonly code: RejectionCode };

export type ApplyResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly events: readonly GameEvent[];
    }
  /** `state` is the same reference that was passed in (ENG-4). */
  | {
      readonly ok: false;
      readonly rejection: Rejection;
      readonly state: GameState;
    };
