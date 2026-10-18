"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  select,
  type DieSlot,
  type GameSession,
  type Intents,
  type Pacing,
  type Speed,
} from "../engine";
import { VIEWER_SEAT } from "./config";
import { DELAY_MS, ROLL_LOCK_MS } from "./pacing";
import { rollSpare } from "./random";
import { initStore, storeReducer } from "./store";

/**
 * The local GameSession: the tested store, plus the only timers and the only
 * dice in the feature. Dice are drawn in handlers and timer callbacks, never
 * during render, so the first render is the same on the server and the client.
 */
export function useLocalSession(): GameSession {
  const [store, dispatch] = useReducer(storeReducer, undefined, initStore);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<Speed>("normal");
  const [locked, setLocked] = useState(false);

  // step() reads the latest seq, never a stale closure. Updated in an effect:
  // React does not allow writing a ref during render.
  const seqRef = useRef(store.seq);
  useEffect(() => {
    seqRef.current = store.seq;
  }, [store.seq]);
  // Set in the handler, so a second click before the next render is ignored too.
  const lockedRef = useRef(false);

  // Local order: lowest seat first.
  const mover = select.toRoll(store.game)[0] ?? null;
  const botDue = mover !== null && mover !== VIEWER_SEAT;

  // One timer at a time, cleared when the state, pause or speed changes.
  useEffect(() => {
    if (!botDue || paused) return;
    const id = setTimeout(
      () => dispatch({ type: "botStep", atSeq: store.seq, spare: rollSpare() }),
      DELAY_MS[speed],
    );
    return () => clearTimeout(id);
  }, [store.seq, botDue, paused, speed]);

  useEffect(() => {
    if (!locked) return;
    const id = setTimeout(() => {
      lockedRef.current = false;
      setLocked(false);
    }, ROLL_LOCK_MS);
    return () => clearTimeout(id);
  }, [locked]);

  const intents = useMemo<Intents>(
    () => ({
      roll() {
        if (lockedRef.current) return;
        lockedRef.current = true;
        dispatch({
          type: "request",
          request: { type: "roll", seat: VIEWER_SEAT },
          spare: rollSpare(),
        });
        setLocked(true);
      },
      setKeep(die: DieSlot, kept: boolean) {
        dispatch({
          type: "request",
          request: { type: "keep", seat: VIEWER_SEAT, die, kept },
          spare: null,
        });
      },
      stop() {
        dispatch({
          type: "request",
          request: { type: "stop", seat: VIEWER_SEAT },
          spare: null,
        });
      },
      nextRound() {
        dispatch({
          type: "request",
          request: { type: "nextRound" },
          spare: null,
        });
      },
      newGame() {
        dispatch({
          type: "request",
          request: { type: "newGame" },
          spare: null,
        });
      },
    }),
    [],
  );

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);
  const step = useCallback(() => {
    if (!paused || !botDue) return;
    dispatch({ type: "botStep", atSeq: seqRef.current, spare: rollSpare() });
  }, [paused, botDue]);

  const pacing: Pacing = {
    paused,
    speed,
    canStep: paused && botDue,
    pause,
    resume,
    step,
    setSpeed,
  };

  return {
    view: {
      state: store.game,
      events: store.log,
      viewerSeat: VIEWER_SEAT,
      pending: locked,
    },
    allowed: select.allowedIntents(store.game, VIEWER_SEAT),
    intents,
    pacing,
  };
}
