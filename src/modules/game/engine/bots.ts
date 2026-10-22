import type { HandId } from "@/data/hands";
import type { ActionRequest } from "./actions";
import type { BotReason } from "./events";
import { handFromDice, rankOf } from "./hand-rank";
import * as select from "./select";
import type { DicePair, GameState, KeptPair, Seat } from "./types";

export type BotStep = {
  readonly request: ActionRequest;
  readonly reason: BotReason | null;
};

/** The starter stops on this hand or better. */
export const STARTER_STOPS_AT: HandId = "6-3";

/**
 * The next thing `seat` does, or null if it is not their move. Pure and
 * deterministic (ENG-8). First match wins:
 *
 * 1. Not in `toRoll`: null.
 * 2. Roll-off or tie-break: roll.
 * 3. Turn, no dice yet: roll.
 * 4. Starter on 6-3 or better: stop (`goodEnough`).
 * 5. Not the starter, strictly better than the worst so far: stop
 *    (`beatsWorstHandSoFar`). A tie is not a beat.
 * 6. Keeps differ from the target: set a slot that differs, letting go
 *    before keeping, so a swap never holds both dice.
 * 7. The target keeps one die: roll (`keepingHighDie`).
 * 8. Otherwise roll both (`rerollingBoth`).
 *
 * A keep and the roll after it are two calls, so the keep is its own
 * paced step. The reason rides on the roll or stop that completes the
 * decision, so one decision gives one reason.
 */
export function botStep(state: GameState, seat: Seat): BotStep | null {
  if (!select.toRoll(state).includes(seat)) return null;
  const { phase, round } = state;
  const roll: ActionRequest = { type: "roll", seat };

  if (phase.kind !== "turn" || phase.dice === null) {
    return { request: roll, reason: null };
  }

  const rank = rankOf(handFromDice(phase.dice));
  if (round?.startingSeat === seat) {
    if (rank <= rankOf(STARTER_STOPS_AT)) {
      return { request: { type: "stop", seat }, reason: "goodEnough" };
    }
  } else {
    const worst = select.worstHandSoFar(state);
    if (worst && rank < rankOf(worst.hand)) {
      return {
        request: { type: "stop", seat },
        reason: "beatsWorstHandSoFar",
      };
    }
  }

  const target = targetKeep(phase.dice, phase.kept);
  const differs = ([0, 1] as const).filter(
    (die) => phase.kept[die] !== target[die],
  );
  const die = differs.find((d) => !target[d]) ?? differs[0];
  if (die !== undefined) {
    return {
      request: { type: "keep", seat, die, kept: target[die] },
      reason: null,
    };
  }
  return target[0] || target[1]
    ? { request: roll, reason: "keepingHighDie" }
    : { request: roll, reason: "rerollingBoth" };
}

/**
 * The slot of the higher die if it is a 5 or 6, otherwise neither. On
 * equal dice, the slot already kept, else slot 0. Bots never keep both.
 */
function targetKeep(dice: DicePair, kept: KeptPair): KeptPair {
  const high = Math.max(dice[0], dice[1]);
  if (high < 5) return [false, false];
  if (dice[0] === dice[1])
    return kept[0] || !kept[1] ? [true, false] : [false, true];
  return dice[0] > dice[1] ? [true, false] : [false, true];
}
