// Turns a GameSession into the props of each panel. Pure. Stored fields of
// GameState are read directly; anything derived comes from `select`.

import { handById, type HandId } from "@/data/hands";
import {
  select,
  type AllowedIntents,
  type DicePair,
  type Die,
  type GameSession,
  type GameState,
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

/** Each flag is `allowed.x && !pending`. `busy` is `pending`. */
export type ControlsData = {
  roll: boolean;
  keep: boolean;
  stop: boolean;
  nextRound: boolean;
  newGame: boolean;
  busy: boolean;
};

/** The This round header bar. */
export type RoundBarData =
  | { kind: "rollOff" }
  /** Between rounds and at game over too: the round just played. */
  | { kind: "round"; number: number }
  | { kind: "tieBreak"; number: number; tiedOn: HandId };

/** The dice card's header, by stage. */
export type HeaderData =
  | { stage: "notStarted" }
  /** The next seat to roll this pass. */
  | { stage: "rollOff"; seat: Seat; viewer: boolean }
  | {
      stage: "round";
      number: number;
      /** null outside a tie-break. */
      tieBreak: number | null;
      /** The acting seat. */
      seat: Seat;
      viewer: boolean;
      pot: number;
      /** In a tie-break, from tie-break rolls only. null until someone has one. */
      handToBeat: HandId | null;
      /** Once the starter has set it, and never in a tie-break. */
      rollLimit: number | null;
    }
  | {
      stage: "summary";
      number: number;
      taker: Seat;
      viewer: boolean;
      pot: number;
      worstHand: HandId;
    }
  | { stage: "gameOver"; winners: Winners; viewerWon: boolean };

/** One box per roll the acting seat has this turn. */
export type RollsRowData = { available: number; used: number };

export type TrayData = {
  shown: ShownRoll | null;
  /**
   * The roll on show is a finished one, held after its turn (or a roll-off
   * die): the tray names who rolled it, since the header names who is next.
   */
  held: boolean;
  /** The acting seat against the hand to beat, in a main-round turn only. */
  comparison: "beats" | "ties" | "worse" | null;
  /** The shown dice are the viewer's: only then do Keep buttons name a face. */
  ownDice: boolean;
  /** null before start, between rounds and at game over. */
  rolls: RollsRowData | null;
  /** Set at gameOver. */
  winners: Winners | null;
};

/** The Roll node's label: one node, relabelled by phase. */
export type PrimaryAction = "start" | "roll" | "nextRound" | "playAgain";

export type RoundRowData = {
  seat: Seat;
  starting: boolean;
  /** Rolling now. Nobody is current in the roll-off. */
  current: boolean;
  /** Roll-off only: still to roll this pass. */
  waiting: boolean;
  hand: SeatHand | null;
  holdsWorst: boolean;
  /** False only for non-participants in a tie-break. */
  inContest: boolean;
  /** The hand is in the Mitchi group. */
  mitchi: boolean;
};

export type PointsRowData = {
  seat: Seat;
  points: number;
  /** Every seat on the fewest points; nobody while every seat is on 0. */
  fewest: boolean;
  /** During a game only. */
  close: boolean;
  /** At game over only. */
  reachedLimit: boolean;
  winner: boolean;
};

export type PointsData = {
  pointLimit: number;
  gameOver: boolean;
  rows: readonly PointsRowData[];
};

export type BoardSlices = {
  controls: ControlsData & {
    primary: { action: PrimaryAction; available: boolean };
  };
  header: HeaderData;
  tray: TrayData;
  /** null before start. */
  roundBar: RoundBarData | null;
  roundRows: readonly RoundRowData[];
  points: PointsData;
};

/** A seat this many points or fewer from the limit is close to it. */
const CLOSE_TO_LIMIT = 2;

/** The Roll node's label by phase, and the intent that decides whether it is available. */
const PRIMARY: Record<
  Phase["kind"],
  { action: PrimaryAction; intent: keyof AllowedIntents }
> = {
  notStarted: { action: "start", intent: "newGame" },
  rollOff: { action: "roll", intent: "roll" },
  turn: { action: "roll", intent: "roll" },
  tieBreak: { action: "roll", intent: "roll" },
  roundSummary: { action: "nextRound", intent: "nextRound" },
  gameOver: { action: "playAgain", intent: "newGame" },
};

/** The seq of the most recent roll of any kind, or null before one. */
export function latestRollSeq(events: SessionView["events"]): number | null {
  const roll = events.findLast(
    (event) =>
      event.type === "rolled" ||
      event.type === "tieBreakRolled" ||
      event.type === "rollOffRolled",
  );
  return roll?.seq ?? null;
}

/**
 * The roll on the table. The acting seat's dice once they have rolled this
 * turn, with their keep flags. Otherwise, while `holding`, the most recent
 * roll event, so a turn that ends on its own roll is seen at all. Otherwise
 * nothing: each turn starts with placeholders. Roll-off dice count only
 * while the roll-off is running.
 */
export function shownRoll(
  view: SessionView,
  holding: boolean,
): ShownRoll | null {
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
  if (!holding) return null;

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

/**
 * `holding`: the most recent roll is still within its hold (`hold.ts`). The
 * board times it; without one, nothing is held.
 */
export function sliceSession(
  session: GameSession,
  { holding = false }: { holding?: boolean } = {},
): BoardSlices {
  const { view, allowed } = session;
  const { state, viewerSeat, pending } = view;
  const { phase, round } = state;

  const acting = select.actingSeat(state);
  const worst = select.worstHandSoFar(state);
  const toRoll = select.toRoll(state);
  const shown = shownRoll(view, holding);
  const primary = PRIMARY[phase.kind];

  return {
    header: headerOf(state, viewerSeat),
    tray: {
      shown,
      // Only the acting seat mid-turn has keep flags; any other roll is past.
      held: shown !== null && (shown.kind === "die" || shown.kept === null),
      comparison:
        acting === null ? null : select.standingAgainstWorst(state, acting),
      ownDice: shown?.seat === viewerSeat,
      rolls: rollsOf(state),
      winners: phase.kind === "gameOver" ? phase.winners : null,
    },
    roundRows: state.points.map((_points, seat) => {
      const hand = select.seatHand(state, seat);
      return {
        seat,
        starting: round?.startingSeat === seat,
        current: acting === seat,
        waiting: phase.kind === "rollOff" && toRoll.includes(seat),
        hand,
        holdsWorst: worst?.seats.includes(seat) ?? false,
        inContest: select.inContest(state, seat),
        mitchi: hand?.kind === "hand" && handById(hand.hand).group === "mitchi",
      };
    }),
    points: pointsOf(state),
    controls: {
      roll: allowed.roll && !pending,
      keep: allowed.setKeep && !pending,
      stop: allowed.stop && !pending,
      nextRound: allowed.nextRound && !pending,
      newGame: allowed.newGame && !pending,
      busy: pending,
      primary: {
        action: primary.action,
        available: allowed[primary.intent] && !pending,
      },
    },
    roundBar: roundBarOf(state),
  };
}

function roundBarOf(state: GameState): RoundBarData | null {
  const { phase, round } = state;
  if (phase.kind === "rollOff") return { kind: "rollOff" };
  if (!round) return null;
  const tieBreak = select.tieBreakNumber(state);
  return tieBreak !== null && phase.kind === "tieBreak"
    ? { kind: "tieBreak", number: tieBreak, tiedOn: phase.tiedOn }
    : { kind: "round", number: round.number };
}

function headerOf(state: GameState, viewerSeat: Seat): HeaderData {
  const { phase, round } = state;
  switch (phase.kind) {
    case "notStarted":
      return { stage: "notStarted" };
    case "rollOff": {
      // The viewer always rolls first in a pass; the bots follow.
      const seat = select.toRoll(state)[0];
      return { stage: "rollOff", seat, viewer: seat === viewerSeat };
    }
    case "turn":
    case "tieBreak": {
      const seat = select.actingSeat(state);
      if (seat === null || !round) {
        throw new Error(`A ${phase.kind} with no acting seat or round`);
      }
      const tieBreak = select.tieBreakNumber(state);
      return {
        stage: "round",
        number: round.number,
        tieBreak,
        seat,
        viewer: seat === viewerSeat,
        pot: round.pot,
        handToBeat: select.worstHandSoFar(state)?.hand ?? null,
        rollLimit: tieBreak === null ? select.rollLimit(state).set : null,
      };
    }
    case "roundSummary":
      if (!round) throw new Error("A roundSummary with no round");
      return {
        stage: "summary",
        number: round.number,
        taker: phase.taker,
        viewer: phase.taker === viewerSeat,
        pot: round.pot,
        worstHand: phase.takerHand,
      };
    case "gameOver":
      return {
        stage: "gameOver",
        winners: phase.winners,
        viewerWon: phase.winners.includes(viewerSeat),
      };
  }
}

/**
 * The starter has three rolls until the limit is set, everyone else the
 * limit. The roll to start and a tie-break are one roll each, and the seat
 * shown has not used it: once it rolls, the next seat is up.
 */
function rollsOf(state: GameState): RollsRowData | null {
  const { phase } = state;
  switch (phase.kind) {
    case "rollOff":
    case "tieBreak":
      return { available: 1, used: 0 };
    case "turn": {
      const limit = select.rollLimit(state);
      return { available: limit.set ?? limit.max, used: phase.rollsUsed };
    }
    default:
      return null;
  }
}

function pointsOf(state: GameState): PointsData {
  const { points, phase, config } = state;
  const gameOver = phase.kind === "gameOver";
  const winners: readonly Seat[] = gameOver ? phase.winners : [];
  const fewest = Math.min(...points);
  const anyPoints = points.some((p) => p > 0);
  return {
    pointLimit: config.pointLimit,
    gameOver,
    rows: points.map((p, seat) => ({
      seat,
      points: p,
      fewest: anyPoints && p === fewest,
      close: !gameOver && p + CLOSE_TO_LIMIT >= config.pointLimit,
      reachedLimit: gameOver && p >= config.pointLimit,
      winner: winners.includes(seat),
    })),
  };
}
