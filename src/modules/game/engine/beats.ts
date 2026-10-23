import type { GameEvent } from "./events";
import type { LoggedEvent } from "./session";
import type { Seat } from "./types";

type Rider = "rollLimitSet" | "worstHandChanged" | "potChanged";

/** One thing a player or the game does: what the session releases at a time. */
export type BeatKind = Exclude<GameEvent["type"], Rider> | "keepSwapped";

export type Beat<E extends GameEvent = GameEvent> = {
  readonly kind: BeatKind;
  /**
   * The subject. `roundStarted`: its starting seat. Null for gameStarted,
   * rollOffStarted, tieBreakStarted and gameEnded.
   */
  readonly seat: Seat | null;
  /** The headline event first, then what rides on it. Never empty. */
  readonly events: readonly E[];
};

/** `id` is the seq of the beat's first event. */
export type LoggedBeat = Beat<LoggedEvent> & { readonly id: number };

const RIDERS: readonly GameEvent["type"][] = [
  "rollLimitSet",
  "worstHandChanged",
  "potChanged",
] satisfies Rider[];

/**
 * Groups events into beats, left to right, reading only the events: never
 * time or the viewer. Run it on one received batch: two batches are never
 * merged. `beatsOf(a.concat(b))` equals `beatsOf(a).concat(beatsOf(b))`
 * whenever `b` starts at a beat boundary.
 *
 * - A rider (`rollLimitSet`, `worstHandChanged`, `potChanged`) joins the
 *   beat before it: the consequences land with the event that caused them.
 * - `gameStarted` takes the `rollOffStarted` and `turnStarted{rollOff}`
 *   directly after it: the Start click is the pause.
 * - `roundStarted` takes the `turnStarted` after it only when `round > 1`:
 *   in round 1 the starter is named on one beat and their turn starts on the
 *   next.
 * - A `keepSet{kept: false}` directly followed by `keepSet{kept: true}` for
 *   the same seat and the other die is one `keepSwapped` beat.
 * - Every other event opens its own beat.
 */
export function beatsOf<E extends GameEvent>(
  events: readonly E[],
): readonly Beat<E>[] {
  const beats: { kind: BeatKind; seat: Seat | null; events: E[] }[] = [];
  let i = 0;
  const takeIf = (group: E[], wanted: (event: E) => boolean): boolean => {
    const next = events[i];
    if (next === undefined || !wanted(next)) return false;
    group.push(next);
    i += 1;
    return true;
  };

  while (i < events.length) {
    const event = events[i];
    i += 1;

    if (RIDERS.includes(event.type)) {
      const current = beats.at(-1);
      if (!current) throw new Error("Corrupt log: rider with no beat");
      current.events.push(event);
      continue;
    }

    const group = [event];
    switch (event.type) {
      case "gameStarted":
        if (takeIf(group, (e) => e.type === "rollOffStarted")) {
          takeIf(
            group,
            (e) => e.type === "turnStarted" && e.context === "rollOff",
          );
        }
        beats.push({ kind: "gameStarted", seat: null, events: group });
        continue;
      case "roundStarted":
        if (event.round > 1) {
          takeIf(
            group,
            (e) => e.type === "turnStarted" && e.context === "round",
          );
        }
        beats.push({
          kind: "roundStarted",
          seat: event.startingSeat,
          events: group,
        });
        continue;
      case "keepSet": {
        const swapped =
          !event.kept &&
          takeIf(
            group,
            (e) =>
              e.type === "keepSet" &&
              e.kept &&
              e.seat === event.seat &&
              e.die !== event.die,
          );
        beats.push({
          kind: swapped ? "keepSwapped" : "keepSet",
          seat: event.seat,
          events: group,
        });
        continue;
      }
      case "rollOffRolled":
      case "turnStarted":
      case "rolled":
      case "turnEnded":
      case "tieBreakRolled":
      case "potTaken":
        beats.push({ kind: event.type, seat: event.seat, events: group });
        continue;
      case "rollOffStarted":
      case "tieBreakStarted":
      case "gameEnded":
        beats.push({ kind: event.type, seat: null, events: group });
        continue;
      default:
        throw new Error(`Corrupt log: unknown event ${event.type}`);
    }
  }
  return beats;
}
