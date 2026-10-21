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
  tieBreakRunning,
  tieBreakViewerToRoll,
  viewerRolledKeepable,
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

describe("the Roll and Stop nodes", () => {
  it("Last roll ends the round: focus stays on the same node, now Next round", () => {
    const { rerender } = render(board(fixtureSession(viewerRolledKeepable)));
    const roll = button("Roll");
    roll.focus();
    rerender(board(fixtureSession(roundSummary)));
    expect(document.activeElement).toBe(roll);
    expect(button("Next round")).toBe(roll);
  });

  it("Stop ends the game: focus stays on Stop, which then does nothing", () => {
    const { rerender } = render(board(fixtureSession(viewerRolledKeepable)));
    const stop = button("Stop");
    stop.focus();
    const over = spied(gameOverUnique);
    rerender(board(over.session));
    expect(document.activeElement).toBe(stop);
    expect(stop.getAttribute("aria-disabled")).toBe("true");
    // A double press must not turn into Play again and wipe the result.
    fireEvent.click(stop);
    for (const intent of Object.values(over.intents)) {
      expect(intent).not.toHaveBeenCalled();
    }
  });

  it("The game ends in a tie-break: the Roll node becomes Play again", () => {
    const { rerender } = render(board(fixtureSession(tieBreakViewerToRoll)));
    const roll = button("Roll");
    roll.focus();
    rerender(board(fixtureSession(gameOverUnique)));
    expect(document.activeElement).toBe(roll);
    expect(button("Play again")).toBe(roll);
  });

  it("Node identity: the same two elements in every phase, never disabled", () => {
    const phases: [Fixture, string][] = [
      [notStarted, "Start"],
      [viewerToRoll, "Roll"],
      [botMidTurn, "Roll"],
      [tieBreakRunning, "Roll"],
      [roundSummary, "Next round"],
      [gameOverUnique, "Play again"],
    ];
    const { rerender } = render(board(fixtureSession(notStarted)));
    const roll = button("Start");
    const stop = button("Stop");
    for (const [fixture, label] of phases) {
      rerender(board(fixtureSession(fixture)));
      expect(button(label)).toBe(roll);
      expect(button("Stop")).toBe(stop);
      expect(roll.hasAttribute("disabled")).toBe(false);
      expect(stop.hasAttribute("disabled")).toBe(false);
    }
  });

  it("bot dice: the Keep buttons are named Keep, not by face, and unavailable", () => {
    render(board(fixtureSession(botMidTurn)));
    const keeps = screen.getAllByRole("button", { name: "Keep" });
    expect(keeps).toHaveLength(2);
    for (const keep of keeps) {
      expect(keep.getAttribute("aria-disabled")).toBe("true");
    }
    expect(screen.queryByRole("button", { name: /^Keep the/ })).toBeNull();
  });

  it("the viewer's own dice name their faces", () => {
    render(board(fixtureSession(viewerRolledKeepable)));
    expect(button("Keep the 5")).toBeTruthy();
    expect(button("Keep the 2")).toBeTruthy();
  });
});

describe("the players card", () => {
  it("players card does not switch: game over leaves it on the view the user chose", () => {
    const { rerender } = render(board(fixtureSession(viewerRolledKeepable)));
    const points = button("Points");
    fireEvent.click(points);
    expect(points.getAttribute("aria-pressed")).toBe("true");

    rerender(board(fixtureSession(gameOverUnique)));
    expect(button("Points")).toBe(points);
    expect(points.getAttribute("aria-pressed")).toBe("true");
    expect(button("This round").getAttribute("aria-pressed")).toBe("false");
  });

  it("players card does not switch to Points at game over by itself", () => {
    const { rerender } = render(board(fixtureSession(viewerRolledKeepable)));
    rerender(board(fixtureSession(gameOverUnique)));
    expect(button("This round").getAttribute("aria-pressed")).toBe("true");
  });

  it("switching views leaves focus on the switch", () => {
    render(board(fixtureSession(botMidTurn)));
    const points = button("Points");
    points.focus();
    fireEvent.click(points);
    expect(document.activeElement).toBe(points);
  });
});
