import type { Action, ActionRequest } from "./actions";
import type { BotReason } from "./events";
import { diceToRoll } from "./select";
import type { Die, GameState } from "./types";

/** Two dice rolled in advance. A roll uses as many as the state needs, from the front. */
export type Spare = readonly [Die, Die];

/**
 * Turns a request (no dice, no reason) into an action. A roll takes
 * `diceToRoll(state)` dice from `spare`; a roll or stop carries `reason`,
 * or null. Keep and control requests pass through. Pure, never throws: a
 * request the engine rejects is still completed, and rejected there.
 *
 * Locally the browser supplies `spare`; online a server would supply its own.
 */
export function completeAction(
  state: GameState,
  request: ActionRequest,
  spare: Spare,
  reason?: BotReason | null,
): Action {
  switch (request.type) {
    case "roll":
      return {
        type: "roll",
        seat: request.seat,
        values: spare.slice(0, diceToRoll(state)),
        reason: reason ?? null,
      };
    case "stop":
      return { type: "stop", seat: request.seat, reason: reason ?? null };
    default:
      return request;
  }
}
