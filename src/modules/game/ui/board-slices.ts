// Turns a GameSession into the props of each panel. Pure. Every panel reads
// the shown state and the last released beat, so they all show the same
// moment. Stored fields of GameState are read directly; anything derived
// comes from `select`.

import { handById, type HandId } from "@/data/hands";
import {
  select,
  type AllowedIntents,
  type Beat,
  type DicePair,
  type Die,
  type GameSession,
  type GameState,
  type KeptPair,
  type LoggedEvent,
  type Phase,
  type Seat,
  type SeatHand,
  type SessionView,
  type Winners,
} from "../engine";
import { latestStatus, type BeatStatusData } from "./beat-status";

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
  /**
   * The seat rolling to start, or the one that has just rolled. `rolling`
   * is false when nobody is acting: the heading names the seat alone.
   */
  | { stage: "rollOff"; seat: Seat; viewer: boolean; rolling: boolean }
  | {
      stage: "round";
      number: number;
      /** null outside a tie-break. */
      tieBreak: number | null;
      /** The acting seat, or the one whose turn or roll has just ended. */
      seat: Seat;
      viewer: boolean;
      /** False when nobody is acting: the heading names the seat alone. */
      rolling: boolean;
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
   * The roll on show is a finished one on its own beat (a turn end, a
   * tie-break roll, a roll-to-start die): the tray names who rolled it.
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
  /**
   * Rolling now. In the roll to start too, once the handover beat has named
   * the seat. Nobody between turns.
   */
  current: boolean;
  /** Roll to start only: still to roll this pass, never the seat rolling now. */
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
  /** The status line for the latest beat that has one. Null before any beat. */
  status: BeatStatusData | null;
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

/** The pot beat that ends the game: the Roll label, unavailable until Play again. */
const ENDING = { action: "roll", intent: "roll" } as const;

/**
 * The roll on the table at this beat. The acting seat's live dice once they
 * have rolled this turn, with their keep flags. Between turns, the finished
 * roll the beat is about: a turn end, a tie-break roll or a roll-to-start
 * die. Otherwise nothing: a handover, a round start, a tie-break opening, the
 * pot taken and game over show placeholders.
 */
export function shownRoll(
  state: GameState,
  beat: Beat<LoggedEvent> | null,
): ShownRoll | null {
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
    return null;
  }
  if (
    beat?.seat == null ||
    !["turnEnded", "tieBreakRolled", "rollOffRolled"].includes(beat.kind)
  ) {
    return null;
  }
  const finished = select.seatHand(state, beat.seat);
  if (finished?.kind === "hand") {
    return {
      kind: "hand",
      seat: beat.seat,
      dice: finished.dice,
      hand: finished.hand,
      kept: null,
    };
  }
  return finished?.kind === "die"
    ? { kind: "die", seat: beat.seat, face: finished.face }
    : null;
}

export function sliceSession(session: GameSession): BoardSlices {
  const { view, allowed } = session;
  const { state, events, viewerSeat, pending } = view;
  const { phase, round } = state;

  const acting = select.actingSeat(state);
  const worst = select.worstHandSoFar(state);
  const stillToRoll = select.stillToRoll(state);
  const shown = shownRoll(state, select.lastBeat(events));
  // The pot beat that ends the game: no Next round, Play again comes next.
  const primary = select.limitReached(state) ? ENDING : PRIMARY[phase.kind];

  return {
    header: headerOf(state, events, viewerSeat),
    tray: {
      shown,
      // Only the acting seat mid-turn has keep flags; any other roll is past.
      held: shown !== null && (shown.kind === "die" || shown.kept === null),
      comparison:
        acting === null ? null : select.standingAgainstWorst(state, acting),
      ownDice: shown?.seat === viewerSeat,
      rolls: rollsOf(state, shown !== null && acting === null),
      winners: phase.kind === "gameOver" ? phase.winners : null,
    },
    roundRows: state.points.map((_points, seat) => {
      const hand = select.seatHand(state, seat);
      return {
        seat,
        starting: round?.startingSeat === seat,
        current: acting === seat,
        waiting: stillToRoll.includes(seat),
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
    status: latestStatus(events, state, viewerSeat),
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

/**
 * The seat the heading names: the acting seat, or, between beats when
 * nobody is acting, the player the last beat was about. It never names the
 * next player before their handover beat, which sets `acting`.
 */
function headingSeat(state: GameState, events: SessionView["events"]): Seat {
  const { phase, acting } = state;
  if (acting !== null) return acting;
  // The player whose turn has just ended, or the starter as the round starts.
  if (phase.kind === "turn") return phase.seat;
  const subject = select.lastBeat(events, (beat) => beat.seat === null)?.seat;
  if (subject !== undefined && subject !== null) return subject;
  // Not reachable after gameStarted: its beat sets `acting`.
  if (phase.kind === "tieBreak") return phase.order[0];
  return phase.kind === "rollOff" ? phase.seats[0] : 0;
}

function headerOf(
  state: GameState,
  events: SessionView["events"],
  viewerSeat: Seat,
): HeaderData {
  const { phase, round } = state;
  switch (phase.kind) {
    case "notStarted":
      return { stage: "notStarted" };
    case "rollOff": {
      const seat = headingSeat(state, events);
      return {
        stage: "rollOff",
        seat,
        viewer: seat === viewerSeat,
        rolling: state.acting !== null,
      };
    }
    case "turn":
    case "tieBreak": {
      const seat = headingSeat(state, events);
      if (!round) throw new Error(`A ${phase.kind} with no round`);
      const tieBreak = select.tieBreakNumber(state);
      return {
        stage: "round",
        number: round.number,
        tieBreak,
        seat,
        viewer: seat === viewerSeat,
        rolling: state.acting !== null,
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
 * limit. The roll to start and a tie-break are one roll each: used once the
 * roll on show is a finished one.
 */
function rollsOf(
  state: GameState,
  finishedOnShow: boolean,
): RollsRowData | null {
  const { phase } = state;
  switch (phase.kind) {
    case "rollOff":
    case "tieBreak":
      return { available: 1, used: finishedOnShow ? 1 : 0 };
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
