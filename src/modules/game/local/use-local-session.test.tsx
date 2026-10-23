// @vitest-environment jsdom
import { StrictMode, type ReactNode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { select, type GameSession } from "../engine";
import { VIEWER_SEAT } from "./config";
import { DELAY_MS, ROLL_MS } from "./pacing";
import { useLocalSession } from "./use-local-session";

// The roll to start: the viewer's 6 beats the bots' 3, 2 and 1, so the viewer starts.
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

type Hook = { result: { current: GameSession } };

/** Distinct beats in the view's log. */
function beatsReleased(session: GameSession) {
  return new Set(session.view.events.map((event) => event.beat)).size;
}

const lastKind = (session: GameSession) =>
  select.lastBeat(session.view.events)?.kind;

function wait(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function render(options?: { wrapper: typeof strict }): Hook {
  return renderHook(() => useLocalSession(), options) as unknown as Hook;
}

/** Starts a game and rolls to start for the viewer: their roll beat is showing. */
function startAndRoll(options?: { wrapper: typeof strict }): Hook {
  const hook = render(options);
  act(() => hook.result.current.intents.newGame());
  act(() => hook.result.current.intents.roll());
  return hook;
}

/** Plays the roll to start through to the viewer's turn in round 1. */
function viewerTurn(): Hook {
  const hook = startAndRoll();
  for (let i = 0; i < 20; i++) {
    const { allowed, view } = hook.result.current;
    if (allowed.roll && view.state.phase.kind === "turn") return hook;
    wait(DELAY_MS.normal);
  }
  throw new Error("The viewer's turn never came");
}

/** The viewer's turn, rolled once and landed: Keep and Stop are available. */
function viewerRolled(): Hook {
  const hook = viewerTurn();
  act(() => hook.result.current.intents.roll());
  wait(ROLL_MS.normal);
  return hook;
}

const rolledEvents = (session: GameSession) =>
  session.view.events.filter(
    (e) =>
      (e.type === "rolled" || e.type === "rollOffRolled") &&
      e.seat === VIEWER_SEAT,
  ).length;

describe("useLocalSession", () => {
  it("starts deterministically, with no timer and pacing present", () => {
    const { result } = render();
    expect(result.current.view.state.phase.kind).toBe("notStarted");
    expect(result.current.view.pending).toBe(false);
    expect(result.current.pacing).toMatchObject({
      speed: "normal",
      paused: false,
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("pending stays false through a roll", () => {
    const { result } = startAndRoll();
    expect(result.current.view.pending).toBe(false);
    wait(ROLL_MS.normal);
    expect(result.current.view.pending).toBe(false);
  });
});

describe("beats", () => {
  it("a bot beat arrives after DELAY_MS.normal and then waits again", () => {
    const { result } = startAndRoll();
    wait(DELAY_MS.normal); // the handover to seat 1
    expect(lastKind(result.current)).toBe("turnStarted");
    const before = beatsReleased(result.current);

    wait(DELAY_MS.normal - 1);
    expect(beatsReleased(result.current)).toBe(before);
    wait(1);
    expect(beatsReleased(result.current)).toBe(before + 1);
    expect(lastKind(result.current)).toBe("rollOffRolled");

    wait(DELAY_MS.normal - 1);
    expect(beatsReleased(result.current)).toBe(before + 1);
    wait(1);
    expect(beatsReleased(result.current)).toBe(before + 2);
  });
});

describe("viewer handover", () => {
  it("Roll is allowed from the handover beat with no timer pending", () => {
    const { result } = viewerTurn();
    expect(lastKind(result.current)).toBe("turnStarted");
    expect(result.current.view.state.acting).toBe(VIEWER_SEAT);
    expect(result.current.allowed.roll).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("Roll straight after the handover is accepted", () => {
    const { result } = viewerTurn();
    act(() => result.current.intents.roll());
    expect(lastKind(result.current)).toBe("rolled");
  });
});

describe("viewer roll", () => {
  it("controls are unavailable for ROLL_MS and available together afterwards", () => {
    const { result } = viewerTurn();
    act(() => result.current.intents.roll());
    expect(result.current.view.rollMs).toBe(ROLL_MS.normal);
    expect(result.current.allowed).toStrictEqual(select.noIntents);
    wait(ROLL_MS.normal - 1);
    expect(result.current.allowed).toStrictEqual(select.noIntents);
    wait(1);
    expect(result.current.allowed).toMatchObject({
      roll: true,
      setKeep: true,
      stop: true,
    });
  });

  it("lock length does not depend on motion preference", () => {
    // Reduced motion: the dice do not animate, but the lock is session code.
    const matchMedia = vi.fn((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    vi.stubGlobal("matchMedia", matchMedia);
    try {
      const { result } = viewerTurn();
      act(() => result.current.intents.roll());
      expect(result.current.view.rollMs).toBe(ROLL_MS.normal);
      wait(ROLL_MS.normal - 1);
      expect(result.current.allowed.stop).toBe(false);
      wait(1);
      expect(result.current.allowed.stop).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("Stop straight after settled is accepted", () => {
    const { result } = viewerRolled();
    act(() => result.current.intents.stop());
    expect(lastKind(result.current)).toBe("turnEnded");
  });

  it("a second roll adds no event", () => {
    const { result } = viewerTurn();
    const before = rolledEvents(result.current);
    act(() => {
      result.current.intents.roll();
      result.current.intents.roll();
    });
    expect(rolledEvents(result.current)).toBe(before + 1);
  });
});

describe("viewer stop", () => {
  it("the turn end is shown for DELAY_MS before the handover", () => {
    const { result } = viewerRolled();
    act(() => result.current.intents.stop());
    expect(result.current.view.rollMs).toBe(0);
    wait(DELAY_MS.normal - 1);
    expect(lastKind(result.current)).toBe("turnEnded");
    expect(result.current.view.state.acting).toBeNull();
    wait(1);
    expect(lastKind(result.current)).toBe("turnStarted");
  });
});

describe("speed", () => {
  it("a change applies from the next beat, not the one waiting", () => {
    const { result } = startAndRoll();
    const before = beatsReleased(result.current);
    wait(300);
    act(() => result.current.pacing!.setSpeed("fast"));
    expect(vi.getTimerCount()).toBeGreaterThanOrEqual(1);
    wait(DELAY_MS.normal - 300 - 1);
    expect(beatsReleased(result.current)).toBe(before);
    wait(1);
    expect(beatsReleased(result.current)).toBe(before + 1);
    wait(DELAY_MS.fast - 1);
    expect(beatsReleased(result.current)).toBe(before + 1);
    wait(1);
    expect(beatsReleased(result.current)).toBe(before + 2);
  });

  it("changing speed during an animation does not shorten or extend the settle timer", () => {
    const { result } = viewerTurn();
    act(() => result.current.intents.roll());
    wait(100);
    act(() => result.current.pacing!.setSpeed("fast"));
    expect(result.current.view.rollMs).toBe(ROLL_MS.normal);
    wait(ROLL_MS.normal - 100 - 1);
    expect(result.current.allowed.stop).toBe(false);
    wait(1);
    expect(result.current.allowed.stop).toBe(true);
  });
});

describe("slow", () => {
  it("slow delays the next beat by DELAY_MS.slow", () => {
    const { result } = render();
    act(() => result.current.pacing!.setSpeed("slow"));
    act(() => result.current.intents.newGame());
    act(() => result.current.intents.roll());
    expect(result.current.view.rollMs).toBe(ROLL_MS.slow);
    const before = beatsReleased(result.current);
    wait(DELAY_MS.slow - 1);
    expect(beatsReleased(result.current)).toBe(before);
    wait(1);
    expect(beatsReleased(result.current)).toBe(before + 1);
  });
});

describe("fast", () => {
  it("the handover to the viewer is released within 2000 ms of the previous beat", () => {
    const { result } = render();
    act(() => result.current.pacing!.setSpeed("fast"));
    act(() => result.current.intents.newGame());
    act(() => result.current.intents.roll());
    // Through the roll to start: the bots roll, then the viewer starts round 1.
    let sinceLastBeat = 0;
    for (let i = 0; i < 40 && !result.current.allowed.roll; i++) {
      const before = beatsReleased(result.current);
      wait(100);
      sinceLastBeat =
        beatsReleased(result.current) === before ? sinceLastBeat + 100 : 0;
      expect(sinceLastBeat).toBeLessThan(2000);
    }
    expect(result.current.allowed.roll).toBe(true);
    expect(lastKind(result.current)).toBe("turnStarted");
    expect(result.current.view.state.acting).toBe(VIEWER_SEAT);
  });
});

describe("pause", () => {
  it("nothing is released while paused", () => {
    const { result } = startAndRoll();
    wait(DELAY_MS.normal * 2); // a bot's roll to start is showing
    act(() => result.current.pacing!.pause());
    const { state, events } = result.current.view;
    wait(5000);
    expect(result.current.view.state).toBe(state);
    expect(result.current.view.events).toBe(events);
  });

  it("the settle timer is not paused", () => {
    const { result } = viewerTurn();
    act(() => result.current.intents.roll());
    act(() => result.current.pacing!.pause());
    wait(ROLL_MS.normal);
    expect(result.current.allowed.stop).toBe(true);
  });

  it("a viewer intent while paused releases only its first beat", () => {
    const { result } = viewerRolled();
    act(() => result.current.pacing!.pause());
    act(() => result.current.intents.stop());
    expect(lastKind(result.current)).toBe("turnEnded");
    wait(5000);
    expect(lastKind(result.current)).toBe("turnEnded");
    expect(result.current.pacing!.canStep).toBe(true);
  });
});

describe("resume", () => {
  it("re-arms one full delay with one timer", () => {
    const { result } = startAndRoll();
    wait(ROLL_MS.normal); // the viewer's dice have landed: only the beat timer is left
    act(() => result.current.pacing!.pause());
    expect(vi.getTimerCount()).toBe(0);
    const before = beatsReleased(result.current);

    act(() => result.current.pacing!.resume());
    expect(vi.getTimerCount()).toBe(1);
    wait(DELAY_MS.normal - 1);
    expect(beatsReleased(result.current)).toBe(before);
    wait(1);
    expect(beatsReleased(result.current)).toBe(before + 1);
  });
});

describe("step", () => {
  it("releases one beat per call while paused", () => {
    const { result } = startAndRoll();
    act(() => result.current.pacing!.pause());
    const before = beatsReleased(result.current);
    for (const n of [1, 2, 3]) {
      act(() => result.current.pacing!.step());
      expect(beatsReleased(result.current)).toBe(before + n);
    }
  });

  it("two calls before a render release one", () => {
    const { result } = startAndRoll();
    act(() => result.current.pacing!.pause());
    const before = beatsReleased(result.current);
    act(() => {
      result.current.pacing!.step();
      result.current.pacing!.step();
    });
    expect(beatsReleased(result.current)).toBe(before + 1);
  });

  it("does nothing unless paused", () => {
    const { result } = startAndRoll();
    const before = beatsReleased(result.current);
    act(() => result.current.pacing!.step());
    expect(beatsReleased(result.current)).toBe(before);
  });

  it("does nothing when canStep is false", () => {
    const { result } = viewerTurn();
    act(() => result.current.pacing!.pause());
    expect(result.current.pacing!.canStep).toBe(false);
    const { events } = result.current.view;
    act(() => result.current.pacing!.step());
    expect(result.current.view.events).toBe(events);
  });

  it("canStep is true only with a queued beat or a bot to move", () => {
    const { result } = startAndRoll();
    act(() => result.current.pacing!.pause());
    // The handover to seat 1 is queued.
    expect(result.current.pacing!.canStep).toBe(true);
    act(() => result.current.pacing!.step());
    // Caught up, and seat 1 is a bot to move.
    expect(result.current.pacing!.canStep).toBe(true);
    // Unpaused, nothing can be stepped.
    act(() => result.current.pacing!.resume());
    expect(result.current.pacing!.canStep).toBe(false);
  });
});

describe("StrictMode", () => {
  it("double-invoked effects leave one beat timer and one settle timer", () => {
    startAndRoll({ wrapper: strict });
    expect(vi.getTimerCount()).toBe(2);
  });

  it("a viewer Roll under StrictMode adds one rolled event", () => {
    const { result } = startAndRoll({ wrapper: strict });
    expect(rolledEvents(result.current)).toBe(1);
    wait(DELAY_MS.normal);
    expect(lastKind(result.current)).toBe("turnStarted");
  });
});

describe("unmount", () => {
  it("no beat or settle timer outlives the hook", () => {
    const hook = renderHook(() => useLocalSession());
    act(() => hook.result.current.intents.newGame());
    act(() => hook.result.current.intents.roll());
    // Both pending: the queued handover and the viewer's dice.
    expect(vi.getTimerCount()).toBe(2);
    hook.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("unmount during animation: advancing timers throws no act warning", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const hook = renderHook(() => useLocalSession());
    act(() => hook.result.current.intents.newGame());
    act(() => hook.result.current.intents.roll());
    hook.unmount();
    vi.advanceTimersByTime(5000);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
