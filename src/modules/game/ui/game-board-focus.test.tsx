// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { NextIntlClientProvider } from "next-intl";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameSession } from "../engine";
import {
  botKept,
  botMidTurn,
  fixtureSession,
  gameOverUnique,
  notStarted,
  roundSummary,
  viewerToRoll,
  type Fixture,
} from "../testing";
import { GameBoard } from "./game-board";

// Read with node:fs: a relative import of messages/en.json would climb out of the module.
const messages = JSON.parse(readFileSync("messages/en.json", "utf8")) as Record<
  string,
  unknown
>;

afterEach(cleanup);

function board(session: GameSession) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <GameBoard session={session} />
    </NextIntlClientProvider>
  );
}

/** A fixture session whose intents are spies, so a test can see what was sent. */
function spied(fixture: Fixture) {
  const session = fixtureSession(fixture);
  const intents = {
    roll: vi.fn(),
    setKeep: vi.fn(),
    stop: vi.fn(),
    nextRound: vi.fn(),
    newGame: vi.fn(),
  };
  return { session: { ...session, intents }, intents };
}

const button = (name: string) => screen.getByRole("button", { name });

describe("focus handoff", () => {
  it.each([
    ["Start", notStarted, "newGame"],
    ["Next round", roundSummary, "nextRound"],
    ["Play again", gameOverUnique, "newGame"],
  ] as const)(
    "%s: focus lands on Roll once the next commit arrives",
    (name, from, intent) => {
      const first = spied(from);
      const { rerender } = render(board(first.session));
      fireEvent.click(button(name));
      expect(first.intents[intent]).toHaveBeenCalledOnce();

      rerender(board(fixtureSession(viewerToRoll)));
      expect(document.activeElement).toBe(button("Roll"));
    },
  );

  it("a later bot step does not move focus", () => {
    const first = spied(notStarted);
    const { rerender } = render(board(first.session));
    fireEvent.click(button("Start"));
    rerender(board(fixtureSession(botMidTurn)));
    expect(document.activeElement).toBe(button("Roll"));

    // The reader moves on. Further bot steps must leave focus where it is.
    const log = screen.getByRole("log");
    log.focus();
    rerender(board(fixtureSession(botKept)));
    rerender(board(fixtureSession(botMidTurn)));
    expect(document.activeElement).toBe(log);
  });

  it("a no-op intent does not leave the flag set to steal focus later", () => {
    const first = spied(notStarted);
    const { rerender } = render(board(first.session));
    fireEvent.click(button("Start"));
    // The intent changed nothing, but the board commits again (Roll is not mounted yet).
    rerender(board(first.session));
    expect(document.activeElement).toBe(document.body);

    // A later commit that does mount Roll must not pull focus to it.
    rerender(board(fixtureSession(viewerToRoll)));
    expect(document.activeElement).not.toBe(button("Roll"));
  });

  it("clicking Roll does not move focus", () => {
    const { session } = spied(viewerToRoll);
    const { rerender } = render(board(session));
    button("Roll").focus();
    fireEvent.click(button("Roll"));
    rerender(board(fixtureSession(botMidTurn)));
    expect(document.activeElement).toBe(button("Roll"));
  });

  it("an unavailable control keeps focus and ignores Enter-style clicks", () => {
    const { session, intents } = spied(botMidTurn);
    render(board(session));
    const roll = button("Roll");
    expect(roll.getAttribute("aria-disabled")).toBe("true");
    roll.focus();
    fireEvent.click(roll);
    expect(intents.roll).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(roll);
  });
});
