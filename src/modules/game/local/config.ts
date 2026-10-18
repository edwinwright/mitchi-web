import type { GameConfig, Seat } from "../engine";

/** The practice game: four seats, first to 5 points. Real games are usually played to 25. */
export const PRACTICE_CONFIG: GameConfig = { seats: 4, pointLimit: 5 };

/** The seat this browser controls. The other three are bots. */
export const VIEWER_SEAT: Seat = 0;
