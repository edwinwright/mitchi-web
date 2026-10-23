import { describe, expect, it } from "vitest";
import type { ActionRequest } from "./actions";
import { applyAction, createGame } from "./apply";
import { completeAction, type Spare } from "./dice";
import type { GameState } from "./types";

const SPARE: Spare = [5, 2];
const CONFIG = { seats: 4, pointLimit: 5 };

function rollOff(): GameState {
  const result = applyAction(createGame(CONFIG), { type: "newGame" });
  if (!result.ok) throw new Error("newGame rejected");
  return result.state;
}

function turn(kept: readonly [boolean, boolean], dice = true): GameState {
  const base = rollOff();
  return {
    ...base,
    round: {
      number: 1,
      startingSeat: 0,
      order: [0, 1, 2, 3],
      rollLimit: null,
      finished: [],
      pot: 1,
      tieBreaks: 0,
      lastRoller: null,
      lastDirection: "clockwise",
    },
    phase: {
      kind: "turn",
      seat: 0,
      rollsUsed: dice ? 1 : 0,
      dice: dice ? [3, 4] : null,
      kept,
    },
  };
}

const ROLL: ActionRequest = { type: "roll", seat: 0 };

describe("completeAction", () => {
  it("takes one die in the roll-off", () => {
    expect(completeAction(rollOff(), ROLL, SPARE)).toStrictEqual({
      type: "roll",
      seat: 0,
      values: [5],
      reason: null,
    });
  });

  it("takes two dice on a first roll or with nothing kept", () => {
    expect(
      completeAction(turn([false, false], false), ROLL, SPARE),
    ).toMatchObject({
      values: [5, 2],
    });
    expect(completeAction(turn([false, false]), ROLL, SPARE)).toMatchObject({
      values: [5, 2],
    });
  });

  it("takes one die with one kept, and none with both kept", () => {
    expect(completeAction(turn([true, false]), ROLL, SPARE)).toMatchObject({
      values: [5],
    });
    expect(completeAction(turn([true, true]), ROLL, SPARE)).toMatchObject({
      values: [],
    });
  });

  it("takes none outside a roll phase, and leaves the engine to reject it", () => {
    const fresh = createGame(CONFIG);
    const action = completeAction(fresh, ROLL, SPARE);
    expect(action).toMatchObject({ values: [] });
    expect(applyAction(fresh, action)).toMatchObject({ ok: false });
  });

  it("carries a reason on a roll or stop only when given", () => {
    const state = turn([false, false]);
    expect(completeAction(state, ROLL, SPARE)).toMatchObject({ reason: null });
    expect(completeAction(state, ROLL, SPARE, "rerollingBoth")).toMatchObject({
      reason: "rerollingBoth",
    });
    const stop: ActionRequest = { type: "stop", seat: 0 };
    expect(completeAction(state, stop, SPARE)).toStrictEqual({
      type: "stop",
      seat: 0,
      reason: null,
    });
    expect(completeAction(state, stop, SPARE, "goodEnough")).toMatchObject({
      reason: "goodEnough",
    });
  });

  it("passes keep and control requests through untouched", () => {
    const keep: ActionRequest = { type: "keep", seat: 0, die: 1, kept: true };
    expect(
      completeAction(turn([false, false]), keep, SPARE, "goodEnough"),
    ).toBe(keep);
    const newGame: ActionRequest = { type: "newGame" };
    expect(completeAction(turn([false, false]), newGame, SPARE)).toBe(newGame);
  });
});
