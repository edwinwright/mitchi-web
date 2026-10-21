import { describe, expect, it } from "vitest";
import { notStarted, rollOff, tieBreakViewerToRoll } from "../testing";
import { botDelay, DELAY_MS, HANDOVER_MS, isHandover } from "./pacing";

describe("isHandover", () => {
  it("is true when the latest step ended a turn and started the next", () => {
    expect(tieBreakViewerToRoll.events.at(-1)?.type).toBe("turnStarted");
    expect(isHandover(tieBreakViewerToRoll.events)).toBe(true);
  });

  it("is false before a game, and in the roll-off", () => {
    expect(isHandover(notStarted.events)).toBe(false);
    expect(isHandover(rollOff.events)).toBe(false);
  });
});

describe("botDelay", () => {
  it("adds the handover beat only after a turn ends", () => {
    expect(botDelay(tieBreakViewerToRoll.events, "normal")).toBe(
      DELAY_MS.normal + HANDOVER_MS.normal,
    );
    expect(botDelay(rollOff.events, "fast")).toBe(DELAY_MS.fast);
  });
});
