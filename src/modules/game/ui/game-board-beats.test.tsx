// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { NextIntlClientProvider } from "next-intl";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Action } from "../engine";
import * as fixtures from "../testing";
import {
  batchActions,
  beatFixtures,
  fixtureSession,
  simulateGame,
  type Fixture,
} from "../testing";
import { GameBoard } from "./game-board";

// Read with node:fs: a relative import of messages/en.json would climb out of the module.
const messages = JSON.parse(readFileSync("messages/en.json", "utf8")) as Record<
  string,
  unknown
>;

afterEach(cleanup);

function board(fixture: Fixture) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <GameBoard session={fixtureSession(fixture)} />
    </NextIntlClientProvider>
  );
}

/** Every beat of a seeded bot game, as the session releases them. */
function beatsOf(seed: number): readonly Fixture[] {
  const actions: Action[] = [];
  simulateGame(seed, {
    onStep: ({ action, result }) => {
      if (result.ok) actions.push(action);
    },
  });
  return beatFixtures(batchActions(actions));
}

describe("every beat renders", () => {
  it.each([1, 2, 3])(
    "seed %i: the board renders at every released beat",
    (seed) => {
      const beats = beatsOf(seed);
      expect(beats.some((f) => f.caughtUp === false)).toBe(true);
      for (const [index, fixture] of beats.entries()) {
        expect(() => render(board(fixture)), `beat ${index}`).not.toThrow();
        cleanup();
      }
    },
  );

  it("the board renders at every named fixture", () => {
    const named = Object.entries(fixtures).filter(
      (entry): entry is [string, Fixture] =>
        typeof entry[1] === "object" &&
        "events" in entry[1] &&
        "state" in entry[1],
    );
    for (const [name, fixture] of named) {
      expect(() => render(board(fixture)), name).not.toThrow();
      cleanup();
    }
  });
});
