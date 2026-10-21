import type { Speed } from "../engine";

/**
 * How long a roll stays on screen once its turn has ended, by speed: one bot
 * step. Copied from `DELAY_MS` in `local/pacing.ts`, which the UI may not
 * import. With no pacing (online, stories) the board uses normal.
 */
export const HOLD_MS: Record<Speed, number> = { normal: 1200, fast: 400 };
