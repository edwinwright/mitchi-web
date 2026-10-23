// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { NextIntlClientProvider } from "next-intl";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { rankedGroups } from "@/data/hands";
import { botMidTurn, fixtureSession, type Fixture } from "../testing";
import { sliceSession } from "./board-slices";
import { RoundByHand } from "./round-by-hand";

// Read with node:fs: a relative import of messages/en.json would climb out of the module.
const messages = JSON.parse(readFileSync("messages/en.json", "utf8")) as {
  hands: Record<string, string>;
  handGroups: Record<string, { name: string }>;
};

afterEach(cleanup);

function renderByHand(fixture: Fixture) {
  const session = fixtureSession(fixture);
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <RoundByHand
        rows={sliceSession(session).roundRows}
        viewerSeat={session.view.viewerSeat}
      />
    </NextIntlClientProvider>,
  );
}

describe("RoundByHand", () => {
  it("lists the hands in the order and groups of rankedGroups()", () => {
    renderByHand(botMidTurn);
    const groups = rankedGroups();

    expect(
      screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent),
    ).toEqual(groups.map(({ group }) => messages.handGroups[group].name));

    const lists = screen.getAllByRole("list");
    expect(lists).toHaveLength(groups.length);
    lists.forEach((list, index) => {
      const names = within(list)
        .getAllByRole("listitem")
        .map(
          (item) =>
            item.querySelector(":scope > span:not([aria-hidden])")?.textContent,
        );
      expect(names).toEqual(
        groups[index].hands.map((hand) => messages.hands[hand.id]),
      );
    });
  });

  it("names every holder, and the worst hand so far", () => {
    renderByHand(botMidTurn);
    // The viewer holds 6-3, the worst so far; seat 1 is rolling 4-2.
    const sixThree = screen.getByText(messages.hands["6-3"]).closest("li");
    expect(sixThree?.textContent).toContain("You");
    expect(sixThree?.textContent).toContain("Worst hand so far");
    const fourTwo = screen.getByText(messages.hands["4-2"]).closest("li");
    expect(fourTwo?.textContent).toContain("Player 2");
    expect(fourTwo?.textContent).toContain("Rolling now");
  });
});
