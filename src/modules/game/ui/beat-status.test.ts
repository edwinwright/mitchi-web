import { describe, expect, it } from "vitest";
import { select, type Beat, type LoggedEvent } from "../engine";
import {
  beatBotKeepSwap,
  beatBotRollToStart,
  beatGameStart,
  beatNoRollsLeft,
  beatRollOffTie,
  beatRollOffWinner,
  beatRoundTwoBotStarts,
  beatStopMitchi,
  beatTieBreakOpens,
  beatTieBreakRolled,
  beatViewerRollToStart,
  beatViewerRolls,
  beatViewerStops,
  botKept,
  gameOverDraw,
  roundSummary,
  starterLimitSet,
  viewerKeptBoth,
  viewerKeptOne,
  viewerRolledKeepable,
  viewerToRoll,
  type Fixture,
} from "../testing";
import { latestStatus, statusOf } from "./beat-status";

const VIEWER = 0;

function lastBeatOf(fixture: Fixture): Beat<LoggedEvent> {
  const beat = select.lastBeat(fixture.events);
  if (!beat) throw new Error("No beat");
  return beat;
}

const status = (fixture: Fixture) =>
  statusOf(lastBeatOf(fixture), fixture.state, VIEWER);

describe("statusOf", () => {
  it("gameStarted gives intro with viewerFirst", () => {
    expect(status(beatGameStart)).toStrictEqual({
      line: { kind: "intro", viewerFirst: true },
      details: [],
    });
  });

  it("rollOffRolled gives the face, for the viewer and another seat", () => {
    expect(status(beatViewerRollToStart)?.line).toStrictEqual({
      kind: "rolledToStart",
      seat: 0,
      viewer: true,
      face: 4,
    });
    expect(status(beatBotRollToStart)?.line).toStrictEqual({
      kind: "rolledToStart",
      seat: 1,
      viewer: false,
      face: 3,
    });
  });

  it("rollOffStarted tie gives tied with the face", () => {
    expect(status(beatRollOffTie)).toStrictEqual({
      line: { kind: "tied", face: 4 },
      details: [],
    });
  });

  it("rollOffStarted with tiedOn null throws", () => {
    const beat: Beat<LoggedEvent> = {
      kind: "rollOffStarted",
      seat: null,
      events: [
        {
          type: "rollOffStarted",
          seats: [0, 1],
          tiedOn: null,
          seq: 9,
          beat: 9,
        },
      ],
    };
    expect(() => statusOf(beat, beatRollOffTie.state, VIEWER)).toThrow(
      "A roll-to-start tie with no face",
    );
  });

  it("roundStarted round 1 has no turn row", () => {
    const result = status(beatRollOffWinner);
    expect(result?.line).toMatchObject({
      kind: "row",
      row: { kind: "action", seat: 0, phrase: { type: "startsRound" } },
    });
    expect(result?.details.map((row) => row.kind)).toStrictEqual(["round"]);
  });

  it('roundStarted round 2 with a bot starter reads "<label>, Starts the round"', () => {
    const result = status(beatRoundTwoBotStarts);
    expect(result?.line).toMatchObject({
      kind: "row",
      row: {
        kind: "action",
        seat: 1,
        voice: "player",
        phrase: { type: "startsRound" },
      },
    });
    expect(result?.details.map((row) => row.kind)).toStrictEqual(["round"]);
  });

  it("turnStarted for another seat is a handover", () => {
    expect(status(starterLimitSet)).toStrictEqual({
      line: { kind: "handover", seat: 1, viewer: false },
      details: [],
    });
    expect(status(viewerToRoll)?.line).toStrictEqual({
      kind: "handover",
      seat: 0,
      viewer: true,
    });
  });

  it("rolled gives the new dice and hand, never the reason", () => {
    expect(status(beatViewerRolls)?.line).toMatchObject({
      kind: "row",
      row: {
        kind: "action",
        voice: "you",
        shown: { kind: "hand", dice: [5, 2], hand: "5-2" },
        phrase: { type: "rolls" },
        reason: null,
      },
    });
  });

  it('viewer\'s last roll still reads "You roll" until the turn-end beat', () => {
    expect(status(beatViewerRolls)?.line).toMatchObject({
      row: { voice: "you", phrase: { type: "rolls" } },
    });
    expect(status(beatViewerStops)?.line).toMatchObject({
      row: { voice: "you", phrase: { type: "stop" } },
    });
  });

  it("a bot's keep reads the face it kept", () => {
    expect(status(botKept)?.line).toStrictEqual({
      kind: "keeps",
      seat: 1,
      face: 5,
      instead: false,
    });
  });

  it("keepSwapped for a bot reads the second die's face", () => {
    expect(status(beatBotKeepSwap)?.line).toStrictEqual({
      kind: "keeps",
      seat: 1,
      face: 6,
      instead: true,
    });
  });

  it("the viewer's own keep is silent", () => {
    expect(status(viewerKeptOne)).toBeNull();
    expect(status(viewerKeptBoth)).toBeNull();
  });

  it("turnEnded has its riders as details", () => {
    const result = status(beatStopMitchi);
    expect(result?.line).toMatchObject({
      row: { kind: "action", phrase: { type: "stop" } },
    });
    expect(result?.details.map((row) => row.kind)).toStrictEqual([
      "rollLimit",
      "pot",
    ]);
    expect(status(beatNoRollsLeft)?.line).toMatchObject({
      row: { seat: 1, phrase: { type: "noRollsLeft" } },
    });
  });

  it("tieBreakStarted has the pot row as detail", () => {
    const result = status(beatTieBreakOpens);
    expect(result?.line).toMatchObject({
      kind: "row",
      row: { kind: "tieBreak", number: 1 },
    });
    expect(result?.details).toMatchObject([
      { kind: "pot", cause: "tieBreak", pot: 2 },
    ]);
  });

  it("tieBreakRolled gives the roll with its hand", () => {
    expect(status(beatTieBreakRolled)?.line).toMatchObject({
      row: { kind: "action", seat: 1, phrase: { type: "rolls" } },
    });
  });

  it("potTaken", () => {
    expect(status(roundSummary)).toMatchObject({
      line: {
        kind: "row",
        row: { kind: "action", seat: 3, phrase: { type: "takesPot", pot: 1 } },
      },
      details: [],
    });
  });

  it("gameEnded gives game over, the draw, then the winners", () => {
    const result = status(gameOverDraw);
    expect(result?.line).toMatchObject({ row: { kind: "gameOver" } });
    expect(
      result?.details.map((row) =>
        row.kind === "action" ? `wins ${row.seat}` : row.kind,
      ),
    ).toStrictEqual(["draw", "wins 0", "wins 2"]);
  });
});

describe("latestStatus", () => {
  it("skips the viewer's keep beats and keeps the beat id", () => {
    const rolled = latestStatus(
      viewerRolledKeepable.events,
      viewerRolledKeepable.state,
      VIEWER,
    );
    expect(rolled).not.toBeNull();
    for (const kept of [viewerKeptOne, viewerKeptBoth]) {
      expect(latestStatus(kept.events, kept.state, VIEWER)).toStrictEqual(
        rolled,
      );
    }
  });

  it("is null before any beat", () => {
    expect(latestStatus([], viewerToRoll.state, VIEWER)).toBeNull();
  });
});
