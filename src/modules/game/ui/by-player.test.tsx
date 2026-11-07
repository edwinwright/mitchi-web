// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { NextIntlClientProvider } from "next-intl";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  botMidTurn,
  fixtureSession,
  gameOverDraw,
  gameOverUnique,
  roundSummary,
  tieBreakViewerToRoll,
  type Fixture,
} from "../testing";
import { sliceSession } from "./board-slices";
import { ByPlayer } from "./by-player";

// Read with node:fs: a relative import of messages/en.json would climb out of the module.
const messages = JSON.parse(readFileSync("messages/en.json", "utf8")) as Record<
  string,
  unknown
>;

afterEach(cleanup);

function renderByPlayer(fixture: Fixture) {
  const session = fixtureSession(fixture);
  const slices = sliceSession(session);
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ByPlayer
        bar={slices.roundBar}
        roundRows={slices.roundRows}
        points={slices.points}
        viewerSeat={session.view.viewerSeat}
      />
    </NextIntlClientProvider>,
  );
  return slices;
}

/** What a screen reader reads: hidden commas in, aria-hidden text out. */
function spoken(element: Element) {
  const copy = element.cloneNode(true) as Element;
  for (const hidden of copy.querySelectorAll("[aria-hidden]")) hidden.remove();
  return copy.textContent;
}

/** Each card as a screen reader reads it. */
function cardTexts(fixture: Fixture) {
  renderByPlayer(fixture);
  return screen.getAllByRole("listitem").map(spoken);
}

describe("ByPlayer", () => {
  it("pairs each seat's round with its points, in seat order", () => {
    for (const fixture of [botMidTurn, tieBreakViewerToRoll, gameOverDraw]) {
      const { roundRows, points } = renderByPlayer(fixture);
      expect(points.rows.map((row) => row.seat)).toEqual(
        roundRows.map((row) => row.seat),
      );
      expect(screen.getAllByRole("listitem")).toHaveLength(roundRows.length);
      cleanup();
    }
  });

  it("reads the round, then the game: a leader", () => {
    expect(cardTexts(roundSummary)[0]).toMatch(
      /^Seat 1, (Starting player, )?You, .*Leader, Points 0 of \d+$/,
    );
  });

  it("reads the seat even where the starting chip replaces its number", () => {
    expect(cardTexts(botMidTurn)[0]).toMatch(/^Seat 1, Starting player, You, /);
  });

  it("reads a seat with no dice yet with no empty item", () => {
    for (const text of cardTexts(botMidTurn)) {
      expect(text).not.toMatch(/, ,/);
    }
    expect(cardTexts(botMidTurn)).toContain("Seat 3, Player 3, Points 0 of 5");
  });

  it("reads the seat, then a winner in place of the starting chip", () => {
    const texts = cardTexts(gameOverDraw);
    expect(texts[0]).toMatch(/^Seat 1, Winner, You(, .+)?, Points \d+ of \d+$/);
    for (const text of texts) expect(text).not.toMatch(/^,/);
  });

  it("marks the seat rolling now as current, and nobody at game over", () => {
    renderByPlayer(botMidTurn);
    const current = screen
      .getAllByRole("listitem")
      .filter((card) => card.getAttribute("aria-current") === "true");
    expect(current).toHaveLength(1);
    expect(spoken(current[0])).toMatch(
      /^Seat 2, (Starting player, )?Player 2, Rolling now/,
    );
    cleanup();

    renderByPlayer(gameOverUnique);
    for (const card of screen.getAllByRole("listitem")) {
      expect(card.hasAttribute("aria-current")).toBe(false);
    }
  });

  it("names the phase in the header: End of round, then Game over", () => {
    renderByPlayer(roundSummary);
    expect(screen.getByText("End of round")).toBeTruthy();
    cleanup();

    renderByPlayer(gameOverUnique);
    expect(screen.getByText("Game over")).toBeTruthy();
  });
});
