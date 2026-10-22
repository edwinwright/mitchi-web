import {
  applyAction,
  botStep,
  caughtUp,
  completeAction,
  createGame,
  receive,
  release,
  select,
  startPlayback,
  type Action,
  type ActionRequest,
  type AllowedIntents,
  type ApplyResult,
  type BeatKind,
  type GameState,
  type Playback,
  type SessionView,
  type Spare,
  type Speed,
} from "../engine";
import { PRACTICE_CONFIG, VIEWER_SEAT } from "./config";
import { ROLL_MS } from "./pacing";

/** Pure: no React, no timers, no randomness. The hook wraps it. */
export type Store = {
  /** The engine's state after the last applied action. Ahead of `playback.shown` while beats are queued. */
  readonly game: GameState;
  readonly playback: Playback;
  /** The id of the viewer's roll beat while its dice animate, else null. */
  readonly animating: number | null;
  /** Animation length for the last released beat; 0 if it rolled nothing. */
  readonly rollMs: number;
};

type ViewerRequest = Exclude<ActionRequest, { type: "roll" }>;

export type StoreMsg =
  /** The viewer's Roll. */
  | { type: "roll"; spare: Spare; speed: Speed }
  /** The viewer's keep, stop, next round or new game. */
  | { type: "request"; request: ViewerRequest }
  /**
   * The beat timer, or Step. Ignored unless `atRelease` is still the last
   * released seq. `spare` is null when a beat is queued: only a bot move rolls.
   */
  | { type: "advance"; atRelease: number; spare: Spare | null; speed: Speed }
  /** The animation timer. Ignored unless `beat` is still animating. */
  | { type: "settled"; beat: number };

const ROLL_KINDS: readonly BeatKind[] = [
  "rolled",
  "tieBreakRolled",
  "rollOffRolled",
];

export function initStore(): Store {
  const game = createGame(PRACTICE_CONFIG);
  return { game, playback: startPlayback(game), animating: null, rollMs: 0 };
}

export const releasedSeq = (store: Store): number =>
  store.playback.released.at(-1)?.seq ?? 0;

/** "beat": a queued beat is due. "bot": caught up and a bot moves. null: the viewer moves, or nothing does. */
export function whatsNext(store: Store): "beat" | "bot" | null {
  if (!caughtUp(store.playback)) return "beat";
  const mover = select.toRoll(store.game)[0];
  return mover !== undefined && mover !== VIEWER_SEAT ? "bot" : null;
}

export function viewOf(store: Store): SessionView {
  return {
    state: store.playback.shown,
    events: store.playback.released,
    viewerSeat: VIEWER_SEAT,
    pending: false,
    rollMs: store.rollMs,
  };
}

/** Nothing until the view has caught up and the viewer's dice have landed. */
export function allowedOf(store: Store): AllowedIntents {
  return caughtUp(store.playback) && store.animating === null
    ? select.allowedIntents(store.game, VIEWER_SEAT)
    : select.noIntents;
}

/** Nothing is logged here: StrictMode runs reducers twice. */
export function storeReducer(store: Store, msg: StoreMsg): Store {
  switch (msg.type) {
    case "roll": {
      if (!viewerMayAct(store)) return store;
      const request = { type: "roll", seat: VIEWER_SEAT } as const;
      const result = applyAction(
        store.game,
        completeAction(store.game, request, msg.spare),
      );
      // A rejected request is a stale click: benign.
      return result.ok ? show(commit(store, result), msg.speed) : store;
    }
    case "request": {
      if (!viewerMayAct(store)) return store;
      const result = applyAction(store.game, actionOf(msg.request));
      // No events: an idempotent keep changed nothing. No request rolls, so the speed is moot.
      return result.ok && result.events.length > 0
        ? show(commit(store, result), "normal")
        : store;
    }
    case "advance": {
      if (msg.atRelease !== releasedSeq(store)) return store;
      switch (whatsNext(store)) {
        case "beat":
          return show(
            { ...store, playback: release(store.playback) },
            msg.speed,
          );
        case "bot":
          // Cannot happen: atRelease pins the state the timer was armed on.
          if (msg.spare === null)
            throw new Error("advance: a bot move needs dice");
          return withMove(store, botMove(store.game, msg.spare), msg.speed);
        case null:
          return store;
      }
      break;
    }
    case "settled":
      return msg.beat === store.animating
        ? { ...store, animating: null }
        : store;
  }
  return store;
}

/** The viewer acts only on a caught-up view with no dice in the air. */
function viewerMayAct(store: Store): boolean {
  return caughtUp(store.playback) && store.animating === null;
}

/** A viewer request carries no dice: only a roll needs them, and a stop has no reason. */
function actionOf(request: ViewerRequest): Action {
  return request.type === "stop" ? { ...request, reason: null } : request;
}

type Accepted = Extract<ApplyResult, { ok: true }>;

/**
 * Applies an accepted action and releases its first beat at once: the click,
 * or the bot's turn to act, is the pause that opens it. The rest wait for
 * `advance`.
 */
function commit(store: Store, result: Accepted): Store {
  return {
    ...store,
    game: result.state,
    playback: release(receive(store.playback, result.events)),
  };
}

function withMove(store: Store, moved: Accepted | null, speed: Speed): Store {
  return moved ? show(commit(store, moved), speed) : store;
}

/**
 * After any release. Every release replaces `animating` and `rollMs`, so a
 * Step that releases the next beat early lifts the lock, and a stale
 * `settled` is ignored.
 */
function show(store: Store, speed: Speed): Store {
  const beat = select.lastBeat(store.playback.released);
  const rolls = beat !== null && ROLL_KINDS.includes(beat.kind);
  return {
    ...store,
    rollMs: rolls ? ROLL_MS[speed] : 0,
    animating: rolls && beat.seat === VIEWER_SEAT ? beat.id : null,
  };
}

/**
 * The bot's next move. A keep swap is two keeps in one move, so both arrive
 * in one batch and play as one `keepSwapped` beat; the un-kept state is never
 * shown.
 */
function botMove(game: GameState, spare: Spare): Accepted | null {
  const mover = select.toRoll(game)[0];
  const step = botStep(game, mover);
  if (!step) return null;
  const first = applyBot(
    game,
    completeAction(game, step.request, spare, step.reason),
  );
  const { request } = step;
  if (request.type !== "keep" || request.kept) return first;

  const second = botStep(first.state, mover)?.request;
  if (
    second?.type !== "keep" ||
    second.seat !== mover ||
    !second.kept ||
    second.die === request.die
  ) {
    throw new Error(
      `Bot keep swap: expected a keep of the other die, got ${JSON.stringify(second)}`,
    );
  }
  const swapped = applyBot(first.state, second);
  return { ...swapped, events: [...first.events, ...swapped.events] };
}

/**
 * A rejected bot step is a bug in the bots or the engine. Throwing beats a
 * silent no-op that would stall the game with no feedback.
 */
function applyBot(game: GameState, action: Action): Accepted {
  const result = applyAction(game, action);
  if (!result.ok) {
    throw new Error(
      `Bot step rejected (${result.rejection.code}): ${JSON.stringify(action)}`,
    );
  }
  return result;
}
