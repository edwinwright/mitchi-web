import { describe, expect, it } from "vitest";
import {
  botKept,
  botMidTurn,
  closeToLimit,
  fixtureSession,
  gameOverDraw,
  gameOverUnique,
  mitchiInRound,
  notStarted,
  rollOff,
  rollOffReroll,
  roundSummary,
  starterLimitSet,
  tieBreakRunning,
  tieBreakViewerToRoll,
  viewerKeptOne,
  viewerRolledKeepable,
  viewerToRoll,
  type Fixture,
} from "../testing";
import { latestRollSeq, shownRoll, sliceSession } from "./board-slices";

const shown = (fixture: Fixture, holding = false) =>
  shownRoll(fixtureSession(fixture).view, holding);
const slices = (fixture: Fixture) => sliceSession(fixtureSession(fixture));
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

  it("shows nothing before anyone has rolled", () => {
    expect(shown(notStarted)).toBeNull();
  });

  it("shows the roll-off die while its hold runs, then nothing", () => {
    expect(shown(rollOff, true)).toEqual({ kind: "die", seat: 0, face: 4 });
    expect(shown(rollOff)).toBeNull();
  });

  it("shows nothing at the start of round 1: roll-off dice do not carry over", () => {
    expect(shown(viewerToRoll, true)).toBeNull();
  });

  it("keeps the last roll on screen until the hold ends or the next seat rolls, with no keep flags", () => {
    // Seat 1 is to roll; the viewer's final 6-3 is held.
    expect(shown(starterLimitSet, true)).toEqual({
      kind: "hand",
      seat: 0,
      dice: [6, 3],
      hand: "6-3",
      kept: null,
    });
    expect(shown(starterLimitSet)).toBeNull();
    // A bot's one-roll turn stays shown after it ends, between rounds too.
    expect(shown(roundSummary, true)).toMatchObject({
      seat: 3,
      dice: [3, 2],
      kept: null,
    });
    expect(shown(roundSummary)).toBeNull();
  });

  it("holds the last tie-break roll, then shows nothing until the next seat rolls", () => {
    expect(shown(tieBreakViewerToRoll, true)).toMatchObject({
      seat: 1,
      dice: [4, 3],
      kept: null,
    });
    expect(shown(tieBreakViewerToRoll)).toBeNull();
  });

  it("shows the acting seat's own dice whether or not a hold runs", () => {
    expect(shown(botMidTurn, true)).toMatchObject({ seat: 1, dice: [4, 2] });
    expect(shown(botMidTurn, false)).toMatchObject({ seat: 1, dice: [4, 2] });
  });
});

describe("latestRollSeq", () => {
  it("is the seq of the most recent roll of any kind or turn end", () => {
    const { events } = tieBreakViewerToRoll;
    const last = events.findLast(
      (event) => event.type === "tieBreakRolled" || event.type === "turnEnded",
    );
    expect(latestRollSeq(events)).toBe(last?.seq);
    expect(latestRollSeq(rollOff.events)).toBe(
      rollOff.events.find((event) => event.type === "rollOffRolled")?.seq,
    );
  });

  it("is null before anyone has rolled", () => {
    expect(latestRollSeq(notStarted.events)).toBeNull();
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
    expect(slices(botMidTurn).roundBar).toEqual({ kind: "round", number: 1 });
    expect(slices(tieBreakRunning).roundBar).toEqual({
      kind: "tieBreak",
      number: 1,
      tiedOn: "3-1",
    });
  });

  it("names the round just played between rounds and at game over", () => {
    expect(slices(roundSummary).roundBar).toEqual({ kind: "round", number: 1 });
    expect(slices(gameOverUnique).roundBar).toEqual({
      kind: "round",
      number: 7,
    });
  });
});

describe("header", () => {
  it("has nothing but its stage before start", () => {
    expect(slices(notStarted).header).toEqual({ stage: "notStarted" });
  });

  it("names the next seat to roll to start, and whether it is the viewer", () => {
    expect(slices(rollOff).header).toEqual({
      stage: "rollOff",
      seat: 1,
      viewer: false,
    });
    // 0 and 1 tied on 4: the viewer rolls first in the new pass.
    expect(slices(rollOffReroll).header).toEqual({
      stage: "rollOff",
      seat: 0,
      viewer: true,
    });
  });

  it("gives the round, the acting seat, the pot and the hand to beat in a turn", () => {
    expect(slices(viewerToRoll).header).toEqual({
      stage: "round",
      number: 1,
      tieBreak: null,
      seat: 0,
      viewer: true,
      pot: 1,
      handToBeat: null,
      rollLimit: null,
    });
    expect(slices(botMidTurn).header).toMatchObject({
      seat: 1,
      viewer: false,
      handToBeat: "6-3",
    });
    expect(slices(mitchiInRound).header).toMatchObject({ pot: 2 });
  });

  it("names the taker, the pot and the worst hand between rounds", () => {
    expect(slices(roundSummary).header).toEqual({
      stage: "summary",
      number: 1,
      taker: 3,
      viewer: false,
      pot: 1,
      worstHand: "3-2",
    });
  });

  it("gives the winners at game over, and whether the viewer is one", () => {
    expect(slices(gameOverUnique).header).toEqual({
      stage: "gameOver",
      winners: [0],
      viewerWon: true,
    });
    expect(slices(gameOverDraw).header).toEqual({
      stage: "gameOver",
      winners: [0, 2],
      viewerWon: true,
    });
  });
});

describe("roll limit", () => {
  it("is not shown on the starter's turn, who has three boxes", () => {
    expect(slices(viewerToRoll).header).toMatchObject({ rollLimit: null });
    expect(slices(viewerToRoll).tray.rolls).toEqual({ available: 3, used: 0 });
    expect(slices(viewerRolledKeepable).tray.rolls).toEqual({
      available: 3,
      used: 1,
    });
  });

  it("is shown once the starter has set it, and the boxes equal it", () => {
    expect(slices(starterLimitSet).header).toMatchObject({ rollLimit: 2 });
    expect(slices(starterLimitSet).tray.rolls).toEqual({
      available: 2,
      used: 0,
    });
    expect(slices(botMidTurn).header).toMatchObject({ rollLimit: 2 });
    expect(slices(botMidTurn).tray.rolls).toEqual({ available: 2, used: 1 });
  });
});

describe("tie-break", () => {
  it("has no roll limit, one box, no comparison, and no hand to beat before the first tie-break roll", () => {
    // The main round's limit is 1 and its worst hand 3-1; neither carries in.
    const running = slices(tieBreakRunning);
    expect(running.header).toEqual({
      stage: "round",
      number: 1,
      tieBreak: 1,
      seat: 1,
      viewer: false,
      pot: 2,
      handToBeat: null,
      rollLimit: null,
    });
    expect(running.tray.rolls).toEqual({ available: 1, used: 0 });
    expect(running.tray.comparison).toBeNull();
  });

  it("takes the hand to beat from tie-break rolls only", () => {
    const viewerNext = slices(tieBreakViewerToRoll);
    expect(viewerNext.header).toMatchObject({
      tieBreak: 1,
      seat: 0,
      viewer: true,
      handToBeat: "4-3",
      rollLimit: null,
    });
    expect(viewerNext.tray.rolls).toEqual({ available: 1, used: 0 });
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

  it("has one box in the roll to start and none before start, between rounds or at game over", () => {
    expect(slices(rollOff).tray.rolls).toEqual({ available: 1, used: 0 });
    expect(slices(notStarted).tray.rolls).toBeNull();
    expect(slices(roundSummary).tray.rolls).toBeNull();
    expect(slices(gameOverUnique).tray.rolls).toBeNull();
  });

  it("has no comparison between rounds", () => {
    expect(slices(roundSummary).tray.comparison).toBeNull();
  });

  it("marks a past roll on show as held, never the acting seat's own", () => {
    const held = (fixture: Fixture) =>
      sliceSession(fixtureSession(fixture), { holding: true }).tray.held;
    expect(held(tieBreakViewerToRoll)).toBe(true);
    expect(held(roundSummary)).toBe(true);
    expect(held(rollOff)).toBe(true);
    expect(held(botMidTurn)).toBe(false);
    expect(held(viewerRolledKeepable)).toBe(false);
    // Nothing on show, nothing held.
    expect(slices(tieBreakViewerToRoll).tray.held).toBe(false);
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
