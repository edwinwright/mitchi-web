// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { NextIntlClientProvider } from "next-intl";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameSession, Pacing } from "../engine";
import {
  fixtureSession,
  secondTieBreak,
  tieBreakRunning,
  tieBreakViewerToRoll,
} from "../testing";
import { GameBoard } from "./game-board";
import { HOLD_MS } from "./hold";

// Read with node:fs: a relative import of messages/en.json would climb out of the module.
const messages = JSON.parse(readFileSync("messages/en.json", "utf8")) as Record<
  string,
  unknown
>;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function board(session: GameSession) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <GameBoard session={session} />
    </NextIntlClientProvider>
  );
}

const noop = () => {};
const fast: Pacing = {
  paused: false,
  speed: "fast",
  canStep: false,
  pause: noop,
  resume: noop,
  step: noop,
  setSpeed: noop,
};

/** Whether the Keep buttons show dice, rather than dotted placeholders. */
function keepsShowDice() {
  const keeps = screen.getAllByRole("button", { name: /^Keep/ });
  expect(keeps).toHaveLength(2);
  const withDie = keeps.filter((keep) => keep.querySelector("svg") !== null);
  // Both or neither: a hold shows a whole hand.
  expect([0, 2]).toContain(withDie.length);
  return withDie.length === 2;
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("the dice hold", () => {
  it("hold then placeholders: a bot's last roll stays for the hold, then the next turn shows placeholders", () => {
    // Seat 1's one tie-break roll ends its turn; the viewer is up next.
    const { rerender } = render(board(fixtureSession(tieBreakRunning)));
    rerender(board(fixtureSession(tieBreakViewerToRoll)));
    expect(keepsShowDice()).toBe(true);

    advance(HOLD_MS.normal - 1);
    expect(keepsShowDice()).toBe(true);

    advance(1);
    expect(keepsShowDice()).toBe(false);
  });

  it("roll during hold: Roll sends the intent at once", () => {
    const session = fixtureSession(tieBreakViewerToRoll);
    const roll = vi.fn();
    render(board({ ...session, intents: { ...session.intents, roll } }));
    expect(keepsShowDice()).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Roll" }));
    expect(roll).toHaveBeenCalledOnce();
  });

  it("fast: the hold lasts the fast length", () => {
    render(board(fixtureSession(tieBreakViewerToRoll, { pacing: fast })));
    advance(HOLD_MS.fast - 1);
    expect(keepsShowDice()).toBe(true);
    advance(1);
    expect(keepsShowDice()).toBe(false);
  });

  it("with no pacing (online), holds for the normal length", () => {
    render(board(fixtureSession(tieBreakViewerToRoll, { pacing: null })));
    advance(HOLD_MS.normal - 1);
    expect(keepsShowDice()).toBe(true);
    advance(1);
    expect(keepsShowDice()).toBe(false);
  });

  it("a newer roll restarts the hold", () => {
    const { rerender } = render(board(fixtureSession(tieBreakViewerToRoll)));
    advance(HOLD_MS.normal - 200);
    // The viewer matches 4-3: a second tie-break starts, the viewer to roll.
    rerender(board(fixtureSession(secondTieBreak)));
    advance(HOLD_MS.normal - 1);
    expect(keepsShowDice()).toBe(true);
    advance(1);
    expect(keepsShowDice()).toBe(false);
  });

  it("paused with a bot due: a held roll stays until play resumes", () => {
    const paused = {
      ...fast,
      speed: "normal" as const,
      paused: true,
      canStep: true,
    };
    const { rerender } = render(
      board(fixtureSession(tieBreakViewerToRoll, { pacing: paused })),
    );
    advance(HOLD_MS.normal * 5);
    expect(keepsShowDice()).toBe(true);

    rerender(
      board(
        fixtureSession(tieBreakViewerToRoll, {
          pacing: { ...paused, paused: false, canStep: false },
        }),
      ),
    );
    advance(HOLD_MS.normal);
    expect(keepsShowDice()).toBe(false);
  });

  it("paused with the viewer next: the hold runs out, so their turn is not shown a bot's dice", () => {
    const paused = { ...fast, speed: "normal" as const, paused: true };
    render(board(fixtureSession(tieBreakViewerToRoll, { pacing: paused })));
    expect(keepsShowDice()).toBe(true);
    advance(HOLD_MS.normal);
    expect(keepsShowDice()).toBe(false);
  });

  it("names who rolled the held dice, since the header names who is next", () => {
    render(board(fixtureSession(tieBreakViewerToRoll)));
    const rows = screen
      .getAllByText("four-three")
      .map((element) => element.closest("p")?.textContent);
    expect(rows).toContain("Player 2, four-three");
  });

  it("clears its timer on unmount", () => {
    const { unmount } = render(board(fixtureSession(tieBreakViewerToRoll)));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
