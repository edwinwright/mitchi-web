import type { Speed } from "../engine";

/**
 * How long a turn's last roll stays on screen once the turn has ended, by
 * speed. The next bot step waits `DELAY_MS + HANDOVER_MS` in `local/pacing.ts`
 * (1200 + 800, 400 + 300), which the UI may not import: the rest, 500ms and
 * 200ms, is the placeholders between turns. With no pacing (online, stories)
 * the board uses normal.
 */
export const HOLD_MS: Record<Speed, number> = { normal: 1500, fast: 500 };
