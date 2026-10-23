import type { HandId } from "@/data/hands";

/** 0..seats-1, clockwise by index (ENG-6). */
export type Seat = number;
export type Die = 1 | 2 | 3 | 4 | 5 | 6;
/** Positional by slot, not sorted (ENG-11). Slot 0 is shown on the left. */
export type DicePair = readonly [Die, Die];
export type DieSlot = 0 | 1;
/** By slot. */
export type KeptPair = readonly [boolean, boolean];
export type Direction = "clockwise" | "anticlockwise";
/** Ascending seat order. One seat is a win; two or more is a draw. */
export type Winners = readonly [Seat, ...Seat[]];
export const MAX_ROLLS = 3;

export type GameConfig = {
  readonly seats: number;
  readonly pointLimit: number;
};

export type FinishedHand = {
  readonly seat: Seat;
  readonly dice: DicePair;
  readonly hand: HandId;
  readonly rollsUsed: number;
};

export type TieRoll = {
  readonly seat: Seat;
  readonly dice: DicePair;
  readonly hand: HandId;
};

/** The tie-break that settled a round: the final one when they chain. */
export type DecidingTieBreak = {
  readonly number: number;
  readonly tiedOn: HandId;
  /** Every tied seat's roll, in rolling order. */
  readonly rolled: readonly TieRoll[];
};

export type RoundState = {
  readonly number: number;
  readonly startingSeat: Seat;
  /** Clockwise from startingSeat. */
  readonly order: readonly Seat[];
  /** null until the starter's turn ends. */
  readonly rollLimit: number | null;
  readonly finished: readonly FinishedHand[];
  readonly pot: number;
  readonly tieBreaks: number;
  /** Last seat to roll in the round or its latest tie-break. */
  readonly lastRoller: Seat | null;
  /** "clockwise" at round start; each tie-break overwrites it. */
  readonly lastDirection: Direction;
};

export type Phase =
  | { readonly kind: "notStarted" }
  | {
      readonly kind: "rollOff";
      readonly seats: readonly Seat[];
      /** In rolling order (ascending seat), this pass only. */
      readonly rolled: readonly { seat: Seat; die: Die }[];
    }
  | {
      readonly kind: "turn";
      readonly seat: Seat;
      readonly rollsUsed: number;
      readonly dice: DicePair | null;
      readonly kept: KeptPair;
    }
  | {
      readonly kind: "tieBreak";
      readonly direction: Direction;
      readonly tiedOn: HandId;
      readonly order: readonly Seat[];
      readonly rolled: readonly TieRoll[];
    }
  | {
      readonly kind: "roundSummary";
      readonly taker: Seat;
      readonly takerHand: HandId;
      /** null when the round ended without a tie-break. */
      readonly tieBreak: DecidingTieBreak | null;
    }
  | {
      readonly kind: "gameOver";
      readonly winners: Winners;
      /** The round just played's, carried from its roundSummary. */
      readonly tieBreak: DecidingTieBreak | null;
    };

export type GameState = {
  readonly config: GameConfig;
  readonly points: readonly number[];
  /** null before round 1; kept at gameOver. */
  readonly round: RoundState | null;
  readonly phase: Phase;
  /**
   * The seat that may act now, or null: between turns and between the
   * events of a step, and always outside rollOff, turn and tieBreak.
   * Stored, not derived (ENG-7 amended): a state folded to mid-step needs
   * "nobody yet". Set by `turnStarted`; cleared by `turnEnded`,
   * `rollOffRolled`, `tieBreakRolled` and every event that changes phase.
   */
  readonly acting: Seat | null;
};

export type RollCount = 1 | 2 | 3;

/** What a seat is showing, for the Players panel. Read through select.seatHand. */
export type SeatHand =
  /** Roll-off, current pass. */
  | { readonly kind: "die"; readonly face: Die }
  | {
      readonly kind: "hand";
      readonly dice: DicePair;
      readonly hand: HandId;
      /** null for tie-break rolls. */
      readonly rollsUsed: RollCount | null;
      /** false only for the acting seat mid-turn. */
      readonly final: boolean;
      /** Acting seat mid-turn only. */
      readonly kept: KeptPair | null;
    };
