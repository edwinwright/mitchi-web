import type { Action } from "../engine";

/** One action, or several applied together and received as one batch. */
export type Step = Action | readonly Action[];

/**
 * Groups each un-keep with the action after it, as the store's bot driver
 * applies a keep swap in one step. For scripts where every seat is a bot.
 */
export function batchActions(actions: readonly Action[]): Step[] {
  const steps: Step[] = [];
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const next = actions[i + 1];
    if (action.type === "keep" && !action.kept && next) {
      steps.push([action, next]);
      i += 1;
    } else {
      steps.push(action);
    }
  }
  return steps;
}
