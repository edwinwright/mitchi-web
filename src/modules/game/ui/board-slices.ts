// Turns a GameSession into the props of each panel. Pure. Stored fields of
// GameState are read directly; anything derived comes from `select`.

import type { HandId } from "@/data/hands";
import {
  select,
  type DicePair,
  type Die,
  type GameSession,
  type KeptPair,
  type Phase,
  type Seat,
  type SeatHand,
  type SessionView,
  type Winners,
} from "../engine";

/** The roll on the table: whose it is, and what it shows. */
export type ShownRoll =
  | {
      kind: "hand";
      seat: Seat;
      dice: DicePair;
      hand: HandId;
      /** The acting seat mid-turn only; a past roll has no keep flags. */
      kept: KeptPair | null;
    }
  | { kind: "die"; seat: Seat; face: Die }; // roll-off

export type DicePanelData = {
  phase: Phase["kind"];
  viewerSeat: Seat;
  shown: ShownRoll | null;
  /** The viewer holds a roll now: show the "Your turn" status line. */
  yourTurn: boolean;
};

/** Each flag is `allowed.x && !pending`. `busy` is `pending`. */
export type ControlsData = {
  roll: boolean;
  keep: boolean;
  stop: boolean;
  nextRound: boolean;
  newGame: boolean;
  busy: boolean;
};

export type RoundPanelData = {
  number: number;
  /** null until the starter's turn ends. */
  rollLimit: number | null;
  worst: { hand: HandId; seats: readonly Seat[] } | null;
  pot: number;
  tieBreak: { number: number; tiedOn: HandId } | null;
  /** The acting seat in a main-round turn only. */
  rollsLeft: number | null;
  /** The viewer's hand against the worst so far, if they have one. */
  standing: "beats" | "ties" | "worse" | null;
};

export type PlayerRowData = {
  seat: Seat;
  points: number;
  starting: boolean;
  /** Rolling now. Nobody is current in the roll-off. */
  current: boolean;
  /** Roll-off only: still to roll this pass. */
  waiting: boolean;
  hand: SeatHand | null;
  holdsWorst: boolean;
  /** False only for non-participants in a tie-break. */
  inContest: boolean;
};

export type PlayersPanelData = {
  viewerSeat: Seat;
  players: readonly PlayerRowData[];
};

export type GamePanelData = {
  pointLimit: number;
  nearest: { seats: readonly Seat[]; points: number } | null;
};

export type EndScreenData = {
  /** One seat is a win; two or more is a draw. */
  winners: Winners;
  points: readonly number[];
};

export type BoardSlices = {
  dice: DicePanelData;
  controls: ControlsData;
  /** null before round 1. */
  round: RoundPanelData | null;
  players: PlayersPanelData;
  game: GamePanelData;
  /** Set at gameOver; takes the Round panel's slot. */
  end: EndScreenData | null;
};

/**
 * The roll on the table. The acting seat's dice once they have rolled this
 * turn, with their keep flags. Otherwise the most recent roll event, so a
 * bot's one-roll turn stays on screen until the next seat rolls. Otherwise
 * nothing. Roll-off dice count only while the roll-off is running.
 */
export function shownRoll(view: SessionView): ShownRoll | null {
  const { state, events } = view;

  const acting = select.actingSeat(state);
  if (acting !== null) {
    const own = select.seatHand(state, acting);
    // Mid-turn only: a tie-break roller who has not rolled has no hand yet.
    if (own?.kind === "hand" && !own.final) {
      return {
        kind: "hand",
        seat: acting,
        dice: own.dice,
        hand: own.hand,
        kept: own.kept,
      };
    }
  }

  for (const event of events.toReversed()) {
    switch (event.type) {
      case "rolled":
      case "tieBreakRolled":
        return {
          kind: "hand",
          seat: event.seat,
          dice: event.dice,
          hand: event.hand,
          kept: null,
        };
      case "rollOffRolled":
        if (state.phase.kind === "rollOff") {
          return { kind: "die", seat: event.seat, face: event.die };
        }
        break;
    }
  }
  return null;
}

export function sliceSession(session: GameSession): BoardSlices {
  const { view, allowed } = session;
  const { state, viewerSeat, pending } = view;
  const { phase, round } = state;

  const acting = select.actingSeat(state);
  const worst = select.worstHandSoFar(state);
  const toRoll = select.toRoll(state);
  const tieBreak = select.tieBreakNumber(state);

  return {
    dice: {
      phase: phase.kind,
      viewerSeat,
      shown: shownRoll(view),
      yourTurn: toRoll.includes(viewerSeat),
    },
    controls: {
      roll: allowed.roll && !pending,
      keep: allowed.setKeep && !pending,
      stop: allowed.stop && !pending,
      nextRound: allowed.nextRound && !pending,
      newGame: allowed.newGame && !pending,
      busy: pending,
    },
    round: round
      ? {
          number: round.number,
          rollLimit: select.rollLimit(state).set,
          worst,
          pot: round.pot,
          tieBreak:
            tieBreak !== null && phase.kind === "tieBreak"
              ? { number: tieBreak, tiedOn: phase.tiedOn }
              : null,
          rollsLeft: select.rollsLeft(state),
          standing: select.standingAgainstWorst(state, viewerSeat),
        }
      : null,
    players: {
      viewerSeat,
      players: state.points.map((points, seat) => ({
        seat,
        points,
        starting: round?.startingSeat === seat,
        current: acting === seat,
        waiting: phase.kind === "rollOff" && toRoll.includes(seat),
        hand: select.seatHand(state, seat),
        holdsWorst: worst?.seats.includes(seat) ?? false,
        inContest: select.inContest(state, seat),
      })),
    },
    game: {
      pointLimit: state.config.pointLimit,
      nearest: select.nearestLimit(state),
    },
    end:
      phase.kind === "gameOver"
        ? { winners: phase.winners, points: state.points }
        : null,
  };
}
