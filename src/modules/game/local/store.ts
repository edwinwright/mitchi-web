import {
  appendEvents,
  applyAction,
  botStep,
  completeAction,
  createGame,
  select,
  type ActionRequest,
  type ApplyResult,
  type GameState,
  type LoggedEvent,
  type Spare,
} from "../engine";
import { PRACTICE_CONFIG, VIEWER_SEAT } from "./config";

/** Pure: no React, no timers, no randomness. The hook wraps it. */
export type Store = {
  readonly game: GameState;
  readonly log: readonly LoggedEvent[];
  /** The last event's seq. It changes exactly when the game changes. */
  readonly seq: number;
};

export type StoreMsg =
  /** `spare` is needed on a roll request only. */
  | { type: "request"; request: ActionRequest; spare: Spare | null }
  /** Ignored unless `atSeq` is still the store's `seq`. */
  | { type: "botStep"; atSeq: number; spare: Spare };

export function initStore(): Store {
  return { game: createGame(PRACTICE_CONFIG), log: [], seq: 0 };
}

/** Nothing is logged here: StrictMode runs reducers twice. */
export function storeReducer(store: Store, msg: StoreMsg): Store {
  switch (msg.type) {
    case "request": {
      // A roll with no dice to roll with cannot be completed: ignore it.
      if (msg.request.type === "roll" && msg.spare === null) return store;
      const action = completeAction(
        store.game,
        msg.request,
        msg.spare ?? [1, 1],
      );
      const result = applyAction(store.game, action);
      // A rejected request is a stale click: benign.
      return result.ok ? commit(store, result) : store;
    }
    case "botStep": {
      if (msg.atSeq !== store.seq) return store;
      const mover = select.toRoll(store.game)[0];
      if (mover === undefined || mover === VIEWER_SEAT) return store;
      const step = botStep(store.game, mover);
      if (!step) return store;
      const action = completeAction(
        store.game,
        step.request,
        msg.spare,
        step.reason,
      );
      const result = applyAction(store.game, action);
      // A rejected bot step is a bug in the bots or the engine. Throwing
      // beats a silent no-op that would stall the game with no feedback.
      if (!result.ok) {
        throw new Error(
          `Bot step rejected (${result.rejection.code}): ${JSON.stringify(action)}`,
        );
      }
      return commit(store, result);
    }
  }
}

function commit(
  store: Store,
  result: Extract<ApplyResult, { ok: true }>,
): Store {
  // An idempotent keep returns the same game: nothing changed.
  if (result.state === store.game) return store;
  const { log, seq } = appendEvents(store.log, store.seq, result.events);
  return { game: result.state, log, seq };
}
