import type { Die, Spare } from "../engine";

function die(): Die {
  return (Math.floor(Math.random() * 6) + 1) as Die;
}

/**
 * Two fresh dice. The only randomness in the feature (SES-1): call it from
 * an event handler or a timer callback, never during render.
 */
export function rollSpare(): Spare {
  return [die(), die()];
}
