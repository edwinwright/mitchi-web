// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { NextIntlClientProvider } from "next-intl";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Pacing } from "../engine";
import { PacingControls } from "./pacing-controls";

// Read with node:fs: a relative import of messages/en.json would climb out of the module.
const messages = JSON.parse(readFileSync("messages/en.json", "utf8")) as Record<
  string,
  unknown
>;

afterEach(cleanup);

function renderControls(overrides: Partial<Pacing> = {}) {
  const pacing: Pacing = {
    paused: false,
    speed: "normal",
    canStep: false,
    pause: vi.fn(),
    resume: vi.fn(),
    step: vi.fn(),
    setSpeed: vi.fn(),
    ...overrides,
  };
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <PacingControls pacing={pacing} />
    </NextIntlClientProvider>,
  );
  return pacing;
}

describe("PacingControls", () => {
  it("is one group, named by its visible heading", () => {
    renderControls();
    expect(screen.getByRole("group", { name: "Pace" })).toBeTruthy();
  });

  it("names each icon button, and the name follows the state", () => {
    renderControls();
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Step" })).toBeTruthy();
    cleanup();
    renderControls({ paused: true });
    const resume = screen.getByRole("button", { name: "Resume" });
    expect(resume.getAttribute("aria-pressed")).toBeNull();
  });

  it("labels the speed dropdown, with Slow, Normal and Fast", () => {
    renderControls();
    const select = screen.getByRole("combobox", { name: "Speed" });
    const options = [...select.querySelectorAll("option")].map(
      (option) => option.textContent,
    );
    expect(options).toEqual(["Slow", "Normal", "Fast"]);
  });

  it("sets the speed to slow when Slow is chosen", () => {
    const pacing = renderControls();
    fireEvent.change(screen.getByRole("combobox", { name: "Speed" }), {
      target: { value: "slow" },
    });
    expect(pacing.setSpeed).toHaveBeenCalledWith("slow");
  });
});
