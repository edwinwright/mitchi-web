import type { GameEvent } from "./events";
import { applyEvent } from "./evolve";
import { appendReleased, stampEvents } from "./log";
import type { LoggedEvent } from "./session";
import type { GameState } from "./types";

/**
 * A playback cursor over the event log: events are received whole, then
 * released one beat at a time. Pure and keeps no time: the session decides
 * when to release. `receive` and `release` are the only code that touches
 * `queue`.
 */
export type Playback = {
  /** The fold of every released event. */
  readonly shown: GameState;
  /** The view's log: released events, trimmed as `appendReleased` says. */
  readonly released: readonly LoggedEvent[];
  /** Received, not yet released. Whole beats, in order. */
  readonly queue: readonly LoggedEvent[];
  /** The last seq issued. */
  readonly seq: number;
};

export function startPlayback(initial: GameState): Playback {
  return { shown: initial, released: [], queue: [], seq: 0 };
}

/** Numbers and stamps one batch and queues it. Does not fold. */
export function receive(
  playback: Playback,
  events: readonly GameEvent[],
): Playback {
  if (events.length === 0) return playback;
  const stamped = stampEvents(playback.seq, events);
  return {
    ...playback,
    queue: [...playback.queue, ...stamped.events],
    seq: stamped.seq,
  };
}

/** Folds the first queued beat into `shown`. An empty queue changes nothing. */
export function release(playback: Playback): Playback {
  const { queue } = playback;
  if (queue.length === 0) return playback;
  const beat = queue[0].beat;
  const end = queue.findIndex((event) => event.beat !== beat);
  const events = end === -1 ? queue : queue.slice(0, end);
  return {
    ...playback,
    shown: events.reduce<GameState>(applyEvent, playback.shown),
    released: appendReleased(playback.released, events),
    queue: end === -1 ? [] : queue.slice(end),
  };
}

export function caughtUp(playback: Playback): boolean {
  return playback.queue.length === 0;
}
