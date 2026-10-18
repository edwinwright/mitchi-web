import type { GameEvent } from "./events";
import type { LoggedEvent } from "./session";

/**
 * Appends events to a session's log and numbers them. `seq` is unique and
 * strictly increasing for the whole session, so it carries on across the
 * trims below. Pass the last `seq` used; the result holds the new last one.
 *
 * Before an event is pushed the log is emptied on `gameStarted`, and on
 * `roundStarted` when `round > 1`. Round 1 keeps the roll-off rows.
 */
export function appendEvents(
  log: readonly LoggedEvent[],
  seq: number,
  events: readonly GameEvent[],
): { log: readonly LoggedEvent[]; seq: number } {
  let next = log;
  let last = seq;
  for (const event of events) {
    if (
      event.type === "gameStarted" ||
      (event.type === "roundStarted" && event.round > 1)
    ) {
      next = [];
    }
    last += 1;
    next = [...next, { ...event, seq: last }];
  }
  return { log: next, seq: last };
}
