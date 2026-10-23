import { beatsOf } from "./beats";
import type { GameEvent } from "./events";
import type { LoggedEvent } from "./session";

/**
 * Numbers events from `seq + 1` and stamps each with the seq of its beat's
 * first event, grouping this batch alone (beatsOf). `seq` is unique and
 * strictly increasing for the whole session, so it carries on across the
 * trims in `appendReleased`. Pass the last `seq` used; the result holds the
 * new last one.
 */
export function stampEvents(
  seq: number,
  events: readonly GameEvent[],
): { events: readonly LoggedEvent[]; seq: number } {
  const stamped: LoggedEvent[] = [];
  let last = seq;
  for (const beat of beatsOf(events)) {
    const id = last + 1;
    for (const event of beat.events) {
      last += 1;
      stamped.push({ ...event, seq: last, beat: id });
    }
  }
  return { events: stamped, seq: last };
}

/**
 * Appends released events to the view's log. Before an event is pushed the
 * log is emptied on `gameStarted`, and on `roundStarted` when `round > 1`.
 * Round 1 keeps the roll-off rows. Both are the first event of their beat,
 * so a trim never splits a beat.
 */
export function appendReleased(
  log: readonly LoggedEvent[],
  events: readonly LoggedEvent[],
): readonly LoggedEvent[] {
  let next = log;
  for (const event of events) {
    if (
      event.type === "gameStarted" ||
      (event.type === "roundStarted" && event.round > 1)
    ) {
      next = [];
    }
    next = [...next, event];
  }
  return next;
}

/** Stamps then appends at once: for callers with no queue (fixtures). */
export function appendEvents(
  log: readonly LoggedEvent[],
  seq: number,
  events: readonly GameEvent[],
): { log: readonly LoggedEvent[]; seq: number } {
  const stamped = stampEvents(seq, events);
  return { log: appendReleased(log, stamped.events), seq: stamped.seq };
}
