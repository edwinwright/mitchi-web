"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { DieSlot, GameSession, Intents, Pacing, Speed } from "../engine";
import { VIEWER_SEAT } from "./config";
import { DELAY_MS } from "./pacing";
import { rollSpare } from "./random";
import {
  allowedOf,
  initStore,
  releasedSeq,
  storeReducer,
  viewOf,
  whatsNext,
} from "./store";

/**
 * The local GameSession: the tested store, plus the only timers and the only
 * dice in the feature. Dice are drawn in handlers and timer callbacks, never
 * during render, so the first render is the same on the server and the client.
 *
 * Two timers. The beat timer releases one beat, or one bot move, after
 * `DELAY_MS`. The settle timer lifts the lock when the viewer's dice land,
 * after `rollMs`; Pause holds beats, not a roll already under way.
 */
export function useLocalSession(): GameSession {
  const [store, dispatch] = useReducer(storeReducer, undefined, initStore);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<Speed>("normal");

  const next = whatsNext(store);
  const seq = releasedSeq(store);

  // Timers and Step read these at the moment they act, never a stale closure.
  // Updated in an effect, declared before the timers: React does not allow
  // writing a ref during render.
  const speedRef = useRef(speed);
  const releasedRef = useRef(seq);
  useEffect(() => {
    speedRef.current = speed;
    releasedRef.current = seq;
  }, [speed, seq]);

  // Speed is read once, at arming, and is not a dependency: a change applies
  // from the next beat, not the one already waiting. Resume re-arms a full delay.
  useEffect(() => {
    if (next === null || paused) return;
    const armedSpeed = speedRef.current;
    const id = setTimeout(
      () =>
        dispatch({
          type: "advance",
          atRelease: seq,
          // Drawn when the timer fires, never at arming or render.
          spare: next === "bot" ? rollSpare() : null,
          speed: armedSpeed,
        }),
      DELAY_MS[armedSpeed],
    );
    return () => clearTimeout(id);
  }, [seq, next, paused]);

  const { animating, rollMs } = store;
  useEffect(() => {
    if (animating === null) return;
    const id = setTimeout(
      () => dispatch({ type: "settled", beat: animating }),
      rollMs,
    );
    return () => clearTimeout(id);
  }, [animating, rollMs]);

  const intents = useMemo<Intents>(
    () => ({
      roll() {
        // A second Roll before the next render is ignored by the reducer.
        dispatch({ type: "roll", spare: rollSpare(), speed: speedRef.current });
      },
      setKeep(die: DieSlot, kept: boolean) {
        dispatch({
          type: "request",
          request: { type: "keep", seat: VIEWER_SEAT, die, kept },
        });
      },
      stop() {
        dispatch({
          type: "request",
          request: { type: "stop", seat: VIEWER_SEAT },
        });
      },
      nextRound() {
        dispatch({ type: "request", request: { type: "nextRound" } });
      },
      newGame() {
        dispatch({ type: "request", request: { type: "newGame" } });
      },
    }),
    [],
  );

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);
  // Two calls before a render carry the same atRelease: the second is stale.
  const step = useCallback(() => {
    if (!paused || next === null) return;
    dispatch({
      type: "advance",
      atRelease: releasedRef.current,
      spare: next === "bot" ? rollSpare() : null,
      speed: speedRef.current,
    });
  }, [paused, next]);

  const pacing: Pacing = {
    paused,
    speed,
    canStep: paused && next !== null,
    pause,
    resume,
    step,
    setSpeed,
  };

  return { view: viewOf(store), allowed: allowedOf(store), intents, pacing };
}
