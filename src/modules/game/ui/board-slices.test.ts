import { describe, expect, it } from "vitest";
import { select, type Action, type Die } from "../engine";
import {
  batchActions,
  beatBotKeepSwap,
  beatBotRollToStart,
  beatFixtures,
  beatGameStart,
  beatLastHandOfRound,
  beatNoRollsLeft,
  beatRollOffTie,
  beatRollOffWinner,
  beatRoundTwoBotStarts,
  beatTieBreakOpens,
  beatTieBreakRolled,
  beatViewerRollToStart,
  beatViewerRolls,
  beatViewerStops,
  botKept,
  botMidTurn,
  closeToLimit,
  chainedTieBreakSummary,
  fixtureSession,
  gameOverAfterTieBreak,
  gameOverDraw,
  gameOverUnique,
  mitchiInRound,
  notStarted,
  rollOff,
  rollOffReroll,
  roundSummary,
  starterLimitSet,
  tieBreakRunning,
  tieBreakSummary,
  tieBreakViewerToRoll,
  viewerKeptOne,
  viewerRolledKeepable,
  viewerToRoll,
  simulateGame,
  type Fixture,
} from "../testing";
import { statusOf } from "./beat-status";
import { shownRoll, sliceSession, type RoundRowData } from "./board-slices";

const shown = (fixture: Fixture) =>
  shownRoll(fixture.state, select.lastBeat(fixture.events));
const slices = (fixture: Fixture) => sliceSession(fixtureSession(fixture));
const rollAction = (seat: number, ...values: Die[]): Action => ({
  type: "roll",
  seat,
  values,
  reason: null,
});

/** The viewer starts, rolls 5-2, keeps the 5 and rolls the other die. */
const KEPT_ROLL: Action[] = [
  { type: "newGame" },
  rollAction(0, 6),
  rollAction(1, 3),
  rollAction(2, 2),
  rollAction(3, 1),
  rollAction(0, 5, 2),
  { type: "keep", seat: 0, die: 0, kept: true },
  rollAction(0, 3),
];

/** Every beat of a seeded bot game, as the session releases them. */
function beatsOfGame(seed: number): readonly Fixture[] {
  const actions: Action[] = [];
  simulateGame(seed, {
    onStep: ({ action, result }) => {
      if (result.ok) actions.push(action);
    },
  });
  return beatFixtures(batchActions(actions));
}

/** Seats for which `field` is true, from a slice's rows. */
const seatsWhere = <Row extends { seat: number }>(
  rows: readonly Row[],
  field: keyof Row,
) => rows.filter((row) => row[field] === true).map((row) => row.seat);

describe("shownRoll", () => {
  it("shows the acting seat's dice with their keep flags once rolled this turn", () => {
    expect(shown(viewerRolledKeepable)).toMatchObject({
      kind: "hand",
      seat: 0,
      dice: [5, 2],
      kept: [false, false],
    });
    expect(shown(viewerKeptOne)).toMatchObject({
      seat: 0,
      kept: [true, false],
    });
  });

  it("shows a bot's dice as it rolls, including a kept die before its roll", () => {
    expect(shown(botMidTurn)).toMatchObject({
      seat: 1,
      dice: [4, 2],
      kept: [false, false],
    });
    expect(shown(botKept)).toMatchObject({ seat: 1, kept: [true, false] });
  });

  it("shows a finished roll, with no keep flags, on its own beat", () => {
    expect(shown(beatViewerStops)).toEqual({
      kind: "hand",
      seat: 0,
      dice: [6, 3],
      hand: "6-3",
      kept: null,
    });
    expect(shown(beatNoRollsLeft)).toMatchObject({ seat: 1, kept: null });
    expect(shown(beatTieBreakRolled)).toMatchObject({
      seat: 1,
      dice: [4, 3],
      kept: null,
    });
    expect(shown(beatLastHandOfRound)).toMatchObject({ seat: 3, kept: null });
  });

  it("shows the die rolled to start on its own beat", () => {
    expect(shown(beatViewerRollToStart)).toEqual({
      kind: "die",
      seat: 0,
      face: 4,
    });
    expect(shown(beatBotRollToStart)).toEqual({
      kind: "die",
      seat: 1,
      face: 3,
    });
  });

  it("null on the handover beat (starterLimitSet)", () => {
    expect(shown(starterLimitSet)).toBeNull();
    expect(shown(rollOff)).toBeNull();
    expect(shown(tieBreakViewerToRoll)).toBeNull();
  });

  it("null on a round start, a tie-break opening, the pot taken, game over and before start", () => {
    for (const fixture of [
      beatRollOffWinner,
      beatRoundTwoBotStarts,
      beatTieBreakOpens,
      roundSummary,
      gameOverUnique,
      notStarted,
    ]) {
      expect(shown(fixture)).toBeNull();
    }
  });
});

describe("sliceSession", () => {
  it("makes every control unavailable and busy while a roll is pending", () => {
    const { controls } = sliceSession(
      fixtureSession(viewerRolledKeepable, { pending: true }),
    );
    expect(controls).toEqual({
      roll: false,
      keep: false,
      stop: false,
      nextRound: false,
      newGame: false,
      busy: true,
      primary: { action: "roll", available: false },
    });
  });

  it("offers Roll, Keep and Stop on the viewer's turn", () => {
    const { controls } = sliceSession(fixtureSession(viewerRolledKeepable));
    expect(controls).toMatchObject({ roll: true, keep: true, stop: true });
  });

  it("offers a new game at game over", () => {
    expect(sliceSession(fixtureSession(gameOverDraw)).controls.newGame).toBe(
      true,
    );
  });
});

describe("roundBar", () => {
  it("is hidden before start and says how the roll to start works", () => {
    expect(slices(notStarted).roundBar).toBeNull();
    expect(slices(rollOff).roundBar).toEqual({ kind: "rollOff" });
  });

  it("names the round, or the tie-break and the hand tied on", () => {
    expect(slices(botMidTurn).roundBar).toEqual({
      kind: "round",
      number: 1,
      rollLimit: 2,
    });
    expect(slices(tieBreakRunning).roundBar).toEqual({
      kind: "tieBreak",
      number: 1,
      tiedOn: "3-1",
    });
  });

  it("names the round just played between rounds and at game over", () => {
    expect(slices(roundSummary).roundBar).toMatchObject({
      kind: "round",
      number: 1,
    });
    expect(slices(gameOverUnique).roundBar).toMatchObject({
      kind: "round",
      number: 7,
    });
  });

  it("shows the roll limit once the starter's turn ends, never in a tie-break", () => {
    expect(slices(viewerToRoll).roundBar).toEqual({
      kind: "round",
      number: 1,
      rollLimit: null,
    });
    expect(slices(starterLimitSet).roundBar).toEqual({
      kind: "round",
      number: 1,
      rollLimit: 2,
    });
    expect(slices(tieBreakRunning).roundBar).not.toHaveProperty("rollLimit");
  });
});

describe("the end of a round settled by a tie-break", () => {
  const handOf = (row: RoundRowData | undefined) =>
    row?.hand?.kind === "hand" ? row.hand.hand : null;

  it("keeps the deciding tie-break's bar", () => {
    expect(slices(tieBreakSummary).roundBar).toEqual({
      kind: "tieBreak",
      number: 1,
      tiedOn: "3-1",
    });
    expect(slices(chainedTieBreakSummary).roundBar).toEqual({
      kind: "tieBreak",
      number: 2,
      tiedOn: "4-3",
    });
    expect(slices(gameOverAfterTieBreak).roundBar).toEqual({
      kind: "tieBreak",
      number: 1,
      tiedOn: "3-1",
    });
  });

  it.each([
    ["one tie-break", tieBreakSummary],
    ["chained tie-breaks", chainedTieBreakSummary],
  ])("names the same worst hand in the header and the rows: %s", (_, f) => {
    const { header, roundRows } = slices(f);
    if (header.stage !== "summary") throw new Error("not a summary");
    const worst = roundRows.filter((row) => row.holdsWorst);
    expect(worst).toHaveLength(1);
    expect(handOf(worst[0])).toBe(header.worstHand);
  });

  it("shows tie-break hands for the tied seats and nothing for the rest", () => {
    const rows = (f: Fixture) =>
      slices(f).roundRows.map((row) => [row.inContest, handOf(row)]);
    expect(rows(tieBreakSummary)).toStrictEqual([
      [true, "6-5"],
      [true, "4-3"],
      [false, null],
      [false, null],
    ]);
    // Tie-break 1's 4-3s are not shown: only the final tie-break's hands.
    expect(rows(chainedTieBreakSummary)).toStrictEqual([
      [true, "5-2"],
      [true, "6-6"],
      [false, null],
      [false, null],
    ]);
    expect(rows(gameOverAfterTieBreak)).toStrictEqual([
      [false, null],
      [true, "6-5"],
      [false, null],
      [true, "3-2"],
    ]);
  });
});

describe("header", () => {
  it("has nothing but its stage before start and rolling to start", () => {
    expect(slices(notStarted).header).toEqual({ stage: "notStarted" });
    expect(slices(rollOff).header).toEqual({ stage: "rollOff" });
    expect(slices(rollOffReroll).header).toEqual({ stage: "rollOff" });
  });

  it("gives the round, the pot, the hand to beat and the rolls in a turn", () => {
    expect(slices(viewerToRoll).header).toEqual({
      stage: "round",
      number: 1,
      tieBreak: null,
      pot: 1,
      handToBeat: null,
      rolls: { available: 3, used: 0 },
    });
    expect(slices(botMidTurn).header).toMatchObject({ handToBeat: "6-3" });
    expect(slices(mitchiInRound).header).toMatchObject({ pot: 2 });
  });

  it("gives the round, the pot and the worst hand between rounds", () => {
    expect(slices(roundSummary).header).toEqual({
      stage: "summary",
      number: 1,
      pot: 1,
      worstHand: "3-2",
    });
  });

  it("has nothing but its stage at game over", () => {
    expect(slices(gameOverUnique).header).toEqual({ stage: "gameOver" });
    expect(slices(gameOverDraw).header).toEqual({ stage: "gameOver" });
  });

  it("names no seat when a tie-break opens or the roll to start ties", () => {
    // Seat 3 ended the round; seats 1 and 2 are in the tie-break.
    expect(slices(beatTieBreakOpens).header).toEqual({
      stage: "round",
      number: 1,
      tieBreak: 1,
      pot: 2,
      handToBeat: null,
      rolls: null,
    });
    expect(slices(beatRollOffTie).header).toEqual({ stage: "rollOff" });
  });
});

describe("rolls left", () => {
  it("gives the starter three boxes until the limit is set", () => {
    expect(slices(viewerToRoll).header).toMatchObject({
      rolls: { available: 3, used: 0 },
    });
    expect(slices(viewerRolledKeepable).header).toMatchObject({
      rolls: { available: 3, used: 1 },
    });
  });

  it("gives everyone else the limit once the starter has set it", () => {
    expect(slices(starterLimitSet).header).toMatchObject({
      rolls: { available: 2, used: 0 },
    });
    expect(slices(botMidTurn).header).toMatchObject({
      rolls: { available: 2, used: 1 },
    });
  });

  it("has none outside a main-round turn", () => {
    for (const fixture of [
      notStarted,
      rollOff,
      beatViewerRollToStart,
      tieBreakRunning,
      beatTieBreakRolled,
      roundSummary,
      gameOverUnique,
    ]) {
      const { header } = slices(fixture);
      expect(header.stage === "round" ? header.rolls : null).toBeNull();
    }
  });
});

describe("tie-break", () => {
  it("has no rolls left, no comparison, and no hand to beat before the first tie-break roll", () => {
    // The main round's limit is 1 and its worst hand 3-1; neither carries in.
    const running = slices(tieBreakRunning);
    expect(running.header).toEqual({
      stage: "round",
      number: 1,
      tieBreak: 1,
      pot: 2,
      handToBeat: null,
      rolls: null,
    });
    expect(running.tray.comparison).toBeNull();
  });

  it("takes the hand to beat from tie-break rolls only", () => {
    const viewerNext = slices(tieBreakViewerToRoll);
    expect(viewerNext.header).toMatchObject({
      tieBreak: 1,
      handToBeat: "4-3",
      rolls: null,
    });
    expect(viewerNext.tray.comparison).toBeNull();
  });
});

describe("tray", () => {
  it("compares the acting seat's dice once someone has finished", () => {
    // Seat 1's 4-2 against the viewer's 6-3.
    expect(slices(botMidTurn).tray).toMatchObject({
      comparison: "worse",
      ownDice: false,
    });
    // Nobody has finished yet.
    expect(slices(viewerRolledKeepable).tray).toMatchObject({
      comparison: null,
      ownDice: true,
    });
  });

  it("has no comparison between rounds", () => {
    expect(slices(roundSummary).tray.comparison).toBeNull();
  });

  it("marks a finished roll on its own beat as held, never the acting seat's own", () => {
    const held = (fixture: Fixture) => slices(fixture).tray.held;
    for (const fixture of [
      beatViewerStops,
      beatNoRollsLeft,
      beatTieBreakRolled,
      beatViewerRollToStart,
    ]) {
      expect(held(fixture)).toBe(true);
    }
    expect(held(botMidTurn)).toBe(false);
    expect(held(viewerRolledKeepable)).toBe(false);
    // Nothing on show, nothing held.
    expect(held(tieBreakViewerToRoll)).toBe(false);
  });

  it("has no comparison when nobody is acting", () => {
    expect(slices(beatViewerStops).tray.comparison).toBeNull();
    expect(slices(beatNoRollsLeft).tray.comparison).toBeNull();
  });

  it("has the winners at game over only", () => {
    expect(slices(gameOverDraw).tray.winners).toEqual([0, 2]);
    expect(slices(roundSummary).tray.winners).toBeNull();
  });
});

describe("controls.primary", () => {
  it.each([
    ["notStarted", notStarted, "start", true],
    ["rollOff", rollOff, "roll", false],
    ["rollOffReroll", rollOffReroll, "roll", true],
    ["viewerToRoll", viewerToRoll, "roll", true],
    ["botMidTurn", botMidTurn, "roll", false],
    ["tieBreakRunning", tieBreakRunning, "roll", false],
    ["tieBreakViewerToRoll", tieBreakViewerToRoll, "roll", true],
    ["roundSummary", roundSummary, "nextRound", true],
    ["gameOverUnique", gameOverUnique, "playAgain", true],
  ] as const)("%s: %s, available %s", (_name, fixture, action, available) => {
    expect(slices(fixture).controls.primary).toEqual({ action, available });
  });

  it("the pot beat that ends the game offers no Next round", () => {
    // Every simulated game ends: its pot beat is followed by gameEnded.
    const potBeat = beatsOfGame(1).find((f) => select.limitReached(f.state));
    if (!potBeat) throw new Error("No pot beat ended the game");
    expect(slices(potBeat).controls.primary).toEqual({
      action: "roll",
      available: false,
    });
  });

  it("is unavailable while a roll is pending, whatever its label", () => {
    expect(
      sliceSession(fixtureSession(roundSummary, { pending: true })).controls
        .primary,
    ).toEqual({ action: "nextRound", available: false });
  });
});

describe("roundRows", () => {
  it("marks the starter, the seat rolling now and the worst hand so far", () => {
    const rows = slices(botMidTurn).roundRows;
    expect(seatsWhere(rows, "starting")).toEqual([0]);
    expect(seatsWhere(rows, "current")).toEqual([1]);
    expect(seatsWhere(rows, "holdsWorst")).toEqual([0]);
    expect(rows[0].hand).toMatchObject({ kind: "hand", hand: "6-3" });
  });

  it("current only for acting, waiting never for the acting seat", () => {
    const start = slices(beatGameStart).roundRows;
    expect(seatsWhere(start, "current")).toEqual([0]);
    expect(seatsWhere(start, "waiting")).toEqual([1, 2, 3]);
    // Between turns nobody is current.
    expect(seatsWhere(slices(beatViewerStops).roundRows, "current")).toEqual(
      [],
    );
    // A later round's start carries its starter's turn.
    expect(
      seatsWhere(slices(beatRoundTwoBotStarts).roundRows, "current"),
    ).toEqual([1]);
  });

  it("has the acting seat current in the roll-off, and the others still to roll waiting", () => {
    const rows = slices(rollOff).roundRows;
    expect(seatsWhere(rows, "current")).toEqual([1]);
    expect(seatsWhere(rows, "waiting")).toEqual([2, 3]);
  });

  it("has only the tied seats in a tie-break", () => {
    expect(
      slices(tieBreakRunning).roundRows.map((row) => row.inContest),
    ).toEqual([true, true, false, false]);
  });

  it("flags a mitchi by the hand's group", () => {
    expect(seatsWhere(slices(mitchiInRound).roundRows, "mitchi")).toEqual([0]);
    expect(seatsWhere(slices(roundSummary).roundRows, "mitchi")).toEqual([]);
  });
});

describe("fewest points", () => {
  it("is nobody while every seat is on 0", () => {
    expect(seatsWhere(slices(notStarted).points.rows, "fewest")).toEqual([]);
    expect(seatsWhere(slices(viewerToRoll).points.rows, "fewest")).toEqual([]);
  });

  it("is every seat tied on the fewest once anyone has points", () => {
    expect(seatsWhere(slices(roundSummary).points.rows, "fewest")).toEqual([
      0, 1, 2,
    ]);
  });

  it("is every winner at game over", () => {
    const draw = slices(gameOverDraw).points.rows;
    expect(seatsWhere(draw, "fewest")).toEqual([0, 2]);
    expect(seatsWhere(draw, "winner")).toEqual([0, 2]);
    const unique = slices(gameOverUnique).points.rows;
    expect(seatsWhere(unique, "fewest")).toEqual([0]);
    expect(seatsWhere(unique, "winner")).toEqual([0]);
  });
});

describe("point limit", () => {
  it("marks every seat within two points of the limit as close, during a game", () => {
    const { points } = slices(closeToLimit);
    expect(points.pointLimit).toBe(5);
    expect(points.gameOver).toBe(false);
    expect(points.rows.map((row) => row.points)).toEqual([0, 2, 0, 3]);
    expect(seatsWhere(points.rows, "close")).toEqual([3]);
    expect(seatsWhere(points.rows, "reachedLimit")).toEqual([]);
    expect(seatsWhere(points.rows, "winner")).toEqual([]);
  });

  it("marks no seat close at game over, only the seat that reached the limit", () => {
    for (const fixture of [gameOverUnique, gameOverDraw]) {
      const { points } = slices(fixture);
      expect(points.gameOver).toBe(true);
      expect(seatsWhere(points.rows, "close")).toEqual([]);
      expect(seatsWhere(points.rows, "reachedLimit")).toEqual([3]);
    }
  });
});

describe("status", () => {
  it("null on notStarted", () => {
    expect(slices(notStarted).status).toBeNull();
  });

  it("unchanged across a viewer keep", () => {
    expect(slices(viewerKeptOne).status).toEqual(
      slices(viewerRolledKeepable).status,
    );
  });

  it("names the beat for a bot keep swap", () => {
    expect(slices(beatBotKeepSwap).status?.status.line).toMatchObject({
      kind: "keeps",
      seat: 1,
      face: 6,
      instead: true,
    });
  });
});

describe("controls", () => {
  it("pending disables every control", () => {
    for (const fixture of [viewerRolledKeepable, roundSummary, gameOverDraw]) {
      const { controls } = sliceSession(
        fixtureSession(fixture, { pending: true }),
      );
      expect([
        controls.roll,
        controls.keep,
        controls.stop,
        controls.nextRound,
        controls.newGame,
        controls.primary.available,
      ]).toStrictEqual([false, false, false, false, false, false]);
    }
  });
});

describe("consistent turn", () => {
  const SEEDS = Array.from({ length: 50 }, (_, i) => i + 1);
  const VIEWER = 0;

  it("every panel names the beat's subject across 50 seeded games", () => {
    for (const seed of SEEDS) {
      for (const [index, fixture] of beatsOfGame(seed).entries()) {
        const where = `seed ${seed} beat ${index}`;
        const beat = select.lastBeat(fixture.events);
        if (!beat) throw new Error(`${where}: no beat`);
        const { acting } = fixture.state;
        const view = slices(fixture);

        expect(seatsWhere(view.roundRows, "current"), where).toEqual(
          acting === null ? [] : [acting],
        );
        if (view.tray.shown) {
          expect([acting, beat.seat], where).toContain(view.tray.shown.seat);
        }
        // Every seat the status names is in the beat: never a later seat.
        const named = new Set(beat.events.flatMap((e) => seatsOf(e)));
        if (beat.seat !== null) named.add(beat.seat);
        for (const seat of statusSeats(view.status?.status)) {
          expect(named.has(seat), `${where}: seat ${seat}`).toBe(true);
        }
      }
    }
  });

  it("statusOf is non-null for every beat except the viewer's keepSet and keepSwapped, and never throws (50 seeds)", () => {
    for (const seed of SEEDS) {
      for (const fixture of beatsOfGame(seed)) {
        const beat = select.lastBeat(fixture.events);
        if (!beat) continue;
        const status = statusOf(beat, fixture.state, VIEWER);
        const silent =
          (beat.kind === "keepSet" || beat.kind === "keepSwapped") &&
          beat.seat === VIEWER;
        expect(status === null, `seed ${seed} ${beat.kind}`).toBe(silent);
      }
    }
  });
});

/** The seats an event names. */
function seatsOf(event: Record<string, unknown>): number[] {
  const seats: number[] = [];
  if (typeof event.seat === "number") seats.push(event.seat);
  if (typeof event.startingSeat === "number") seats.push(event.startingSeat);
  for (const key of ["seats", "winners"]) {
    const value = event[key];
    if (Array.isArray(value)) seats.push(...(value as number[]));
  }
  return seats;
}

/** The seats a status names, in its line and its detail rows. */
function statusSeats(
  status: ReturnType<typeof statusOf> | undefined,
): number[] {
  if (!status) return [];
  const { line, details } = status;
  const rows = [...(line.kind === "row" ? [line.row] : []), ...details];
  return [
    ...("seat" in line ? [line.seat] : []),
    ...rows.flatMap((row) =>
      row.kind === "action"
        ? [row.seat]
        : row.kind === "tieBreak"
          ? row.order
          : [],
    ),
  ];
}

describe("tray.rolling", () => {
  const rolling = (fixture: Fixture, rollMs?: number) =>
    sliceSession(fixtureSession(fixture, { rollMs })).tray.rolling;

  it("slots per beat kind", () => {
    const viewerRolls = select.lastBeat(beatViewerRolls.events);
    expect(rolling(beatViewerRolls)).toStrictEqual({
      beat: viewerRolls?.id,
      ms: 500,
      slots: [0, 1],
    });
    // Slot 0 was kept: only slot 1 rolled.
    const keptRoll = beatFixtures(KEPT_ROLL).at(-1);
    if (!keptRoll) throw new Error("No beat");
    expect(rolling(keptRoll)?.slots).toStrictEqual([1]);
    expect(rolling(beatTieBreakRolled)?.slots).toStrictEqual([0, 1]);
    expect(rolling(beatViewerRollToStart)?.slots).toStrictEqual([0]);
    expect(rolling(beatViewerRolls, 200)?.ms).toBe(200);
  });

  it("null on a keep beat, a turn end, and when rollMs is 0", () => {
    expect(rolling(viewerKeptOne)).toBeNull();
    expect(rolling(beatBotKeepSwap)).toBeNull();
    expect(rolling(beatViewerStops)).toBeNull();
    expect(rolling(beatViewerRolls, 0)).toBeNull();
    // A fixture built without playback has no animation length.
    expect(rolling(viewerRolledKeepable)).toBeNull();
  });
});
