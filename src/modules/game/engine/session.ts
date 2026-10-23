// The session contract. Types only: LocalSession implements it now, and a
// future online session returns the same shape.

import type { GameEvent } from "./events";
import type { DieSlot, GameState, Seat } from "./types";

export type LoggedEvent = GameEvent & {
  /** Unique, strictly increasing for the whole session. */
  readonly seq: number;
  /** The seq of the first event of this event's beat. Stamped when received. */
  readonly beat: number;
};

export type SessionView = {
  /** As of the last released beat. Not the engine's final state while beats are queued. */
  readonly state: GameState;
  /** Released events only. Since the round started; round 1 keeps the roll-off. */
  readonly events: readonly LoggedEvent[];
  readonly viewerSeat: Seat;
  /** True while the viewer's own intent is unacknowledged. Online only: a local session is always false. */
  readonly pending: boolean;
  /** How long the dice rolled by the last released beat animate, in ms. 0 if that beat rolled none. */
  readonly rollMs: number;
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

export type Speed = "slow" | "normal" | "fast";

export type Pacing = {
  readonly paused: boolean;
  readonly speed: Speed;
  /** Paused, and there is a beat to release or a bot to move. */
  readonly canStep: boolean;
  pause(): void;
  resume(): void;
  step(): void;
  setSpeed(speed: Speed): void;
};

/** A render-time snapshot from a hook. A future useRemoteSession() returns the same shape. */
export interface GameSession {
  readonly view: SessionView;
  /**
   * What the viewer may do now: the engine's allowed intents, or none
   * unless the view has caught up and the viewer's dice are not animating.
   */
  readonly allowed: AllowedIntents;
  readonly intents: Intents;
  /** Absent online. */
  readonly pacing?: Pacing;
}
