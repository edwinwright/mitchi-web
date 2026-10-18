import { describe, expect, it } from "vitest";
import {
  botKept,
  botMidTurn,
  fixtureSession,
  gameOverDraw,
  notStarted,
  rollOff,
  roundSummary,
  starterLimitSet,
  tieBreakViewerToRoll,
  viewerKeptOne,
  viewerRolledKeepable,
  viewerToRoll,
  type Fixture,
} from "../testing";
import { shownRoll, sliceSession } from "./board-slices";

const shown = (fixture: Fixture) => shownRoll(fixtureSession(fixture).view);

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

  it("shows the roll-off die while the roll-off runs", () => {
    expect(shown(rollOff)).toEqual({ kind: "die", seat: 0, face: 4 });
  });

  it("shows nothing at the start of round 1: roll-off dice do not carry over", () => {
    expect(shown(viewerToRoll)).toBeNull();
  });

  it("keeps the last roll on screen until the next seat rolls, with no keep flags", () => {
    // Seat 1 is to roll; the viewer's final 6-3 is still the roll on the table.
    expect(shown(starterLimitSet)).toEqual({
      kind: "hand",
      seat: 0,
      dice: [6, 3],
      hand: "6-3",
      kept: null,
    });
    // A bot's one-roll turn stays shown after it ends.
    expect(shown(roundSummary)).toMatchObject({
      seat: 3,
      dice: [3, 2],
      kept: null,
    });
  });

  it("shows the last tie-break roll until the next seat rolls", () => {
    expect(shown(tieBreakViewerToRoll)).toMatchObject({
      seat: 1,
      dice: [4, 3],
      kept: null,
    });
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
    });
  });

  it("offers Roll, Keep and Stop on the viewer's turn", () => {
    const { controls, dice } = sliceSession(
      fixtureSession(viewerRolledKeepable),
    );
    expect(controls).toMatchObject({ roll: true, keep: true, stop: true });
    expect(dice.yourTurn).toBe(true);
  });

  it("has no round panel before round 1 and an end screen at game over", () => {
    expect(sliceSession(fixtureSession(notStarted)).round).toBeNull();
    const over = sliceSession(fixtureSession(gameOverDraw));
    expect(over.end?.winners.length).toBeGreaterThanOrEqual(2);
    expect(over.controls.newGame).toBe(true);
  });
});
