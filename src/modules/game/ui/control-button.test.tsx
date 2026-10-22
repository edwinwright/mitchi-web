// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ControlButton } from "./control-button";

afterEach(cleanup);

describe("key repeat", () => {
  it("a repeated Enter keydown is prevented", () => {
    const onPress = vi.fn();
    render(<ControlButton onPress={onPress}>Roll</ControlButton>);
    const button = screen.getByRole("button", { name: "Roll" });
    // fireEvent returns false when the default was prevented.
    expect(fireEvent.keyDown(button, { key: "Enter", repeat: true })).toBe(
      false,
    );
    expect(fireEvent.keyDown(button, { key: "Enter", repeat: false })).toBe(
      true,
    );
  });

  it("a repeated Tab keydown is not prevented", () => {
    render(<ControlButton onPress={vi.fn()}>Roll</ControlButton>);
    const button = screen.getByRole("button", { name: "Roll" });
    expect(fireEvent.keyDown(button, { key: "Tab", repeat: true })).toBe(true);
  });
});
