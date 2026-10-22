import { describe, expect, it } from "vitest";
import * as fixtures from "../testing";
import { applyAction } from "./apply";
import { botStep } from "./bots";
import { completeAction } from "./dice";
import { select } from "./index";
import type { Action } from "./actions";
import type { GameState } from "./types";

const PHASE_KINDS = [
  "gameOver",
  "notStarted",
  "rollOff",
  "roundSummary",
  "tieBreak",
  "turn",
];

const NAMED = Object.entries(fixtures).filter(
  (entry): entry is [string, fixtures.Fixture] =>
    typeof entry[1] === "object" && "events" in entry[1] && "state" in entry[1],
);

/** A mid-action beat has nobody acting, so no next action. */
const CAUGHT_UP = NAMED.filter(([, f]) => f.caughtUp !== false);

const roundTrip = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** A legal next action in the state, as a client would send it. */
function nextAction(state: GameState): Action {
  switch (state.phase.kind) {
    case "notStarted":
    case "gameOver":
      return { type: "newGame" };
    case "roundSummary":
      return { type: "nextRound" };
    default: {
      const seat = select.toRoll(state)[0];
      const step = botStep(state, seat);
      if (!step) throw new Error(`No move for seat ${seat}`);
      return completeAction(state, step.request, [3, 4], step.reason);
    }
  }
}

describe("state is plain JSON (ENG-2)", () => {
  it("covers every phase kind", () => {
    const kinds = new Set(NAMED.map(([, f]) => f.state.phase.kind));
    expect([...kinds].toSorted()).toStrictEqual(PHASE_KINDS);
  });

  it("round trip for every phase kind", () => {
    for (const [name, fixture] of NAMED) {
      // toStrictEqual catches an `undefined` that JSON drops.
      expect(roundTrip(fixture.state), name).toStrictEqual(fixture.state);
    }
  });

  it("round trip then same next action", () => {
    for (const [name, fixture] of CAUGHT_UP) {
      const action = nextAction(fixture.state);
      const direct = applyAction(fixture.state, action);
      const viaJson = applyAction(roundTrip(fixture.state), roundTrip(action));
      expect(direct.ok, name).toBe(true);
      expect(roundTrip(viaJson), name).toStrictEqual(roundTrip(direct));
    }
  });

  it("states, events and views survive a JSON round trip", () => {
    for (const [name, fixture] of NAMED) {
      const view = fixtures.fixtureSession(fixture).view;
      expect(roundTrip(fixture.state), name).toStrictEqual(fixture.state);
      expect(roundTrip(fixture.events), name).toStrictEqual(fixture.events);
      expect(roundTrip(view), name).toStrictEqual(view);
      expect(roundTrip(fixture.state), name).toHaveProperty("acting");
    }
    // The new fields are among what was round-tripped.
    const events = NAMED.flatMap(([, f]) => f.events);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "potTaken", hand: expect.any(String) }),
    );
    expect(NAMED.some(([, f]) => f.state.acting !== null)).toBe(true);
  });

  it("the events an action returns are plain JSON too", () => {
    for (const [name, fixture] of CAUGHT_UP) {
      const result = applyAction(fixture.state, nextAction(fixture.state));
      if (result.ok)
        expect(roundTrip(result.events), name).toStrictEqual(result.events);
    }
  });
});
