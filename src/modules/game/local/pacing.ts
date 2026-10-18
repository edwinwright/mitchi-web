import type { Speed } from "../engine";

/** Delay before each bot step, by speed. */
export const DELAY_MS: Record<Speed, number> = { normal: 1200, fast: 400 };

/** After the viewer rolls, a second roll is ignored for this long. */
export const ROLL_LOCK_MS = 350;
