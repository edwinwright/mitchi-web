import type { LoggedEvent, Speed } from "../engine";

/** Delay before each bot step, by speed. */
export const DELAY_MS: Record<Speed, number> = { normal: 1200, fast: 400 };

/** After the viewer rolls, a second roll is ignored for this long. */
export const ROLL_LOCK_MS = 350;

/**
 * Extra wait before the first bot step of a new turn, by speed, on top of
 * `DELAY_MS`. The ending turn's hand stays on screen (`HOLD_MS` in
 * `ui/hold.ts`) and then placeholders show for the rest, so one bot's turn
 * is visibly over before the next begins.
 */
export const HANDOVER_MS: Record<Speed, number> = { normal: 800, fast: 300 };

/**
 * True when the latest step ended a turn and handed the roll on. A round or
 * game start is not a handover: the viewer's Next round click is that pause.
 */
export function isHandover(events: readonly LoggedEvent[]): boolean {
  if (events.at(-1)?.type !== "turnStarted") return false;
  for (const event of events.slice(0, -1).reverse()) {
    switch (event.type) {
      // A tie-break turn is one roll, and ends without a `turnEnded`.
      case "turnEnded":
      case "tieBreakRolled":
        return true;
      case "turnStarted":
      case "roundStarted":
      case "gameStarted":
      case "rollOffRolled":
        return false;
    }
  }
  return false;
}

/** The wait before the next bot step. */
export function botDelay(events: readonly LoggedEvent[], speed: Speed) {
  return DELAY_MS[speed] + (isHandover(events) ? HANDOVER_MS[speed] : 0);
}
