import {
  applyAction,
  botStep,
  completeAction,
  createGame,
  select,
  type Action,
  type ApplyResult,
  type BotReason,
  type Die,
  type GameConfig,
  type GameState,
  type Seat,
  type Spare,
  type Winners,
} from "../engine";

/** A small seeded generator: the same seed always gives the same sequence in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SIMULATION_CONFIG: GameConfig = { seats: 4, pointLimit: 5 };

export type SimulationOptions = {
  readonly config?: GameConfig;
  /** Actions before a game is abandoned as stuck. */
  readonly maxActions?: number;
  /** Rounds before a game is abandoned as endless. */
  readonly maxRounds?: number;
  /**
   * Called for every action applied, before the next one is chosen.
   * `bot` is the policy's step, or null for a control action.
   */
  readonly onStep?: (step: {
    readonly state: GameState;
    readonly action: Action;
    readonly result: ApplyResult;
    readonly bot: boolean;
  }) => void;
};

export type SimulationResult = {
  readonly seed: number;
  readonly ended: boolean;
  readonly actions: number;
  readonly rounds: number;
  readonly mitchi: boolean;
  readonly tieBreak: boolean;
  readonly reasons: readonly BotReason[];
  /** Set only if the engine rejected an action the bots or the loop sent. */
  readonly rejected: { readonly action: Action; readonly code: string } | null;
  readonly points: readonly number[];
  readonly winners: Winners | null;
  /** The seat that took the last pot. */
  readonly finalTaker: Seat | null;
};

/**
 * Plays one game with every seat on the bot policy, through the real
 * engine. The seed fixes every die. A rejected action stops the game and
 * is reported, never thrown, so a test can name the seed that exposed it.
 */
export function simulateGame(
  seed: number,
  options: SimulationOptions = {},
): SimulationResult {
  const {
    config = SIMULATION_CONFIG,
    maxActions = 5000,
    maxRounds = 60,
  } = options;
  const random = mulberry32(seed);
  const die = (): Die => (Math.floor(random() * 6) + 1) as Die;
  const spare = (): Spare => [die(), die()];

  let state = createGame(config);
  let actions = 0;
  let mitchi = false;
  let tieBreak = false;
  let finalTaker: Seat | null = null;
  let rejected: SimulationResult["rejected"] = null;
  const reasons = new Set<BotReason>();

  const apply = (action: Action, bot: boolean): boolean => {
    actions += 1;
    const result = applyAction(state, action);
    options.onStep?.({ state, action, result, bot });
    if (!result.ok) {
      rejected = { action, code: result.rejection.code };
      return false;
    }
    for (const event of result.events) {
      if (event.type === "potChanged" && event.cause === "mitchi")
        mitchi = true;
      if (event.type === "tieBreakStarted") tieBreak = true;
      if (event.type === "potTaken") finalTaker = event.seat;
      if (
        (event.type === "rolled" || event.type === "turnEnded") &&
        event.reason
      ) {
        reasons.add(event.reason);
      }
    }
    state = result.state;
    return true;
  };

  let ok = apply({ type: "newGame" }, false);
  while (ok && state.phase.kind !== "gameOver") {
    if (actions >= maxActions || (state.round?.number ?? 0) > maxRounds) break;
    if (state.phase.kind === "roundSummary") {
      ok = apply({ type: "nextRound" }, false);
      continue;
    }
    const mover = select.toRoll(state)[0];
    const step = mover === undefined ? null : botStep(state, mover);
    if (!step)
      throw new Error(`Seed ${seed}: nobody to move in ${state.phase.kind}`);
    ok = apply(completeAction(state, step.request, spare(), step.reason), true);
  }

  return {
    seed,
    ended: state.phase.kind === "gameOver",
    actions,
    rounds: state.round?.number ?? 0,
    mitchi,
    tieBreak,
    reasons: [...reasons].toSorted(),
    rejected,
    points: state.points,
    winners: state.phase.kind === "gameOver" ? state.phase.winners : null,
    finalTaker,
  };
}
