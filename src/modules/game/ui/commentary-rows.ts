// Events to commentary rows. Pure. Type imports only: the UI may import one
// engine value, and that is `select`.

import type { HandId } from "@/data/hands";
import type {
  BotReason,
  DicePair,
  Die,
  Direction,
  LoggedEvent,
  RollCount,
  Seat,
} from "../engine";

export type Shown =
  { kind: "hand"; dice: DicePair; hand: HandId } | { kind: "die"; face: Die }; // roll-off

export const PLAIN_PHRASES = [
  "stop",
  "noRollsLeft",
  "rollAgainBoth",
  "rollAgainKeeping",
  "rolls",
  "rollsToStart",
  "startsRound",
  "wins",
] as const;
export type PlainPhrase = (typeof PLAIN_PHRASES)[number];
export type Phrase = { type: PlainPhrase } | { type: "takesPot"; pot: number };

export type CommentaryRow =
  | { kind: "turn"; key: string } // viewer only
  | {
      kind: "action";
      key: string;
      seat: Seat;
      voice: "you" | "player";
      shown: Shown | null;
      phrase: Phrase;
      reason: BotReason | null;
    }
  | { kind: "round"; key: string; number: number }
  | { kind: "rollLimit"; key: string; limit: RollCount }
  | {
      kind: "tieBreak";
      key: string;
      number: number;
      direction: Direction;
      order: readonly Seat[];
    }
  | { kind: "pot"; key: string; pot: number; cause: "mitchi" | "tieBreak" }
  /** The roll to start tied on the highest die: the tied roll again. */
  | { kind: "tied"; key: string; face: Die }
  | { kind: "draw"; key: string }
  | { kind: "gameOver"; key: string };

function toRollCount(limit: number): RollCount {
  if (limit === 1 || limit === 2 || limit === 3) return limit;
  throw new Error(`Roll limit out of range: ${limit}`);
}

export function commentaryRows(
  events: readonly LoggedEvent[],
  viewerSeat: Seat,
): CommentaryRow[] {
  const rows: CommentaryRow[] = [];

  for (const event of events) {
    const key = String(event.seq);

    const action = (
      seat: Seat,
      phrase: Phrase,
      shown: Shown | null,
      reason: BotReason | null = null,
      suffix = "",
    ) => {
      rows.push({
        kind: "action",
        key: key + suffix,
        seat,
        voice: seat === viewerSeat ? "you" : "player",
        shown,
        phrase,
        reason,
      });
    };

    switch (event.type) {
      // The viewer's turn row comes from their turnStarted, in every context.
      case "gameStarted":
      case "keepSet":
      case "worstHandChanged":
        break;

      case "rollOffStarted":
        if (event.tiedOn !== null) {
          rows.push({ kind: "tied", key, face: event.tiedOn });
        }
        break;

      case "rollOffRolled":
        action(
          event.seat,
          { type: "rollsToStart" },
          {
            kind: "die",
            face: event.die,
          },
        );
        break;

      case "roundStarted":
        rows.push({ kind: "round", key: `${key}:round`, number: event.round });
        action(
          event.startingSeat,
          { type: "startsRound" },
          null,
          null,
          ":starts",
        );
        break;

      case "turnStarted":
        if (event.seat === viewerSeat) rows.push({ kind: "turn", key });
        break;

      case "rolled":
        if (event.seat === viewerSeat) {
          action(
            event.seat,
            { type: "rolls" },
            { kind: "hand", dice: event.dice, hand: event.hand },
          );
        } else if (event.previous) {
          action(
            event.seat,
            {
              type:
                event.kept[0] || event.kept[1]
                  ? "rollAgainKeeping"
                  : "rollAgainBoth",
            },
            {
              kind: "hand",
              dice: event.previous.dice,
              hand: event.previous.hand,
            },
            event.reason,
          );
        }
        break;

      case "turnEnded":
        action(
          event.seat,
          { type: event.cause === "stop" ? "stop" : "noRollsLeft" },
          { kind: "hand", dice: event.dice, hand: event.hand },
          event.reason,
        );
        break;

      case "rollLimitSet":
        rows.push({
          kind: "rollLimit",
          key,
          limit: toRollCount(event.limit),
        });
        break;

      case "potChanged":
        rows.push({ kind: "pot", key, pot: event.pot, cause: event.cause });
        break;

      case "tieBreakStarted":
        rows.push({
          kind: "tieBreak",
          key,
          number: event.number,
          direction: event.direction,
          order: event.seats,
        });
        break;

      case "tieBreakRolled":
        action(
          event.seat,
          { type: "rolls" },
          { kind: "hand", dice: event.dice, hand: event.hand },
        );
        break;

      case "potTaken":
        action(event.seat, { type: "takesPot", pot: event.pot }, null);
        break;

      case "gameEnded":
        rows.push({ kind: "gameOver", key: `${key}:over` });
        if (event.winners.length >= 2) {
          rows.push({ kind: "draw", key: `${key}:draw` });
        }
        for (const seat of event.winners) {
          action(seat, { type: "wins" }, null, null, `:wins${seat}`);
        }
        break;
    }
  }

  return rows;
}
