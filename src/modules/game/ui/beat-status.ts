// The status line: what is happening now, one beat at a time. Pure. Type
// imports plus `select`, the one engine value the UI may import.

import {
  select,
  type Beat,
  type Die,
  type DieSlot,
  type GameState,
  type LoggedEvent,
  type Seat,
} from "../engine";
import { commentaryRows, type CommentaryRow } from "./commentary-rows";

export type StatusLine =
  /** status.intro, then status.youRollFirst when the viewer is first. */
  | { kind: "intro"; viewerFirst: boolean }
  /** Viewer: dice.yourTurn. Another seat: SeatLabel, then status.rollsNext. */
  | { kind: "handover"; seat: Seat; viewer: boolean }
  /** Viewer: status.youRolledToStart. Another seat: SeatLabel, then status.playerRolledToStart. */
  | { kind: "rolledToStart"; seat: Seat; viewer: boolean; face: Die }
  /** status.tied. */
  | { kind: "tied"; face: Die }
  /** A bot only. SeatLabel, then status.keeps or status.keepsInstead. */
  | { kind: "keeps"; seat: Seat; face: Die; instead: boolean }
  /** A log-shaped row, rendered by CommentaryRowView. */
  | { kind: "row"; row: CommentaryRow };

export type Status = {
  readonly line: StatusLine;
  /** Rider rows of the same beat, in log order: roll limit, pot, tie-break order, winners. */
  readonly details: readonly CommentaryRow[];
};

/** The status and the id of the beat that produced it. The id keys the announcer. */
export type BeatStatusData = { readonly beat: number; readonly status: Status };

const only = (line: StatusLine): Status => ({ line, details: [] });

/** The beat's first row as the line, the rest as details, checking the first is the one expected. */
function headed(
  rows: readonly CommentaryRow[],
  kind: CommentaryRow["kind"],
): Status {
  const [first, ...rest] = rows;
  if (first?.kind !== kind) {
    throw new Error(`A beat whose first row is not ${kind}: ${first?.kind}`);
  }
  return { line: { kind: "row", row: first }, details: rest };
}

/** The face at a slot of the seat's live dice: a keep event names the slot, not the face. */
function faceAt(state: GameState, seat: Seat, die: DieSlot): Die {
  const hand = select.seatHand(state, seat);
  if (hand?.kind !== "hand") throw new Error(`Seat ${seat} keeps with no dice`);
  return hand.dice[die];
}

/**
 * What the status line says for a beat. `state` is the shown state; it is
 * read only for a bot keep (the face at the kept slot), and a bot keep is
 * never a skipped beat, so it is the state that beat produced. Null for a
 * deliberately silent beat: the viewer's own keep and keep swap. Throws on a
 * beat it has no copy for, as `Row` and `headerOf` do.
 */
export function statusOf(
  beat: Beat<LoggedEvent>,
  state: GameState,
  viewerSeat: Seat,
): Status | null {
  const rows = commentaryRows(beat.events, viewerSeat);
  const viewer = beat.seat === viewerSeat;
  const [first, second] = beat.events;

  switch (beat.kind) {
    case "gameStarted": {
      const turn = beat.events.find((e) => e.type === "turnStarted");
      return only({
        kind: "intro",
        viewerFirst: turn?.type === "turnStarted" && turn.seat === viewerSeat,
      });
    }
    case "rollOffRolled":
      if (first.type !== "rollOffRolled") break;
      return only({
        kind: "rolledToStart",
        seat: first.seat,
        viewer,
        face: first.die,
      });
    case "rollOffStarted":
      if (first.type !== "rollOffStarted") break;
      if (first.tiedOn === null) {
        throw new Error("A roll-to-start tie with no face");
      }
      return only({ kind: "tied", face: first.tiedOn });
    case "roundStarted": {
      // The round row comes first in the log; the line is who starts.
      const line = rows.find(
        (row) => row.kind === "action" && row.phrase.type === "startsRound",
      );
      if (!line) break;
      return {
        line: { kind: "row", row: line },
        details: rows.filter((row) => row !== line),
      };
    }
    case "turnStarted":
      if (beat.seat === null) break;
      return only({ kind: "handover", seat: beat.seat, viewer });
    case "rolled":
      // The new dice and hand, never the reason: that belongs to the stop.
      if (first.type !== "rolled") break;
      return only({
        kind: "row",
        row: {
          kind: "action",
          key: String(first.seq),
          seat: first.seat,
          voice: viewer ? "you" : "player",
          shown: { kind: "hand", dice: first.dice, hand: first.hand },
          phrase: { type: "rolls" },
          reason: null,
        },
      });
    case "keepSet":
      if (first.type !== "keepSet") break;
      if (viewer) return null;
      if (!first.kept) throw new Error("A bot let go of a die alone");
      return only({
        kind: "keeps",
        seat: first.seat,
        face: faceAt(state, first.seat, first.die),
        instead: false,
      });
    case "keepSwapped":
      if (second?.type !== "keepSet") break;
      if (viewer) return null;
      return only({
        kind: "keeps",
        seat: second.seat,
        face: faceAt(state, second.seat, second.die),
        instead: true,
      });
    case "turnEnded":
    case "tieBreakRolled":
    case "potTaken":
      return headed(rows, "action");
    case "tieBreakStarted":
      return headed(rows, "tieBreak");
    case "gameEnded":
      return headed(rows, "gameOver");
    default: {
      const unknown: never = beat.kind;
      throw new Error(`No status for a ${String(unknown)} beat`);
    }
  }
  throw new Error(`A ${beat.kind} beat that does not start with its event`);
}

/** The latest beat that has a status, skipping silent beats. Null before any beat. */
export function latestStatus(
  events: readonly LoggedEvent[],
  state: GameState,
  viewerSeat: Seat,
): BeatStatusData | null {
  // The walk stops on the first beat with a status: keep it, not work it out again.
  const found: { status: Status | null } = { status: null };
  const beat = select.lastBeat(events, (candidate) => {
    found.status = statusOf(candidate, state, viewerSeat);
    return found.status === null;
  });
  return beat && found.status ? { beat: beat.id, status: found.status } : null;
}
