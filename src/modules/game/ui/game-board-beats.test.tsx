// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { NextIntlClientProvider } from "next-intl";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { select, type Action, type Die, type Seat } from "../engine";
import * as fixtures from "../testing";
import {
  batchActions,
  beatFixtures,
  fixtureSession,
  simulateGame,
  viewerRolledKeepable,
  viewerKeptOne,
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

const roll = (seat: Seat, ...values: Die[]): Action => ({
  type: "roll",
  seat,
  values,
  reason: null,
});

/** The announcer, and the visible status line just before it. */
function statusNodes() {
  const announcer = screen.getByRole("status");
  const visible = announcer.previousElementSibling;
  if (!(visible instanceof HTMLParagraphElement)) {
    throw new Error("The visible status line is not just before the announcer");
  }
  return { announcer, visible, text: announcer.querySelector("p") };
}

const LIVE = "[role=status], [role=alert], [role=log], [aria-live]";

describe("live region", () => {
  it("exactly one element matches [role=status], [role=alert], [role=log], [aria-live]", () => {
    for (const fixture of [
      fixtures.notStarted,
      fixtures.beatGameStart,
      fixtures.botMidTurn,
      fixtures.beatTieBreakOpens,
      fixtures.roundSummary,
      fixtures.gameOverDraw,
    ]) {
      const { container } = render(board(fixture));
      expect(container.querySelectorAll(LIVE)).toHaveLength(1);
      cleanup();
    }
  });

  it("the region exists before Start with no content", () => {
    render(board(fixtures.notStarted));
    const { announcer, visible } = statusNodes();
    expect(announcer.textContent).toBe("");
    expect(visible.textContent).toBe("");
  });
});

describe("announcer", () => {
  it("Start announces the explanation and You roll first", () => {
    render(board(fixtures.beatGameStart));
    expect(statusNodes().announcer.textContent).toBe(
      "Each player rolls one die. The highest starts the first round. You roll first",
    );
  });

  it("one new node per beat, text equal to the visible line", () => {
    const beats = beatsOf(2);
    const { rerender } = render(board(beats[0]));
    let previous = statusNodes().text;
    for (const [index, fixture] of beats.slice(1).entries()) {
      rerender(board(fixture));
      const { text, visible } = statusNodes();
      // Seat 0 is the viewer: their keeps are silent and keep the node.
      const beat = select.lastBeat(fixture.events);
      const silent =
        beat !== null &&
        (beat.kind === "keepSet" || beat.kind === "keepSwapped") &&
        beat.seat === 0;
      if (silent) expect(text, `beat ${index + 1}`).toBe(previous);
      else expect(text, `beat ${index + 1}`).not.toBe(previous);
      expect(text?.textContent, `beat ${index + 1}`).toBe(visible.textContent);
      previous = text;
    }
  });

  it("a viewer keep leaves the same <p> node with the same text", () => {
    const { rerender } = render(board(viewerRolledKeepable));
    const before = statusNodes().text;
    const words = before?.textContent;
    rerender(board(viewerKeptOne));
    expect(statusNodes().text).toBe(before);
    expect(statusNodes().text?.textContent).toBe(words);
  });

  it("identical consecutive texts are different nodes", () => {
    // The viewer rolls 5-2, then 2-5: two beats that read the same.
    const beats = beatFixtures([
      { type: "newGame" },
      roll(0, 6),
      roll(1, 3),
      roll(2, 2),
      roll(3, 1),
      roll(0, 5, 2),
      roll(0, 2, 5),
    ]);
    const [first, second] = beats.slice(-2);
    const { rerender } = render(board(first));
    const before = statusNodes().text;
    rerender(board(second));
    expect(statusNodes().text).not.toBe(before);
    expect(statusNodes().text?.textContent).toBe(before?.textContent);
  });
});

describe("status", () => {
  it("the visible line equals the announcer text after every beat", () => {
    for (const fixture of beatsOf(3)) {
      render(board(fixture));
      const { announcer, visible } = statusNodes();
      expect(announcer.textContent).toBe(visible.textContent);
      cleanup();
    }
  });

  it("the status line sits between the heading and the tray, and the heading still names the acting seat", () => {
    render(board(fixtures.botMidTurn));
    const { announcer, visible } = statusNodes();
    const heading = screen.getByRole("heading", { level: 2, name: /Player 2/ });
    expect(visible.previousElementSibling?.contains(heading)).toBe(true);
    expect(
      announcer.nextElementSibling?.contains(
        screen.getByRole("button", { name: "Roll" }),
      ),
    ).toBe(true);
    expect(visible.textContent).toContain("Player 2");
  });

  it("with nobody acting, the heading names the seat alone", () => {
    render(board(fixtures.beatNoRollsLeft));
    const heading = screen.getByRole("heading", { level: 2, name: /Player 2/ });
    expect(heading.textContent).not.toMatch(/Rolling now/);
  });
});

describe("focus", () => {
  it.each(["Roll", "Stop"])(
    "activeElement is stable across every beat (%s)",
    (name) => {
      const beats = beatsOf(4);
      const { rerender } = render(board(beats[0]));
      const control = screen.getByRole("button", { name });
      act(() => control.focus());
      for (const fixture of beats) {
        rerender(board(fixture));
        expect(document.activeElement).toBe(control);
      }
    },
  );
});
