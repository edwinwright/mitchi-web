// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { NextIntlClientProvider } from "next-intl";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CommentaryRowView } from "./commentary-row";

// Read with node:fs: a relative import of messages/en.json would climb out of the module.
const messages = JSON.parse(readFileSync("messages/en.json", "utf8")) as Record<
  string,
  unknown
>;

afterEach(cleanup);

describe("CommentaryRowView", () => {
  it("reads a row with a hand as one phrase, with no empty item for the dice", () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <CommentaryRowView
          row={{
            kind: "action",
            key: "1",
            seat: 1,
            voice: "player",
            shown: { kind: "hand", dice: [6, 6], hand: "6-6" },
            phrase: { type: "stop" },
            reason: null,
          }}
          viewerSeat={0}
        />
      </NextIntlClientProvider>,
    );
    expect(container.textContent).toBe("Player 2, double-six, Stops");
  });
});
