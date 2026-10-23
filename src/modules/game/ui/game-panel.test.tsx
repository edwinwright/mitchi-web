// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { NextIntlClientProvider } from "next-intl";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  fixtureSession,
  gameOverDraw,
  roundSummary,
  type Fixture,
} from "../testing";
import { sliceSession } from "./board-slices";
import { GamePanel } from "./game-panel";

// Read with node:fs: a relative import of messages/en.json would climb out of the module.
const messages = JSON.parse(readFileSync("messages/en.json", "utf8")) as Record<
  string,
  unknown
>;

afterEach(cleanup);

/** Each Points row as a screen reader reads it, hidden commas included. */
function rowTexts(fixture: Fixture) {
  const session = fixtureSession(fixture);
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <GamePanel
        data={sliceSession(session).points}
        viewerSeat={session.view.viewerSeat}
      />
    </NextIntlClientProvider>,
  );
  return screen.getAllByRole("listitem").map((row) => row.textContent);
}

describe("GamePanel", () => {
  it("reads a winner's row from the seat, with no comma before it", () => {
    const texts = rowTexts(gameOverDraw);
    expect(texts[0]).toMatch(/^You, Winner, Points \d+$/);
    for (const text of texts) expect(text).not.toMatch(/^,/);
  });

  it("reads a leader's mark first, then the seat", () => {
    expect(rowTexts(roundSummary)[0]).toMatch(/^Leader, You, Points 0$/);
  });
});
