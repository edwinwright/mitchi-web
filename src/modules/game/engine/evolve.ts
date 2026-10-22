import type { GameEvent } from "./events";
import { clockwiseFrom } from "./order";
import type { GameState, Phase, RoundState } from "./types";

/**
 * State is the fold of events: `events.reduce(applyEvent, state)`. Pure,
 * never mutates its arguments, returns plain JSON (ENG-3). It reads only
 * what the state needs, never an event's `reason`, `kept`, `previous` or
 * `potTaken.tieBreaks`. It throws "Corrupt log: …" on an out-of-sequence
 * event: a bad event sequence is a corrupt state, not player input.
 */
export function applyEvent(state: GameState, event: GameEvent): GameState {
  const { phase, round, acting } = state;
  const corrupt = () =>
    new Error(`Corrupt log: ${event.type} in ${phase.kind}, acting ${acting}`);
  const check = (ok: boolean) => {
    if (!ok) throw corrupt();
  };

  switch (event.type) {
    case "gameStarted":
      check(phase.kind === "notStarted" || phase.kind === "gameOver");
      return {
        config: { seats: event.seats, pointLimit: event.pointLimit },
        points: Array.from({ length: event.seats }, () => 0),
        round: null,
        phase: { kind: "notStarted" },
        acting: null,
      };

    case "rollOffStarted":
      check(
        acting === null &&
          (phase.kind === "notStarted" ||
            (phase.kind === "rollOff" &&
              phase.rolled.length === phase.seats.length)),
      );
      return {
        ...state,
        phase: { kind: "rollOff", seats: event.seats, rolled: [] },
        acting: null,
      };

    case "rollOffRolled": {
      if (phase.kind !== "rollOff") throw corrupt();
      check(acting === event.seat);
      const rolled = [...phase.rolled, { seat: event.seat, die: event.die }];
      return { ...state, phase: { ...phase, rolled }, acting: null };
    }

    case "roundStarted": {
      if (event.round === 1) {
        check(
          phase.kind === "rollOff" &&
            phase.rolled.length === phase.seats.length &&
            round === null,
        );
      } else {
        check(
          phase.kind === "roundSummary" &&
            round?.number === event.round - 1 &&
            event.startingSeat === phase.taker,
        );
      }
      const fresh: RoundState = {
        number: event.round,
        startingSeat: event.startingSeat,
        order: clockwiseFrom(state.config.seats, event.startingSeat),
        rollLimit: null,
        finished: [],
        pot: 1,
        tieBreaks: 0,
        lastRoller: null,
        lastDirection: "clockwise",
      };
      return {
        ...state,
        round: fresh,
        phase: freshTurn(event.startingSeat),
        acting: null,
      };
    }

    case "turnStarted":
      check(acting === null);
      if (event.context === "round") {
        check(
          phase.kind === "turn" &&
            round !== null &&
            event.seat === round.order[round.finished.length],
        );
        return { ...state, phase: freshTurn(event.seat), acting: event.seat };
      }
      if (event.context === "rollOff") {
        // The pass rolls in seat order: the next seat is the first not yet rolled.
        check(
          phase.kind === "rollOff" &&
            event.seat === phase.seats[phase.rolled.length],
        );
        return { ...state, acting: event.seat };
      }
      check(
        phase.kind === "tieBreak" &&
          event.seat === phase.order[phase.rolled.length],
      );
      return { ...state, acting: event.seat };

    case "rolled":
      if (phase.kind !== "turn" || !round) throw corrupt();
      check(
        acting === event.seat &&
          phase.seat === event.seat &&
          event.rollNumber === phase.rollsUsed + 1,
      );
      return {
        ...state,
        round: { ...round, lastRoller: event.seat },
        phase: { ...phase, rollsUsed: event.rollNumber, dice: event.dice },
      };

    case "keepSet": {
      if (phase.kind !== "turn") throw corrupt();
      check(acting === event.seat && phase.dice !== null);
      const kept =
        event.die === 0
          ? ([event.kept, phase.kept[1]] as const)
          : ([phase.kept[0], event.kept] as const);
      return { ...state, phase: { ...phase, kept } };
    }

    case "turnEnded": {
      if (phase.kind !== "turn" || !round) throw corrupt();
      check(acting === event.seat && phase.dice !== null);
      const { seat, dice, hand, rollsUsed } = event;
      // The phase still holds the finished seat's dice until the next turnStarted.
      return {
        ...state,
        round: {
          ...round,
          finished: [...round.finished, { seat, dice, hand, rollsUsed }],
        },
        acting: null,
      };
    }

    case "rollLimitSet":
      if (!round) throw corrupt();
      return { ...state, round: { ...round, rollLimit: event.limit } };

    case "potChanged":
      if (!round) throw corrupt();
      return { ...state, round: { ...round, pot: event.pot } };

    // Derived by select.worstHandSoFar; the event is a notice for consumers.
    case "worstHandChanged":
      return state;

    case "tieBreakStarted":
      if (!round) throw corrupt();
      check(acting === null && contestDone(phase, round));
      return {
        ...state,
        round: {
          ...round,
          tieBreaks: event.number,
          lastDirection: event.direction,
        },
        phase: {
          kind: "tieBreak",
          direction: event.direction,
          tiedOn: event.tiedOn,
          order: event.seats,
          rolled: [],
        },
        acting: null,
      };

    case "tieBreakRolled": {
      if (phase.kind !== "tieBreak" || !round) throw corrupt();
      check(acting === event.seat);
      const { seat, dice, hand } = event;
      return {
        ...state,
        round: { ...round, lastRoller: seat },
        phase: { ...phase, rolled: [...phase.rolled, { seat, dice, hand }] },
        acting: null,
      };
    }

    case "potTaken":
      if (!round) throw corrupt();
      check(acting === null && contestDone(phase, round));
      return {
        ...state,
        points: state.points.map((p, seat) =>
          seat === event.seat ? event.points : p,
        ),
        phase: {
          kind: "roundSummary",
          taker: event.seat,
          takerHand: event.hand,
        },
        acting: null,
      };

    case "gameEnded":
      check(phase.kind === "roundSummary");
      return {
        ...state,
        points: event.points,
        phase: { kind: "gameOver", winners: event.winners },
        acting: null,
      };

    default: {
      const unknown: never = event;
      throw new Error(`Corrupt log: unknown event ${JSON.stringify(unknown)}`);
    }
  }
}

function freshTurn(seat: number): Phase {
  return { kind: "turn", seat, rollsUsed: 0, dice: null, kept: [false, false] };
}

/** Every seat has finished the round, or rolled in the tie-break. */
function contestDone(phase: Phase, round: RoundState): boolean {
  if (phase.kind === "turn")
    return round.finished.length === round.order.length;
  if (phase.kind === "tieBreak") {
    return phase.rolled.length === phase.order.length;
  }
  return false;
}
