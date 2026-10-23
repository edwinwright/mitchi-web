import type { HandId } from "@/data/hands";
import type {
  DicePair,
  Die,
  DieSlot,
  Direction,
  KeptPair,
  Seat,
  Winners,
} from "./types";

export type BotReason =
  /** Non-starter stops: strictly beats the worst so far. */
  | "beatsWorstHandSoFar"
  /** Starter stops: six-three or better. */
  | "goodEnough"
  /** Rolls again keeping a 5 or 6. */
  | "keepingHighDie"
  /** Rolls again: no die worth keeping. */
  | "rerollingBoth";

type Held = { readonly dice: DicePair; readonly hand: HandId };

/**
 * What happened, in order. State is the fold of these (applyEvent), so an
 * event carries every field the fold needs. Ordering rules (each a test in
 * apply.test.ts):
 *
 * - `turnStarted` is the last event of any step that hands a roll to a seat,
 *   in the roll-off (context "rollOff"), a round and a tie-break.
 * - Game start: `gameStarted`, `rollOffStarted{tiedOn: null}`, `turnStarted`
 *   for seat 0.
 * - A roll-off roll gives `rollOffRolled`, then `turnStarted{rollOff}` for the
 *   next seat, or, when the pass is done, `rollOffStarted{tiedOn}` and
 *   `turnStarted{rollOff}` for the tied, or `roundStarted` and
 *   `turnStarted{round}` for the winner.
 * - A final roll gives `rolled` then `turnEnded{noRollsLeft}`.
 * - After `turnEnded`: the starter's `rollLimitSet`, `potChanged{mitchi}` if
 *   the hand is a Mitchi, `worstHandChanged` if it moved, then the next
 *   `turnStarted{round}`, or the end of the round.
 * - The end of a round gives `potTaken` (then `gameEnded` at the limit), or
 *   `tieBreakStarted`, `potChanged{tieBreak}`, `turnStarted{tieBreak}`.
 * - A tie-break roll gives `tieBreakRolled`, `potChanged{mitchi}` on a Mitchi,
 *   then `turnStarted{tieBreak}` for the next seat or the end of the round.
 * - `rollLimitSet`, `potChanged` and `worstHandChanged` are consequences of the
 *   event before them (they ride on its beat).
 */
export type GameEvent =
  | {
      readonly type: "gameStarted";
      readonly seats: number;
      readonly pointLimit: number;
    }
  /** The first pass, and each re-roll among the tied highest. */
  | {
      readonly type: "rollOffStarted";
      readonly seats: readonly Seat[];
      /** The face the seats tied on; null on the first pass. */
      readonly tiedOn: Die | null;
    }
  | { readonly type: "rollOffRolled"; readonly seat: Seat; readonly die: Die }
  | {
      readonly type: "roundStarted";
      readonly round: number;
      readonly startingSeat: Seat;
    }
  | {
      readonly type: "turnStarted";
      readonly seat: Seat;
      readonly context: "rollOff" | "round" | "tieBreak";
    }
  | {
      readonly type: "rolled";
      readonly seat: Seat;
      readonly dice: DicePair;
      readonly hand: HandId;
      readonly rollNumber: number;
      readonly previous: Held | null;
      /** The keeps this roll respected. */
      readonly kept: KeptPair;
      readonly reason: BotReason | null;
    }
  | {
      readonly type: "keepSet";
      readonly seat: Seat;
      readonly die: DieSlot;
      readonly kept: boolean;
    }
  | {
      readonly type: "turnEnded";
      readonly seat: Seat;
      readonly dice: DicePair;
      readonly hand: HandId;
      readonly rollsUsed: number;
      readonly cause: "stop" | "noRollsLeft";
      readonly reason: BotReason | null;
    }
  | {
      readonly type: "rollLimitSet";
      readonly seat: Seat;
      readonly limit: number;
    }
  /** Emitted only when the (hand, seats) pair changes. */
  | {
      readonly type: "worstHandChanged";
      readonly hand: HandId;
      readonly seats: readonly Seat[];
    }
  | {
      readonly type: "potChanged";
      readonly pot: number;
      readonly previous: number;
      readonly cause: "mitchi" | "tieBreak";
    }
  | {
      readonly type: "tieBreakStarted";
      readonly number: number;
      /** Rolling order. */
      readonly seats: readonly Seat[];
      readonly direction: Direction;
      readonly tiedOn: HandId;
    }
  | {
      readonly type: "tieBreakRolled";
      readonly seat: Seat;
      readonly dice: DicePair;
      readonly hand: HandId;
    }
  | {
      readonly type: "potTaken";
      readonly seat: Seat;
      readonly pot: number;
      /** The taker's new total, uncapped. */
      readonly points: number;
      readonly tieBreaks: number;
      /** The worst hand, the one that took the pot. */
      readonly hand: HandId;
    }
  | {
      readonly type: "gameEnded";
      readonly winners: Winners;
      readonly points: readonly number[];
    };
