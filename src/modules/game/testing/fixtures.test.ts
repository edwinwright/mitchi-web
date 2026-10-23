import { describe, expect, it } from "vitest";
import { applyAction, completeAction, createGame, select } from "../engine";
import * as fixtures from "./fixtures";
import { batchActions } from "./batch";
import { beatFixtures, fixtureSession, run, type Fixture } from "./fixtures";
import { simulateGame } from "./simulate";

const NAMED: Record<string, Fixture> = Object.fromEntries(
  Object.entries(fixtures).filter(
    (entry): entry is [string, Fixture] =>
      typeof entry[1] === "object" &&
      "events" in entry[1] &&
      "state" in entry[1],
  ),
);

describe("fixtures", () => {
  it("has every fixture this slice names", () => {
    expect(Object.keys(NAMED).toSorted()).toStrictEqual(
      [
        "botKept",
        "botMidTurn",
        "closeToLimit",
        "gameOverDraw",
        "gameOverUnique",
        "gameOverAfterTieBreak",
        "mitchiInRound",
        "notStarted",
        "rollOff",
        "rollOffReroll",
        "roundSummary",
        "secondTieBreak",
        "starterLimitSet",
        "tieBreakRunning",
        "tieBreakViewerToRoll",
        "tieBreakSummary",
        "chainedTieBreakSummary",
        "viewerKeptBoth",
        "viewerKeptOne",
        "viewerRolledKeepable",
        "viewerToRoll",
        "beatGameStart",
        "beatViewerRollToStart",
        "beatBotRollToStart",
        "beatRollOffTie",
        "beatRollOffWinner",
        "beatViewerRolls",
        "beatViewerStops",
        "botBeats",
        "botTies",
        "botWorse",
        "beatBotKeepSwap",
        "beatNoRollsLeft",
        "beatStopMitchi",
        "beatTieBreakOpens",
        "beatTieBreakRolled",
        "beatLastHandOfRound",
        "beatRoundTwoBotStarts",
      ].toSorted(),
    );
  });

  describe.each(Object.entries(NAMED))("%s", (_name, fixture) => {
    it("round-trips as JSON", () => {
      expect(JSON.parse(JSON.stringify(fixture.state))).toStrictEqual(
        fixture.state,
      );
      expect(JSON.parse(JSON.stringify(fixture.events))).toStrictEqual(
        fixture.events,
      );
    });

    it("has a seq that strictly increases", () => {
      const seqs = fixture.events.map((e) => e.seq);
      seqs.forEach((seq, i) => {
        if (i > 0) expect(seq).toBeGreaterThan(seqs[i - 1]);
      });
    });

    it("stamps each event with its beat's first seq, never decreasing", () => {
      fixture.events.forEach((event, i) => {
        const previous = fixture.events[i - 1];
        if (previous) expect(event.beat).toBeGreaterThanOrEqual(previous.beat);
        // A trim never splits a beat, so its first event is in the log.
        expect(fixture.events.find((e) => e.beat === event.beat)?.seq).toBe(
          event.beat,
        );
      });
    });

    // A mid-action beat has nobody acting: there is nothing to agree on.
    if (fixture.caughtUp !== false)
      it("agrees with applyAction about what the viewer may do", () => {
        const { allowed } = fixtureSession(fixture);
        const { state } = fixture;
        const viewer = fixtures.FIXTURE_VIEWER;
        const accepted = (action: Parameters<typeof applyAction>[1]) =>
          applyAction(state, action).ok;
        const roll = completeAction(
          state,
          { type: "roll", seat: viewer },
          [3, 4],
        );
        expect(accepted(roll)).toBe(allowed.roll);
        expect(accepted({ type: "stop", seat: viewer, reason: null })).toBe(
          allowed.stop,
        );
        expect(accepted({ type: "newGame" })).toBe(allowed.newGame);
        expect(accepted({ type: "nextRound" })).toBe(allowed.nextRound);
      });
  });

  it("run rejects an unreachable step", () => {
    expect(() =>
      run(createGame(fixtures.FIXTURE_CONFIG), [
        { type: "roll", seat: 0, values: [3], reason: null },
      ]),
    ).toThrow(/rejected: wrongPhase/);
  });
});

describe("the states fixtures show", () => {
  it("rollOff: the viewer has rolled and the bots are to go", () => {
    expect(select.toRoll(fixtures.rollOff.state)).toStrictEqual([1]);
    expect(select.stillToRoll(fixtures.rollOff.state)).toStrictEqual([2, 3]);
  });

  it("round 1 keeps the roll-off rows", () => {
    const types = fixtures.viewerToRoll.events.map((e) => e.type);
    expect(types.slice(0, 2)).toStrictEqual(["gameStarted", "rollOffStarted"]);
    expect(types).toContain("rollOffRolled");
    expect(types.slice(-2)).toStrictEqual(["roundStarted", "turnStarted"]);
  });

  it("rollOffReroll: only the tied seats roll again", () => {
    const { state } = fixtures.rollOffReroll;
    expect(state.phase).toMatchObject({ kind: "rollOff", seats: [0, 1] });
    expect(select.toRoll(state)).toStrictEqual([0]);
    expect(select.stillToRoll(state)).toStrictEqual([1]);
  });

  it("the viewer fixtures are the viewer's turn, in order of progress", () => {
    const kept = (f: Fixture) => select.kept(f.state, 0);
    expect(select.actingSeat(fixtures.viewerToRoll.state)).toBe(0);
    expect(kept(fixtures.viewerRolledKeepable)).toStrictEqual([false, false]);
    expect(kept(fixtures.viewerKeptOne)).toStrictEqual([true, false]);
    expect(kept(fixtures.viewerKeptBoth)).toStrictEqual([true, true]);
    expect(fixtureSession(fixtures.viewerKeptBoth).allowed.roll).toBe(false);
  });

  it("starterLimitSet: limit 2, worst hand 6-3 held by the viewer", () => {
    const { state } = fixtures.starterLimitSet;
    expect(select.rollLimit(state)).toStrictEqual({ set: 2, max: 3 });
    expect(select.worstHandSoFar(state)).toStrictEqual({
      hand: "6-3",
      seats: [0],
    });
    expect(select.actingSeat(state)).toBe(1);
  });

  it("botMidTurn and botKept: seat 1 is mid-turn", () => {
    expect(select.rollsLeft(fixtures.botMidTurn.state)).toBe(1);
    expect(select.kept(fixtures.botKept.state, 1)).toStrictEqual([true, false]);
  });

  it("mitchiInRound: the pot is 2 and the limit 1", () => {
    const { state } = fixtures.mitchiInRound;
    expect(state.round).toMatchObject({ pot: 2, rollLimit: 1 });
  });
});

describe("the later fixtures", () => {
  it("roundSummary: seat 3 took the pot and the next round awaits", () => {
    const { state } = fixtures.roundSummary;
    expect(state.phase).toStrictEqual({
      kind: "roundSummary",
      taker: 3,
      takerHand: "3-2",
      tieBreak: null,
    });
    expect(state.points).toStrictEqual([0, 0, 0, 1]);
    expect(fixtureSession(fixtures.roundSummary).allowed.nextRound).toBe(true);
  });

  it("tieBreakRunning: seat 1 is to roll, the viewer is in the tie-break, tied on 3-1", () => {
    const { state } = fixtures.tieBreakRunning;
    expect(state.phase).toMatchObject({
      kind: "tieBreak",
      order: [1, 0],
      tiedOn: "3-1",
      direction: "anticlockwise",
    });
    expect(select.actingSeat(state)).toBe(1);
    expect(select.inContest(state, 0)).toBe(true);
    expect(select.inContest(state, 2)).toBe(false);
    expect(state.round?.pot).toBe(2);
  });

  it("tieBreakViewerToRoll: the viewer rolls next and may only roll", () => {
    const { state } = fixtures.tieBreakViewerToRoll;
    expect(select.actingSeat(state)).toBe(0);
    expect(select.worstHandSoFar(state)).toStrictEqual({
      hand: "4-3",
      seats: [1],
    });
    const { allowed } = fixtureSession(fixtures.tieBreakViewerToRoll);
    expect(allowed).toMatchObject({ roll: true, setKeep: false, stop: false });
  });

  it("secondTieBreak: clockwise from the viewer, pot 4", () => {
    const { state } = fixtures.secondTieBreak;
    expect(state.phase).toMatchObject({
      kind: "tieBreak",
      order: [0, 1],
      direction: "clockwise",
    });
    expect(select.tieBreakNumber(state)).toBe(2);
    expect(state.round?.pot).toBe(4);
  });

  it("gameOverUnique: one winner, the final taker on 5", () => {
    const { state } = fixtures.gameOverUnique;
    expect(state.points).toStrictEqual([0, 1, 1, 5]);
    expect(state.phase).toStrictEqual({
      kind: "gameOver",
      winners: [0],
      taker: 3,
      takerHand: "3-2",
      tieBreak: null,
    });
    expect(fixtures.gameOverUnique.events.at(-1)).toMatchObject({
      type: "gameEnded",
      winners: [0],
    });
  });

  it("gameOverDraw: seats 0 and 2 share the win", () => {
    const { state } = fixtures.gameOverDraw;
    expect(state.points).toStrictEqual([0, 1, 0, 5]);
    expect(state.phase).toStrictEqual({
      kind: "gameOver",
      winners: [0, 2],
      taker: 3,
      takerHand: "3-2",
      tieBreak: null,
    });
    expect(fixtureSession(fixtures.gameOverDraw).allowed.newGame).toBe(true);
  });

  it("a game-over log starts at the final round: the earlier rounds were trimmed", () => {
    for (const [fixture, rounds] of [
      [fixtures.gameOverUnique, 7],
      [fixtures.gameOverDraw, 6],
    ] as const) {
      expect(fixture.events[0]).toMatchObject({
        type: "roundStarted",
        round: rounds,
      });
      expect(fixture.events.at(-1)?.type).toBe("gameEnded");
    }
  });
});

describe("fixtureSession", () => {
  it("defaults to the viewer in seat 0, not pending, with pacing", () => {
    const session = fixtureSession(fixtures.viewerToRoll);
    expect(session.view).toMatchObject({ viewerSeat: 0, pending: false });
    expect(session.pacing).toBeDefined();
    expect(session.allowed.roll).toBe(true);
  });

  it("pacing: null gives the online shape", () => {
    expect(
      "pacing" in fixtureSession(fixtures.viewerToRoll, { pacing: null }),
    ).toBe(false);
  });

  it("takes another viewer seat and a pending flag", () => {
    const session = fixtureSession(fixtures.starterLimitSet, {
      viewerSeat: 1,
      pending: true,
    });
    expect(session.view).toMatchObject({ viewerSeat: 1, pending: true });
    expect(session.allowed.roll).toBe(true);
  });
});

describe("fixtureSession beat options", () => {
  it("puts rollMs on the view, from the fixture or the options", () => {
    expect(fixtureSession(fixtures.viewerToRoll).view.rollMs).toBe(0);
    expect(fixtureSession(fixtures.beatViewerRolls).view.rollMs).toBe(500);
    expect(
      fixtureSession(fixtures.beatViewerRolls, { rollMs: 200 }).view.rollMs,
    ).toBe(200);
  });

  it("allows nothing while not caught up or while the viewer's dice animate", () => {
    expect(fixtureSession(fixtures.viewerToRoll).allowed.roll).toBe(true);
    for (const options of [{ caughtUp: false }, { animating: true }]) {
      expect(
        fixtureSession(fixtures.viewerToRoll, options).allowed,
      ).toStrictEqual(select.noIntents);
    }
    expect(fixtureSession(fixtures.beatViewerStops).allowed).toStrictEqual(
      select.noIntents,
    );
  });
});

describe("beatFixtures", () => {
  // The first three seeded bot games with a keep swap, each swap one batch.
  const scripts: ReturnType<typeof batchActions>[] = [];
  for (let seed = 1; scripts.length < 3; seed++) {
    const actions: Parameters<typeof applyAction>[1][] = [];
    simulateGame(seed, {
      onStep: ({ action, result }) => {
        if (result.ok) actions.push(action);
      },
    });
    const steps = batchActions(actions);
    if (steps.some((step) => Array.isArray(step))) scripts.push(steps);
  }

  it("the last fixture of each step equals the plain run state, earlier ones are not caught up", () => {
    for (const steps of scripts) {
      const beats = beatFixtures(steps);
      const ends = beats.filter((f) => f.caughtUp);
      expect(
        beats.every((f) => f.caughtUp === true || f.caughtUp === false),
      ).toBe(true);
      let state = createGame(fixtures.FIXTURE_CONFIG);
      const expected = steps.map((step) => {
        state = run(state, Array.isArray(step) ? step : [step]).state;
        return state;
      });
      expect(ends.map((f) => f.state)).toStrictEqual(expected);
    }
  });

  it("beat stamps never decrease", () => {
    for (const steps of scripts) {
      let last = 0;
      for (const fixture of beatFixtures(steps)) {
        for (const event of fixture.events) {
          if (event.seq > last) {
            expect(event.beat).toBeGreaterThanOrEqual(
              fixture.events.find((e) => e.seq === last)?.beat ?? 0,
            );
            last = event.seq;
          }
        }
      }
      expect(last).toBeGreaterThan(0);
    }
  });

  it("a keep swap in one batch is one keepSwapped beat", () => {
    expect(select.lastBeat(fixtures.beatBotKeepSwap.events)?.kind).toBe(
      "keepSwapped",
    );
    for (const steps of scripts) {
      const swaps = beatFixtures(steps).filter(
        (f) => f.caughtUp && select.lastBeat(f.events)?.kind === "keepSwapped",
      );
      expect(swaps.length).toBe(
        steps.filter((step) => Array.isArray(step)).length,
      );
    }
  });

  it("a roll beat carries rollMs; other beats carry 0", () => {
    expect(fixtures.beatViewerRollToStart.rollMs).toBe(500);
    expect(fixtures.beatTieBreakRolled.rollMs).toBe(500);
    expect(fixtures.beatViewerStops.rollMs).toBe(0);
    expect(fixtures.beatGameStart.rollMs).toBe(0);
  });
});
