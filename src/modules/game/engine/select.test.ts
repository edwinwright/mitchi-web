import { describe, expect, it } from "vitest";
import * as fixtures from "../testing";
import { applyAction, createGame } from "./apply";
import { completeAction } from "./dice";
import { applyEvent } from "./evolve";
import * as select from "./select";
import type { DicePair, GameState, Phase, RoundState, Seat } from "./types";

const CONFIG = { seats: 4, pointLimit: 5 };

const ROUND: RoundState = {
  number: 1,
  startingSeat: 0,
  order: [0, 1, 2, 3],
  rollLimit: null,
  finished: [],
  pot: 1,
  tieBreaks: 0,
  lastRoller: null,
  lastDirection: "clockwise",
};

function state(
  phase: Phase,
  round: Partial<RoundState> | null = {},
  points = [0, 0, 0, 0],
): GameState {
  return {
    config: CONFIG,
    points,
    round: round && { ...ROUND, ...round },
    phase,
    acting: actingIn(phase),
  };
}

/** The acting seat an authoritative state has in this phase (null in the roll-off). */
function actingIn(phase: Phase): Seat | null {
  if (phase.kind === "turn") return phase.seat;
  if (phase.kind === "tieBreak")
    return phase.order[phase.rolled.length] ?? null;
  return null;
}

function turn(
  seat: number,
  rollsUsed: number,
  dice: DicePair | null,
  kept: readonly [boolean, boolean] = [false, false],
  round: Partial<RoundState> = {},
) {
  return state({ kind: "turn", seat, rollsUsed, dice, kept }, round);
}

const NOT_STARTED = createGame(CONFIG);
const ROLL_OFF = state(
  {
    kind: "rollOff",
    seats: [0, 1, 2, 3],
    rolled: [
      { seat: 1, die: 4 },
      { seat: 3, die: 2 },
    ],
  },
  null,
);
const TIE_BREAK = state({
  kind: "tieBreak",
  direction: "anticlockwise",
  tiedOn: "3-1",
  order: [3, 1, 0],
  rolled: [{ seat: 3, dice: [4, 2], hand: "4-2" }],
});
const SUMMARY = state({ kind: "roundSummary", taker: 2, takerHand: "3-1" });
const GAME_OVER = state({ kind: "gameOver", winners: [1] });

const FINISHED = [
  { seat: 0, dice: [6, 3], hand: "6-3", rollsUsed: 2 },
  { seat: 1, dice: [3, 1], hand: "3-1", rollsUsed: 1 },
  { seat: 2, dice: [1, 3], hand: "3-1", rollsUsed: 3 },
] as const;

describe("actingSeat", () => {
  it("is null outside a turn or tie-break, and the roller inside one", () => {
    expect(select.actingSeat(NOT_STARTED)).toBeNull();
    expect(select.actingSeat(ROLL_OFF)).toBeNull();
    expect(select.actingSeat(turn(2, 0, null))).toBe(2);
    expect(select.actingSeat(TIE_BREAK)).toBe(1);
    expect(select.actingSeat(SUMMARY)).toBeNull();
    expect(select.actingSeat(GAME_OVER)).toBeNull();
  });
});

describe("toRoll", () => {
  it("lists the roll-off seats still to roll, ascending", () => {
    expect(select.toRoll(ROLL_OFF)).toStrictEqual([0, 2]);
  });

  it("is the acting seat in a turn and a tie-break, else empty", () => {
    expect(select.toRoll(turn(2, 0, null))).toStrictEqual([2]);
    expect(select.toRoll(TIE_BREAK)).toStrictEqual([1]);
    expect(select.toRoll(NOT_STARTED)).toStrictEqual([]);
    expect(select.toRoll(SUMMARY)).toStrictEqual([]);
    expect(select.toRoll(GAME_OVER)).toStrictEqual([]);
  });
});

describe("diceToRoll", () => {
  it("matches the phase table", () => {
    expect(select.diceToRoll(NOT_STARTED)).toBe(0);
    expect(select.diceToRoll(ROLL_OFF)).toBe(1);
    expect(select.diceToRoll(turn(0, 0, null))).toBe(2);
    expect(select.diceToRoll(turn(0, 1, [3, 4]))).toBe(2);
    expect(select.diceToRoll(turn(0, 1, [3, 4], [false, true]))).toBe(1);
    expect(select.diceToRoll(turn(0, 1, [3, 4], [true, true]))).toBe(0);
    expect(select.diceToRoll(TIE_BREAK)).toBe(2);
    expect(select.diceToRoll(SUMMARY)).toBe(0);
    expect(select.diceToRoll(GAME_OVER)).toBe(0);
  });
});

describe("rollsLeft", () => {
  it("rollsLeft counts down from three for the starter", () => {
    expect(select.rollsLeft(turn(0, 0, null))).toBe(3);
    expect(select.rollsLeft(turn(0, 1, [3, 4]))).toBe(2);
    expect(select.rollsLeft(turn(0, 2, [3, 4]))).toBe(1);
  });

  it("counts down from the roll limit for everyone else", () => {
    expect(
      select.rollsLeft(turn(1, 0, null, undefined, { rollLimit: 2 })),
    ).toBe(2);
    expect(
      select.rollsLeft(turn(1, 1, [3, 4], undefined, { rollLimit: 2 })),
    ).toBe(1);
  });

  it("is null outside a main-round turn", () => {
    expect(select.rollsLeft(ROLL_OFF)).toBeNull();
    expect(select.rollsLeft(TIE_BREAK)).toBeNull();
    expect(select.rollsLeft(SUMMARY)).toBeNull();
  });
});

describe("rollLimit", () => {
  it("is unset until the starter's turn ends", () => {
    expect(select.rollLimit(NOT_STARTED)).toStrictEqual({ set: null, max: 3 });
    expect(select.rollLimit(turn(0, 0, null))).toStrictEqual({
      set: null,
      max: 3,
    });
    expect(
      select.rollLimit(turn(1, 0, null, undefined, { rollLimit: 2 })),
    ).toStrictEqual({
      set: 2,
      max: 3,
    });
  });
});

describe("worstHandSoFar", () => {
  it("worstHandSoFar per phase", () => {
    expect(select.worstHandSoFar(NOT_STARTED)).toBeNull();
    expect(select.worstHandSoFar(ROLL_OFF)).toBeNull();
    // Turn: null for the starter, the worst finished hand otherwise.
    expect(select.worstHandSoFar(turn(0, 0, null))).toBeNull();
    expect(
      select.worstHandSoFar(
        turn(1, 0, null, undefined, { finished: [FINISHED[0]] }),
      ),
    ).toStrictEqual({ hand: "6-3", seats: [0] });
    // Equal worst hands share it, in finishing order.
    expect(
      select.worstHandSoFar(
        turn(3, 0, null, undefined, { finished: [...FINISHED] }),
      ),
    ).toStrictEqual({ hand: "3-1", seats: [1, 2] });
    // Tie-break: the tie-break's own rolls, null before the first.
    expect(select.worstHandSoFar(TIE_BREAK)).toStrictEqual({
      hand: "4-2",
      seats: [3],
    });
    expect(
      select.worstHandSoFar(
        state({
          ...(TIE_BREAK.phase as Extract<Phase, { kind: "tieBreak" }>),
          rolled: [],
        }),
      ),
    ).toBeNull();
    expect(select.worstHandSoFar(SUMMARY)).toStrictEqual({
      hand: "3-1",
      seats: [2],
    });
    expect(select.worstHandSoFar(GAME_OVER)).toBeNull();
  });
});

describe("standingAgainstWorst", () => {
  const finished = { finished: [FINISHED[0]] };
  it("standingAgainstWorst compares the acting seat's hand with the worst", () => {
    expect(
      select.standingAgainstWorst(turn(1, 1, [6, 4], undefined, finished), 1),
    ).toBe("beats");
    expect(
      select.standingAgainstWorst(turn(1, 1, [3, 6], undefined, finished), 1),
    ).toBe("ties");
    expect(
      select.standingAgainstWorst(turn(1, 1, [4, 2], undefined, finished), 1),
    ).toBe("worse");
  });

  it("standingAgainstWorst is null for the starter, before rolling, in a tie-break and for another seat", () => {
    expect(select.standingAgainstWorst(turn(0, 1, [6, 4]), 0)).toBeNull();
    expect(
      select.standingAgainstWorst(turn(1, 0, null, undefined, finished), 1),
    ).toBeNull();
    expect(
      select.standingAgainstWorst(turn(1, 1, [6, 4], undefined, finished), 2),
    ).toBeNull();
    expect(select.standingAgainstWorst(TIE_BREAK, 1)).toBeNull();
    expect(select.standingAgainstWorst(ROLL_OFF, 0)).toBeNull();
  });
});

describe("nearestLimit", () => {
  it("nearestLimit is null while nobody has points", () => {
    expect(select.nearestLimit(NOT_STARTED)).toBeNull();
  });

  it("nearestLimit lists every seat on the highest score", () => {
    expect(
      select.nearestLimit({ ...NOT_STARTED, points: [1, 3, 0, 2] }),
    ).toStrictEqual({
      seats: [1],
      points: 3,
    });
    expect(
      select.nearestLimit({ ...NOT_STARTED, points: [3, 3, 0, 2] }),
    ).toStrictEqual({
      seats: [0, 1],
      points: 3,
    });
  });
});

describe("allowedIntents", () => {
  const none = {
    roll: false,
    setKeep: false,
    stop: false,
    nextRound: false,
    newGame: false,
  };

  it("allowedIntents: notStarted, roll-off and gameOver", () => {
    expect(select.allowedIntents(NOT_STARTED, 0)).toStrictEqual({
      ...none,
      newGame: true,
    });
    expect(select.allowedIntents(ROLL_OFF, 0)).toStrictEqual({
      ...none,
      roll: true,
    });
    expect(select.allowedIntents(ROLL_OFF, 1)).toStrictEqual(none);
    expect(select.allowedIntents(GAME_OVER, 0)).toStrictEqual({
      ...none,
      newGame: true,
    });
  });

  it("allowedIntents: turn with no dice", () => {
    expect(select.allowedIntents(turn(0, 0, null), 0)).toStrictEqual({
      ...none,
      roll: true,
    });
  });

  it("allowedIntents: turn with dice", () => {
    expect(select.allowedIntents(turn(0, 1, [3, 4]), 0)).toStrictEqual({
      ...none,
      roll: true,
      setKeep: true,
      stop: true,
    });
    expect(
      select.allowedIntents(turn(0, 1, [3, 4], [true, false]), 0).roll,
    ).toBe(true);
  });

  it("allowedIntents: both kept", () => {
    expect(
      select.allowedIntents(turn(0, 1, [3, 4], [true, true]), 0),
    ).toStrictEqual({
      ...none,
      setKeep: true,
      stop: true,
    });
  });

  it("allowedIntents: other seat acting", () => {
    expect(select.allowedIntents(turn(1, 1, [3, 4]), 0)).toStrictEqual(none);
  });

  it("allowedIntents: tie-break and round summary", () => {
    expect(select.allowedIntents(TIE_BREAK, 1)).toStrictEqual({
      ...none,
      roll: true,
    });
    expect(select.allowedIntents(TIE_BREAK, 3)).toStrictEqual(none);
    expect(select.allowedIntents(SUMMARY, 0)).toStrictEqual({
      ...none,
      nextRound: true,
    });
  });

  it("allowedIntents agrees with applyAction where this slice can apply it", () => {
    for (const s of [NOT_STARTED, ROLL_OFF, GAME_OVER]) {
      for (const seat of [0, 1, 2, 3]) {
        const allowed = select.allowedIntents(s, seat);
        const roll = applyAction(s, {
          type: "roll",
          seat,
          values: [3],
          reason: null,
        });
        expect(roll.ok).toBe(allowed.roll);
        expect(applyAction(s, { type: "newGame" }).ok).toBe(allowed.newGame);
      }
    }
  });
});

describe("kept", () => {
  it("is the acting seat's flags once it has dice, else null", () => {
    const s = turn(0, 1, [3, 4], [true, false]);
    expect(select.kept(s, 0)).toStrictEqual([true, false]);
    expect(select.kept(s, 1)).toBeNull();
    expect(select.kept(turn(0, 0, null), 0)).toBeNull();
    expect(select.kept(TIE_BREAK, 1)).toBeNull();
  });
});

describe("seatHand", () => {
  it("seatHand shows the roll-off die once a seat has rolled", () => {
    expect(select.seatHand(ROLL_OFF, 1)).toStrictEqual({
      kind: "die",
      face: 4,
    });
    expect(select.seatHand(ROLL_OFF, 0)).toBeNull();
  });

  it("seatHand shows the acting seat's hand as not final, with its keeps", () => {
    expect(select.seatHand(turn(1, 2, [3, 6], [false, true]), 1)).toStrictEqual(
      {
        kind: "hand",
        dice: [3, 6],
        hand: "6-3",
        rollsUsed: 2,
        final: false,
        kept: [false, true],
      },
    );
    expect(select.seatHand(turn(1, 0, null), 1)).toBeNull();
  });

  it("seatHand shows finished hands as final with their roll count", () => {
    const s = turn(3, 0, null, undefined, { finished: [...FINISHED] });
    expect(select.seatHand(s, 0)).toStrictEqual({
      kind: "hand",
      dice: [6, 3],
      hand: "6-3",
      rollsUsed: 2,
      final: true,
      kept: null,
    });
    expect(select.seatHand(s, 3)).toBeNull();
  });

  it("seatHand shows tie-break rolls with no roll count", () => {
    expect(select.seatHand(TIE_BREAK, 3)).toStrictEqual({
      kind: "hand",
      dice: [4, 2],
      hand: "4-2",
      rollsUsed: null,
      final: true,
      kept: null,
    });
    expect(select.seatHand(TIE_BREAK, 1)).toBeNull();
  });

  it("seatHand is null before the first game", () => {
    expect(select.seatHand(NOT_STARTED, 0)).toBeNull();
  });
});

describe("inContest", () => {
  it("inContest is false only for non-participants in a tie-break", () => {
    expect(select.inContest(TIE_BREAK, 3)).toBe(true);
    expect(select.inContest(TIE_BREAK, 2)).toBe(false);
    expect(select.inContest(turn(0, 0, null), 2)).toBe(true);
    expect(select.inContest(ROLL_OFF, 2)).toBe(true);
  });
});

describe("tieBreakNumber", () => {
  it("is the current tie-break's number, else null", () => {
    const s = state(TIE_BREAK.phase, { tieBreaks: 2 });
    expect(select.tieBreakNumber(s)).toBe(2);
    expect(select.tieBreakNumber(turn(0, 0, null))).toBeNull();
  });
});

describe("allowedIntents against the engine", () => {
  const SEATS = [0, 1, 2, 3];

  it("allowedIntents agrees with applyAction for every fixture", () => {
    const named = Object.entries(fixtures).filter(
      (entry): entry is [string, fixtures.Fixture] =>
        typeof entry[1] === "object" &&
        "events" in entry[1] &&
        "state" in entry[1],
    );
    expect(named.length).toBeGreaterThanOrEqual(17);

    for (const [name, { state }] of named) {
      for (const seat of SEATS) {
        const allowed = select.allowedIntents(state, seat);
        const accepted = {
          roll: applyAction(
            state,
            completeAction(state, { type: "roll", seat }, [3, 4]),
          ).ok,
          setKeep: applyAction(state, {
            type: "keep",
            seat,
            die: 0,
            kept: true,
          }).ok,
          stop: applyAction(state, { type: "stop", seat, reason: null }).ok,
          nextRound: applyAction(state, { type: "nextRound" }).ok,
          newGame: applyAction(state, { type: "newGame" }).ok,
        };
        expect({ name, seat, ...accepted }).toStrictEqual({
          name,
          seat,
          ...allowed,
        });
      }
    }
  });
});

describe("selectors on acting null mid-turn", () => {
  // The viewer stops on 5-2; only turnEnded is folded, so nobody is acting yet.
  const before = fixtures.viewerRolledKeepable.state;
  const result = applyAction(before, { type: "stop", seat: 0, reason: null });
  if (!result.ok) throw new Error("stop rejected");
  const [ended] = result.events;
  const between = applyEvent(before, ended);

  it("folds to a turn with nobody acting", () => {
    expect(ended.type).toBe("turnEnded");
    expect(between.phase.kind).toBe("turn");
    expect(between.acting).toBeNull();
    expect(select.actingSeat(between)).toBeNull();
    expect(select.toRoll(between)).toStrictEqual([]);
  });

  it("shows no in-progress turn", () => {
    expect(select.rollsLeft(between)).toBeNull();
    expect(select.kept(between, 0)).toBeNull();
    expect(select.standingAgainstWorst(between, 0)).toBeNull();
  });

  it("shows the finished seat's final hand", () => {
    expect(select.seatHand(between, 0)).toStrictEqual({
      kind: "hand",
      dice: [5, 2],
      hand: "5-2",
      rollsUsed: 1,
      final: true,
      kept: null,
    });
  });

  it("allows nothing for any seat", () => {
    for (const seat of [0, 1, 2, 3]) {
      expect(Object.values(select.allowedIntents(between, seat))).toStrictEqual(
        [false, false, false, false, false],
      );
    }
  });
});
