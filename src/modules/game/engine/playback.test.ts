import { describe, expect, it } from "vitest";
import type { Action } from "./actions";
import { applyAction, createGame } from "./apply";
import { applyEvent } from "./evolve";
import {
  caughtUp,
  receive,
  release,
  startPlayback,
  type Playback,
} from "./playback";
import type { Die, GameConfig, GameState, Seat } from "./types";

const CONFIG = { seats: 4, pointLimit: 5 };

const R = (seat: Seat, ...values: Die[]): Action => ({
  type: "roll",
  seat,
  values,
  reason: null,
});
const S = (seat: Seat): Action => ({ type: "stop", seat, reason: null });
const NEW: Action = { type: "newGame" };
const NEXT: Action = { type: "nextRound" };
const START = [NEW, R(0, 6), R(1, 3), R(2, 2), R(3, 1)];
const ROUND_ONE = [
  ...START,
  R(0, 6, 5),
  S(0),
  R(1, 4, 6),
  R(2, 3, 3),
  R(3, 3, 2),
];

/**
 * Plays the actions through the engine and a playback together, releasing
 * every beat, so the playback is caught up with the returned state.
 */
function played(actions: readonly Action[], config: GameConfig = CONFIG) {
  let state: GameState = createGame(config);
  let playback = startPlayback(state);
  for (const action of actions) {
    const result = applyAction(state, action);
    if (!result.ok) throw new Error(`Rejected ${result.rejection.code}`);
    state = result.state;
    playback = drain(receive(playback, result.events));
  }
  return { state, playback };
}

function drain(playback: Playback): Playback {
  let current = playback;
  while (!caughtUp(current)) current = release(current);
  return current;
}

/** The engine's events for one more action, and the state it returns. */
function next(state: GameState, action: Action) {
  const result = applyAction(state, action);
  if (!result.ok) throw new Error(`Rejected ${result.rejection.code}`);
  return result;
}

describe("startPlayback", () => {
  it("shows the initial state with nothing released or queued", () => {
    const initial = createGame(CONFIG);
    expect(startPlayback(initial)).toStrictEqual({
      shown: initial,
      released: [],
      queue: [],
      seq: 0,
    });
  });
});

describe("receive", () => {
  it("numbers from seq + 1 and stamps each event with its beat's first seq", () => {
    const { state, playback } = played(START.slice(0, -1));
    const { events } = next(state, START[START.length - 1]);
    const after = receive(playback, events);
    // rollOffRolled | roundStarted | turnStarted: three beats.
    expect(after.queue.map((e) => [e.type, e.seq, e.beat])).toStrictEqual([
      ["rollOffRolled", playback.seq + 1, playback.seq + 1],
      ["roundStarted", playback.seq + 2, playback.seq + 2],
      ["turnStarted", playback.seq + 3, playback.seq + 3],
    ]);
    expect(after.seq).toBe(playback.seq + 3);
    expect(after.shown).toBe(playback.shown);
  });

  it("does not fold, and no events returns the same object", () => {
    const { playback } = played([NEW]);
    expect(receive(playback, [])).toBe(playback);
  });
});

describe("release", () => {
  it("folds the whole leading beat and nothing more", () => {
    // The starter stops on a Mitchi: turnEnded and its three riders, then turnStarted.
    const { state, playback } = played([...START, R(0, 2, 1)]);
    const stop = next(state, S(0));
    const queued = receive(playback, stop.events);
    const once = release(queued);
    expect(once.released.slice(-4).map((e) => e.type)).toStrictEqual([
      "turnEnded",
      "rollLimitSet",
      "potChanged",
      "worstHandChanged",
    ]);
    expect(once.queue.map((e) => e.type)).toStrictEqual(["turnStarted"]);
    expect(caughtUp(once)).toBe(false);
    const twice = release(once);
    expect(caughtUp(twice)).toBe(true);
    expect(twice.shown).toStrictEqual(stop.state);
  });

  it("the rider values are in the state after the turn-end beat", () => {
    const { state, playback } = played([...START, R(0, 2, 1)]);
    const shown = release(receive(playback, next(state, S(0)).events)).shown;
    expect(shown.acting).toBeNull();
    expect(shown.round).toMatchObject({
      rollLimit: 1,
      pot: 2,
      finished: [{ seat: 0, hand: "2-1" }],
    });
  });

  it("releasing an empty queue returns the same object", () => {
    const { playback } = played(START);
    expect(caughtUp(playback)).toBe(true);
    expect(release(playback)).toBe(playback);
  });

  it("the fold of the queue from shown equals the engine state", () => {
    const { state, playback } = played(ROUND_ONE.slice(0, -1));
    const last = next(state, ROUND_ONE[ROUND_ONE.length - 1]);
    const queued = receive(playback, last.events);
    expect(
      queued.queue.reduce<GameState>(applyEvent, queued.shown),
    ).toStrictEqual(last.state);
  });

  it("a queued roundStarted does not trim until released", () => {
    const { state, playback } = played(ROUND_ONE);
    const queued = receive(playback, next(state, NEXT).events);
    // Round 1 is still on screen, roll to start and all.
    expect(queued.released[0].type).toBe("gameStarted");
    const shownRound2 = release(queued);
    expect(shownRound2.released.map((e) => e.type)).toStrictEqual([
      "roundStarted",
      "turnStarted",
    ]);
  });

  it("round 1 keeps the roll to start; gameStarted empties the log", () => {
    const { playback } = played(START);
    expect(playback.released.map((e) => e.type).slice(0, 3)).toStrictEqual([
      "gameStarted",
      "rollOffStarted",
      "turnStarted",
    ]);
    expect(playback.released.at(-2)?.type).toBe("roundStarted");

    // A point limit of 1: round one ends the game.
    const over = played(ROUND_ONE, { seats: 4, pointLimit: 1 });
    expect(over.state.phase.kind).toBe("gameOver");
    const queued = receive(over.playback, next(over.state, NEW).events);
    expect(queued.released[0].type).toBe("gameStarted");
    expect(queued.released.at(-1)?.type).toBe("gameEnded");
    const restarted = release(queued);
    expect(restarted.released.map((e) => e.type)).toStrictEqual([
      "gameStarted",
      "rollOffStarted",
      "turnStarted",
    ]);
    expect(restarted.released[0].seq).toBe(over.playback.seq + 1);
  });
});
