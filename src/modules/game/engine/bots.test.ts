import { describe, expect, it } from "vitest";
import type { HandId } from "@/data/hands";
import { simulateGame } from "../testing";
import { botStep, STARTER_STOPS_AT } from "./bots";
import type {
  DicePair,
  FinishedHand,
  GameState,
  KeptPair,
  Phase,
  Seat,
} from "./types";

const CONFIG = { seats: 4, pointLimit: 5 };
const NONE: KeptPair = [false, false];

function state(
  phase: Phase,
  round: { startingSeat?: number; finished?: FinishedHand[] } | null = {},
): GameState {
  return {
    config: CONFIG,
    points: [0, 0, 0, 0],
    round: round && {
      number: 1,
      startingSeat: round.startingSeat ?? 0,
      order: [0, 1, 2, 3],
      rollLimit: round.startingSeat === undefined ? null : 3,
      finished: round.finished ?? [],
      pot: 1,
      tieBreaks: 0,
      lastRoller: null,
      lastDirection: "clockwise",
    },
    phase,
    acting: actingIn(phase),
  };
}

/** The acting seat an authoritative state has in this phase. */
function actingIn(phase: Phase): Seat | null {
  if (phase.kind === "rollOff") return phase.seats[phase.rolled.length] ?? null;
  if (phase.kind === "turn") return phase.seat;
  if (phase.kind === "tieBreak")
    return phase.order[phase.rolled.length] ?? null;
  return null;
}

/** The starter (seat 0) holding `dice` after `rollsUsed` rolls. */
function starter(dice: DicePair | null, kept: KeptPair = NONE) {
  return state({
    kind: "turn",
    seat: 0,
    rollsUsed: dice ? 1 : 0,
    dice,
    kept,
  });
}

/** Seat 2 holding `dice`, with seat 0 already finished on `worst`. */
function follower(
  dice: DicePair,
  worst: { dice: DicePair; hand: HandId },
  kept: KeptPair = NONE,
) {
  return state(
    { kind: "turn", seat: 2, rollsUsed: 1, dice, kept },
    { startingSeat: 0, finished: [{ seat: 0, ...worst, rollsUsed: 1 }] },
  );
}

const WORST_5_1 = { dice: [5, 1], hand: "5-1" } as const;
const STOP = (seat: Seat) => ({ type: "stop", seat });
const KEEP = (seat: Seat, die: 0 | 1, kept: boolean) => ({
  type: "keep",
  seat,
  die,
  kept,
});
const ROLL = (seat: Seat) => ({ type: "roll", seat });

describe("botStep: when to roll", () => {
  it("rolls in the roll-off and in a tie-break, with no reason", () => {
    const rollOff = state(
      { kind: "rollOff", seats: [0, 1, 2, 3], rolled: [{ seat: 0, die: 4 }] },
      null,
    );
    expect(botStep(rollOff, 1)).toStrictEqual({
      request: ROLL(1),
      reason: null,
    });
    const tieBreak = state({
      kind: "tieBreak",
      direction: "anticlockwise",
      tiedOn: "3-1",
      order: [2, 1],
      rolled: [],
    });
    expect(botStep(tieBreak, 2)).toStrictEqual({
      request: ROLL(2),
      reason: null,
    });
  });

  it("rolls at the start of a turn, with no reason", () => {
    expect(botStep(starter(null), 0)).toStrictEqual({
      request: ROLL(0),
      reason: null,
    });
  });

  it("botStep is null when not the seat's move", () => {
    expect(botStep(starter(null), 1)).toBeNull();
    const rollOff = state(
      {
        kind: "rollOff",
        seats: [0, 1, 2, 3],
        rolled: [
          { seat: 0, die: 2 },
          { seat: 1, die: 4 },
        ],
      },
      null,
    );
    // Seat 1 has rolled; seat 3 waits for seat 2.
    expect(botStep(rollOff, 1)).toBeNull();
    expect(botStep(rollOff, 3)).toBeNull();
    expect(botStep(createGameLike("notStarted"), 0)).toBeNull();
    expect(
      botStep(
        state({
          kind: "roundSummary",
          taker: 1,
          takerHand: "3-1",
          tieBreak: null,
        }),
        1,
      ),
    ).toBeNull();
    expect(
      botStep(state({ kind: "gameOver", winners: [0], tieBreak: null }), 0),
    ).toBeNull();
  });

  it("botStep is deterministic", () => {
    const s = follower([5, 2], WORST_5_1);
    expect(botStep(s, 2)).toStrictEqual(botStep(s, 2));
  });
});

function createGameLike(kind: "notStarted") {
  return state({ kind }, null);
}

describe("botStep: the starter", () => {
  it("starter stops at six-three and better", () => {
    expect(STARTER_STOPS_AT).toBe("6-3");
    for (const dice of [
      [6, 3],
      [3, 6],
      [6, 4],
      [5, 6],
      [6, 6],
      [4, 4],
      [2, 1],
    ] as const) {
      expect(botStep(starter(dice), 0)).toStrictEqual({
        request: STOP(0),
        reason: "goodEnough",
      });
    }
  });

  it("starter rolls on six-two", () => {
    // 6-2 is the worst hand the starter does not stop on. It keeps the 6 first.
    expect(botStep(starter([6, 2]), 0)).toStrictEqual({
      request: KEEP(0, 0, true),
      reason: null,
    });
    expect(botStep(starter([6, 2], [true, false]), 0)).toStrictEqual({
      request: ROLL(0),
      reason: "keepingHighDie",
    });
  });
});

describe("botStep: a non-starter", () => {
  it("non-starter stops on a strict beat", () => {
    expect(botStep(follower([3, 3], WORST_5_1), 2)).toStrictEqual({
      request: STOP(2),
      reason: "beatsWorstHandSoFar",
    });
  });

  it("non-starter rolls on a tie", () => {
    const step = botStep(follower([1, 5], WORST_5_1), 2);
    expect(step?.request.type).not.toBe("stop");
    expect(
      botStep(follower([1, 5], WORST_5_1, [false, true]), 2),
    ).toStrictEqual({
      request: ROLL(2),
      reason: "keepingHighDie",
    });
  });

  it("non-starter rolls when worse than the worst so far", () => {
    expect(botStep(follower([4, 3], WORST_5_1), 2)).toStrictEqual({
      request: ROLL(2),
      reason: "rerollingBoth",
    });
  });
});

describe("botStep: keeping", () => {
  // Nothing beats a Mitchi, so a follower facing one always carries on.
  const worst = { dice: [2, 1], hand: "2-1" } as const;
  const step = (dice: DicePair, kept: KeptPair = NONE) =>
    botStep(follower(dice, worst, kept), 2);

  it("keep rule at 5 and 6 and not at 4", () => {
    expect(step([5, 2])).toStrictEqual({
      request: KEEP(2, 0, true),
      reason: null,
    });
    expect(step([1, 6])).toStrictEqual({
      request: KEEP(2, 1, true),
      reason: null,
    });
    expect(step([2, 5])).toStrictEqual({
      request: KEEP(2, 1, true),
      reason: null,
    });
    expect(step([5, 2], [true, false])).toStrictEqual({
      request: ROLL(2),
      reason: "keepingHighDie",
    });
    expect(step([4, 3])).toStrictEqual({
      request: ROLL(2),
      reason: "rerollingBoth",
    });
    expect(step([4, 1])).toStrictEqual({
      request: ROLL(2),
      reason: "rerollingBoth",
    });
  });

  it("equal dice keep slot 0", () => {
    expect(step([5, 5])).toStrictEqual({
      request: KEEP(2, 0, true),
      reason: null,
    });
    // The slot already kept stays the target.
    expect(step([5, 5], [true, false])).toStrictEqual({
      request: ROLL(2),
      reason: "keepingHighDie",
    });
    expect(step([5, 5], [false, true])).toStrictEqual({
      request: ROLL(2),
      reason: "keepingHighDie",
    });
  });

  it("equal dice below five keep nothing", () => {
    expect(step([4, 4])).toStrictEqual({
      request: ROLL(2),
      reason: "rerollingBoth",
    });
  });

  it("keep then roll two-call sequence carries keepingHighDie", () => {
    expect(step([5, 2])).toStrictEqual({
      request: KEEP(2, 0, true),
      reason: null,
    });
    expect(step([5, 2], [true, false])).toStrictEqual({
      request: ROLL(2),
      reason: "keepingHighDie",
    });
  });

  it("kept die carries over", () => {
    // A 6 kept, the other die re-rolled to a 2: the 6 is still the target.
    expect(step([6, 2], [true, false])).toStrictEqual({
      request: ROLL(2),
      reason: "keepingHighDie",
    });
  });

  it("keep moves to the higher die", () => {
    // A 5 kept in slot 0, then the other die rolled a 6: un-keep slot 0, then keep slot 1.
    expect(step([5, 6], [true, false])).toStrictEqual({
      request: KEEP(2, 0, false),
      reason: null,
    });
    expect(step([5, 6], NONE)).toStrictEqual({
      request: KEEP(2, 1, true),
      reason: null,
    });
  });

  it("clears a stale keep when nothing is worth keeping", () => {
    expect(step([4, 3], [true, false])).toStrictEqual({
      request: KEEP(2, 0, false),
      reason: null,
    });
  });
});

describe("keep swap", () => {
  it("an un-keep is always followed by a keep of the other die (300 seeds)", () => {
    let swaps = 0;
    for (let seed = 1; seed <= 300; seed++) {
      let unkept: { seat: number; die: 0 | 1 } | null = null;
      simulateGame(seed, {
        onStep: ({ action, result }) => {
          if (unkept) {
            // The action straight after an un-keep is the matching keep.
            expect(action, `seed ${seed}`).toStrictEqual({
              type: "keep",
              seat: unkept.seat,
              die: unkept.die === 0 ? 1 : 0,
              kept: true,
            });
            unkept = null;
          }
          if (action.type !== "keep" || action.kept || !result.ok) return;
          swaps += 1;
          unkept = { seat: action.seat, die: action.die };
          expect(
            botStep(result.state, action.seat),
            `seed ${seed}`,
          ).toStrictEqual({
            request: {
              type: "keep",
              seat: action.seat,
              die: action.die === 0 ? 1 : 0,
              kept: true,
            },
            reason: null,
          });
        },
      });
      expect(unkept, `seed ${seed} ended mid-swap`).toBeNull();
    }
    expect(swaps).toBeGreaterThan(0);
  });
});
