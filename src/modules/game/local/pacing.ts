import type { Speed } from "../engine";

/** The wait before each beat. */
export const DELAY_MS: Record<Speed, number> = { normal: 1200, fast: 400 };

/**
 * The roll animation, inside the beat. Each must stay below its DELAY_MS so
 * the result is held after landing.
 */
export const ROLL_MS: Record<Speed, number> = { normal: 500, fast: 200 };
