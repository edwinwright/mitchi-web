// @vitest-environment jsdom
import { StrictMode, type ReactNode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VIEWER_SEAT } from "./config";
import { DELAY_MS, ROLL_LOCK_MS } from "./pacing";
import { useLocalSession } from "./use-local-session";

// The roll-off: the viewer's 6 beats the bots' 3, 2 and 1, so the viewer starts.
// After that the dice are all 3-2, which no test depends on.
const dice = vi.hoisted(() => ({ queue: [] as [number, number][] }));
vi.mock("./random", () => ({
  rollSpare: vi.fn(() => dice.queue.shift() ?? [3, 2]),
}));

beforeEach(() => {
  vi.useFakeTimers();
  dice.queue = [
    [6, 1],
    [3, 1],
    [2, 1],
    [1, 1],
  ];
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const strict = ({ children }: { children: ReactNode }) => (
  <StrictMode>{children}</StrictMode>
);

/** Bot actions so far: roll-off rolls by anyone but the viewer. */
function botRolls(session: ReturnType<typeof useLocalSession>) {
  return session.view.events.filter(
    (event) => event.type === "rollOffRolled" && event.seat !== VIEWER_SEAT,
  ).length;
}

/** Starts a game and rolls for the viewer, then lets the roll lock lapse. */
function startAndRoll(options?: Parameters<typeof renderHook>[1]) {
  const hook = renderHook(() => useLocalSession(), options);
  act(() => hook.result.current.intents.newGame());
  act(() => hook.result.current.intents.roll());
  act(() => {
    vi.advanceTimersByTime(ROLL_LOCK_MS);
  });
  return hook as unknown as ReturnType<
    typeof renderHook<ReturnType<typeof useLocalSession>, unknown>
  >;
}

describe("useLocalSession", () => {
  it("starts deterministically, with no timer and pacing present", () => {
    const { result } = renderHook(() => useLocalSession());
    expect(result.current.view.state.phase.kind).toBe("notStarted");
    expect(result.current.view.pending).toBe(false);
    expect(result.current.pacing).toBeDefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("roll lock: pending for ROLL_LOCK_MS after a viewer roll, and no other intent sets it", () => {
    const { result } = renderHook(() => useLocalSession());
    act(() => result.current.intents.newGame());
    expect(result.current.view.pending).toBe(false);

    act(() => result.current.intents.roll());
    expect(result.current.view.pending).toBe(true);
    act(() => {
      vi.advanceTimersByTime(ROLL_LOCK_MS - 1);
    });
    expect(result.current.view.pending).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.view.pending).toBe(false);
  });

  it("roll lock: a second roll inside the window draws no dice", async () => {
    const { rollSpare } = await import("./random");
    const { result } = renderHook(() => useLocalSession());
    act(() => result.current.intents.newGame());
    vi.mocked(rollSpare).mockClear();
    act(() => {
      result.current.intents.roll();
      result.current.intents.roll();
    });
    expect(rollSpare).toHaveBeenCalledTimes(1);
  });

  it("a bot moves after the pacing delay, once", () => {
    const { result } = startAndRoll();
    expect(botRolls(result.current)).toBe(0);
    act(() => {
      vi.advanceTimersByTime(DELAY_MS.normal);
    });
    expect(botRolls(result.current)).toBe(1);
  });

  it("step: applies exactly one bot action per call while paused, including after re-renders", () => {
    const { result } = startAndRoll();
    act(() => result.current.pacing!.pause());
    expect(result.current.pacing!.canStep).toBe(true);

    for (const expected of [1, 2, 3]) {
      act(() => result.current.pacing!.step());
      expect(botRolls(result.current)).toBe(expected);
    }
    // The next move is the viewer's: nothing to step to.
    expect(result.current.pacing!.canStep).toBe(false);
    act(() => result.current.pacing!.step());
    expect(botRolls(result.current)).toBe(3);
  });

  it("step: does nothing unless paused", () => {
    const { result } = startAndRoll();
    act(() => result.current.pacing!.step());
    expect(botRolls(result.current)).toBe(0);
  });

  it("step: two calls before a render apply one action", () => {
    const { result } = startAndRoll();
    act(() => result.current.pacing!.pause());
    act(() => {
      result.current.pacing!.step();
      result.current.pacing!.step();
    });
    expect(botRolls(result.current)).toBe(1);
  });

  it("pause: clears the timer, and resume schedules exactly one new one", () => {
    const { result } = startAndRoll();
    expect(vi.getTimerCount()).toBe(1);
    act(() => result.current.pacing!.pause());
    expect(vi.getTimerCount()).toBe(0);
    act(() => {
      vi.advanceTimersByTime(DELAY_MS.normal * 3);
    });
    expect(botRolls(result.current)).toBe(0);

    act(() => result.current.pacing!.resume());
    expect(vi.getTimerCount()).toBe(1);
    act(() => {
      vi.advanceTimersByTime(DELAY_MS.normal);
    });
    expect(botRolls(result.current)).toBe(1);
  });

  it("speed: changing it restarts the delay with one timer", () => {
    const { result } = startAndRoll();
    act(() => {
      vi.advanceTimersByTime(500); // well inside the delay, after the lock lapsed
    });
    act(() => result.current.pacing!.setSpeed("fast"));
    expect(vi.getTimerCount()).toBe(1);
    act(() => {
      vi.advanceTimersByTime(DELAY_MS.fast);
    });
    expect(botRolls(result.current)).toBe(1);
  });

  it("unmount: no timer or lock outlives the hook", () => {
    const { result, unmount } = renderHook(() => useLocalSession());
    act(() => result.current.intents.newGame());
    act(() => result.current.intents.roll());
    // The bot timer and the roll lock are both pending.
    expect(vi.getTimerCount()).toBe(2);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("StrictMode: double-invoked effects leave one bot step scheduled", () => {
    const { result } = startAndRoll({ wrapper: strict });
    expect(vi.getTimerCount()).toBe(1);
    act(() => {
      vi.advanceTimersByTime(DELAY_MS.normal);
    });
    expect(botRolls(result.current)).toBe(1);
  });

  it("StrictMode: unmount leaves no timer", () => {
    const { result, unmount } = renderHook(() => useLocalSession(), {
      wrapper: strict,
    });
    act(() => result.current.intents.newGame());
    act(() => result.current.intents.roll());
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
