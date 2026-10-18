// The session contract. Types only: LocalSession implements it now, and a
// future online session returns the same shape.

import type { GameEvent } from "./events";
import type { DieSlot, GameState, Seat } from "./types";

export type LoggedEvent = GameEvent & { readonly seq: number };

export type SessionView = {
  readonly state: GameState;
  /** Since the round started; round 1 keeps the roll-off. */
  readonly events: readonly LoggedEvent[];
  readonly viewerSeat: Seat;
  readonly pending: boolean;
};

export type Intents = {
  roll(): void;
  setKeep(die: DieSlot, kept: boolean): void;
  stop(): void;
  nextRound(): void;
  newGame(): void;
};

/** What the engine allows the viewer now. Excludes `pending`. */
export type AllowedIntents = { readonly [K in keyof Intents]: boolean };

export type Speed = "normal" | "fast";

export type Pacing = {
  readonly paused: boolean;
  readonly speed: Speed;
  readonly canStep: boolean;
  pause(): void;
  resume(): void;
  step(): void;
  setSpeed(speed: Speed): void;
};

/** A render-time snapshot from a hook. A future useRemoteSession() returns the same shape. */
export interface GameSession {
  readonly view: SessionView;
  readonly allowed: AllowedIntents;
  readonly intents: Intents;
  /** Absent online. */
  readonly pacing?: Pacing;
}
