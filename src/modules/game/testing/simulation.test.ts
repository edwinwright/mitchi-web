import { beforeAll, describe, expect, it } from "vitest";
import {
  applyAction,
  applyEvent,
  beatsOf,
  caughtUp,
  completeAction,
  createGame,
  isMitchi,
  receive,
  release,
  select,
  startPlayback,
  type Action,
  type ApplyResult,
  type GameEvent,
  type GameState,
  type LoggedBeat,
} from "../engine";
import { batchActions } from "./batch";
import {
  SIMULATION_CONFIG,
  simulateGame,
  type SimulationResult,
} from "./simulate";

const GAMES = 2000;
const SEEDS = Array.from({ length: GAMES }, (_, i) => i + 1);
const REASONS = [
  "beatsWorstHandSoFar",
  "goodEnough",
  "keepingHighDie",
  "rerollingBoth",
];
const SEATS = [0, 1, 2, 3];
const TIMEOUT_MS = 20_000;

/** Every intent a seat could send, completed with spare dice, in the order of `allowedIntents`. */
function accepted(state: GameState, seat: number) {
  const ok = (action: Parameters<typeof applyAction>[1]) =>
    applyAction(state, action).ok;
  return {
    roll: ok(completeAction(state, { type: "roll", seat }, [3, 4])),
    setKeep: ok({ type: "keep", seat, die: 0, kept: true }),
    stop: ok({ type: "stop", seat, reason: null }),
    nextRound: ok({ type: "nextRound" }),
    newGame: ok({ type: "newGame" }),
  };
}

/**
 * The invariants checked after every action of a game. Returns the
 * `onStep` hook and a report of what it found, so a failure names the
 * seed, the action and the check.
 */
function checker(seed: number) {
  const failures: string[] = [];
  let potsTaken = 0;
  const fail = (what: string, detail: unknown) =>
    failures.push(`seed ${seed}: ${what}: ${JSON.stringify(detail)}`);

  return {
    failures,
    onStep: ({
      state,
      action,
      result,
    }: {
      state: GameState;
      action: unknown;
      result: ReturnType<typeof applyAction>;
    }) => {
      // allowedIntents agrees with applyAction, for every seat.
      for (const seat of SEATS) {
        const allowed = select.allowedIntents(state, seat);
        const actual = accepted(state, seat);
        if (JSON.stringify(allowed) !== JSON.stringify(actual)) {
          fail("allowedIntents disagrees", {
            seat,
            allowed,
            actual,
            phase: state.phase.kind,
          });
        }
      }
      if (!result.ok) {
        fail("rejected", { action, code: result.rejection.code });
        return;
      }
      const next = result.state;

      // State is the fold of events: replaying them reproduces the engine's state.
      const folded = result.events.reduce(applyEvent, state);
      if (JSON.stringify(folded) !== JSON.stringify(next)) {
        fail("fold differs", { action, events: result.events });
      }

      // Points are integers, never decrease, and change only by the pot taken.
      next.points.forEach((p, seat) => {
        if (!Number.isInteger(p) || p < state.points[seat]) {
          fail("points went wrong", {
            seat,
            before: state.points,
            after: next.points,
          });
        }
      });
      for (const event of result.events) {
        if (event.type === "potTaken") potsTaken += event.pot;
      }
      const total = next.points.reduce((a, b) => a + b, 0);
      if (total !== potsTaken)
        fail("points do not sum to the pots taken", { total, potsTaken });

      // The pot is at least 1; in a main round with no tie-break it follows the Mitchis finished.
      const round = next.round;
      if (round) {
        if (round.pot < 1) fail("pot below 1", round.pot);
        if (next.phase.kind === "turn" && round.tieBreaks === 0) {
          const m = round.finished.filter((f) => isMitchi(f.hand)).length;
          const expected = m === 0 ? 1 : 2 * m;
          if (round.pot !== expected)
            fail("pot does not follow the Mitchis", {
              pot: round.pot,
              expected,
            });
        }
      }

      // At the end: every winner is on the fewest points, and the final taker is not one.
      if (next.phase.kind === "gameOver") {
        const fewest = Math.min(...next.points);
        const taker = result.events.find((e) => e.type === "potTaken");
        for (const winner of next.phase.winners) {
          if (next.points[winner] !== fewest)
            fail("winner not on the fewest", { winner, points: next.points });
          if (taker?.type === "potTaken" && taker.seat === winner) {
            fail("the final taker won", { winner });
          }
        }
        if (
          next.phase.winners.length !==
          next.points.filter((p) => p === fewest).length
        ) {
          fail("a seat on the fewest is missing from the winners", next.points);
        }
      }
    },
  };
}

const RIDERS = ["rollLimitSet", "worstHandChanged", "potChanged"];
const ACTIVE = ["rollOff", "turn", "tieBreak"];

/**
 * The checks at one released beat: the state shown names one turn, and no
 * panel could read a later one from it. Returns a failure per broken check,
 * tagged so each test reads its own.
 */
function checkBeat(
  s: GameState,
  beat: LoggedBeat,
  previous: LoggedBeat | null,
): string[] {
  const failures: string[] = [];
  const fail = (tag: string, what: string) =>
    failures.push(`${tag}: ${what} at ${beat.kind} ${beat.id}`);
  const { acting, phase, round } = s;

  // I1 to I6.
  if (acting !== null && !(acting >= 0 && acting < s.config.seats))
    fail("turn", "acting out of range");
  if (!ACTIVE.includes(phase.kind) && acting !== null)
    fail("turn", "acting outside a turn");
  if (phase.kind === "turn" && acting !== null && acting !== phase.seat)
    fail("turn", "acting is not the turn's seat");
  if (
    phase.kind === "tieBreak" &&
    acting !== null &&
    acting !== phase.order[phase.rolled.length]
  )
    fail("turn", "acting is not the next tie-break roller");
  if (
    phase.kind === "rollOff" &&
    acting !== null &&
    acting !==
      phase.seats.find((seat) => !phase.rolled.some((r) => r.seat === seat))
  )
    fail("turn", "acting is not the next seat to roll to start");
  if (
    JSON.stringify(select.toRoll(s)) !==
    JSON.stringify(acting === null ? [] : [acting])
  )
    fail("turn", "toRoll is not [acting]");
  if (acting === null && ACTIVE.includes(phase.kind)) {
    for (const seat of SEATS) {
      if (Object.values(select.allowedIntents(s, seat)).some(Boolean))
        fail("turn", `seat ${seat} may act while nobody is acting`);
    }
  }

  // The subject of the beat.
  const absorbed = beat.events.find((e) => e.type === "turnStarted");
  switch (beat.kind) {
    case "turnStarted":
    case "rolled":
    case "keepSet":
    case "keepSwapped":
      if (acting !== beat.seat) fail("turn", "the subject is not acting");
      break;
    case "turnEnded":
    case "tieBreakRolled":
    case "rollOffRolled":
      if (acting !== null) fail("turn", "a seat is acting after a hand");
      if (beat.seat === null || select.seatHand(s, beat.seat) === null)
        fail("turn", "the subject shows no hand");
      break;
    case "tieBreakStarted":
    case "rollOffStarted":
    case "potTaken":
    case "gameEnded":
      if (acting !== null) fail("turn", "a seat is acting");
      break;
    case "roundStarted":
      // Round 1 names the starter on its own beat; their turn starts on the next.
      if (
        beat.events[0].type === "roundStarted" &&
        beat.events[0].round === 1
      ) {
        if (acting !== null || absorbed)
          fail("turn", "round 1 starts with a seat acting");
        break;
      }
    // falls through: a later round's start carries the starter's turn.
    case "gameStarted":
      if (absorbed?.type !== "turnStarted" || acting !== absorbed.seat)
        fail("turn", "acting is not the absorbed turn's seat");
      break;
  }

  // Not later.
  if (absorbed?.type === "turnStarted" && absorbed.context === "round") {
    if (
      phase.kind !== "turn" ||
      phase.dice !== null ||
      phase.kept.some(Boolean)
    )
      fail("turn", "a fresh turn already has dice or keeps");
  }
  if (absorbed?.type === "turnStarted" && absorbed.context === "rollOff") {
    if (phase.kind !== "rollOff" || phase.rolled.some((r) => r.seat === acting))
      fail("turn", "the seat to roll to start has rolled");
  }
  if (phase.kind === "turn" && round && acting !== null) {
    const at = round.order.indexOf(acting);
    if (round.finished.some((f) => round.order.indexOf(f.seat) > at))
      fail("turn", "a later seat has a finished hand");
  }
  if (beat.kind === "keepSet" && beat.events[0].type === "keepSet") {
    if (!beat.events[0].kept) fail("turn", "a lone un-keep is a beat");
  }

  // The pot beat that ends the game, and the beat before every pot.
  const limit = select.limitReached(s);
  if (limit && beat.kind !== "potTaken")
    fail("limit", "limitReached off the pot beat");
  if (beat.kind === "gameEnded") {
    const previousLimit =
      previous?.kind === "potTaken" &&
      previous.events[0].type === "potTaken" &&
      previous.events[0].points >= s.config.pointLimit;
    if (!previousLimit) fail("limit", "gameEnded without a limit pot beat");
  }
  if (
    beat.kind === "potTaken" &&
    previous?.kind !== "turnEnded" &&
    previous?.kind !== "tieBreakRolled"
  )
    fail("pot", `pot taken after ${previous?.kind}`);

  // Stamps.
  if (
    beat.id !== beat.events[0].seq ||
    beat.events.some((e) => e.beat !== beat.id)
  )
    fail("stamp", "beat is not the seq of its first event");
  return failures;
}

type Step = { readonly action: Action; readonly result: ApplyResult };

/**
 * Plays a game's accepted actions through a Playback one beat at a time,
 * batched as the store batches a bot's keep swap.
 */
function replay(seed: number, steps: readonly Step[]): string[] {
  const failures: string[] = [];
  let playback = startPlayback(createGame(SIMULATION_CONFIG));
  let previous: LoggedBeat | null = null;
  let previousLimit = false;
  let index = 0;
  const stream: GameEvent[] = [];
  for (const batch of batchActions(steps.map((step) => step.action))) {
    const size = Array.isArray(batch) ? batch.length : 1;
    const results = steps.slice(index, index + size).map((step) => step.result);
    index += size;
    const events = results.flatMap((r) => (r.ok ? r.events : []));
    stream.push(...events);
    playback = receive(playback, events);
    while (!caughtUp(playback)) {
      playback = release(playback);
      const beat = select.lastBeat(playback.released);
      if (!beat) {
        failures.push(`turn: seed ${seed}: nothing released`);
        continue;
      }
      if (previousLimit && beat.kind !== "gameEnded")
        failures.push(`limit: seed ${seed}: ${beat.kind} after the limit pot`);
      failures.push(
        ...checkBeat(playback.shown, beat, previous).map(
          (f) => `${f} (seed ${seed})`,
        ),
      );
      previousLimit = select.limitReached(playback.shown);
      previous = beat;
    }
    const last = results.at(-1);
    if (
      last?.ok &&
      JSON.stringify(playback.shown) !== JSON.stringify(last.state)
    )
      failures.push(`state: seed ${seed}: shown differs after batch ${index}`);
  }

  try {
    const beats = beatsOf(stream);
    if (
      JSON.stringify(beats.flatMap((b) => b.events)) !== JSON.stringify(stream)
    )
      failures.push(
        `beats: seed ${seed}: the beats do not give the stream back`,
      );
    if (beats.some((b) => RIDERS.includes(b.events[0].type)))
      failures.push(`beats: seed ${seed}: a beat starts with a rider`);
  } catch (error) {
    failures.push(`beats: seed ${seed}: ${String(error)}`);
  }
  return failures;
}

type Run = { result: SimulationResult; failures: string[]; replay: string[] };

function runAll(): Run[] {
  return SEEDS.map((seed) => {
    const { failures, onStep } = checker(seed);
    const steps: Step[] = [];
    const result = simulateGame(seed, {
      onStep: (step) => {
        onStep(step);
        if (step.result.ok) steps.push(step);
      },
    });
    return { result, failures, replay: replay(seed, steps) };
  });
}

const replayFailures = (tag: string) =>
  RUN.flatMap((r) => r.replay.filter((f) => f.startsWith(`${tag}:`))).slice(
    0,
    5,
  );

const percentile = (values: number[], p: number) => {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
};

// One run feeds every assertion below, so the games are played once.
let RUN: Run[] = [];
beforeAll(() => {
  RUN = runAll();
}, TIMEOUT_MS);

const median = (values: number[]) => {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

describe("simulation", () => {
  it(
    "same seeds give the same results",
    () => {
      const again = SEEDS.slice(0, 200).map((seed) => simulateGame(seed));
      expect(again).toStrictEqual(RUN.slice(0, 200).map((r) => r.result));
    },
    TIMEOUT_MS,
  );

  it("bot requests are never rejected", () => {
    const rejected = RUN.filter((r) => r.result.rejected).map((r) => r.result);
    expect(rejected.map((r) => [r.seed, r.rejected])).toStrictEqual([]);
  });

  it("every game ends within the caps", () => {
    const stuck = RUN.filter((r) => !r.result.ended).map((r) => r.result.seed);
    expect(stuck).toStrictEqual([]);
    expect(Math.max(...RUN.map((r) => r.result.rounds))).toBeLessThanOrEqual(
      60,
    );
  });

  it("allowedIntents agrees with applyAction", () => {
    const failures = RUN.flatMap((r) =>
      r.failures.filter((f) => f.includes("allowedIntents")),
    );
    expect(failures.slice(0, 5)).toStrictEqual([]);
  });

  it("the points and pot invariants hold after every action", () => {
    const failures = RUN.flatMap((r) =>
      r.failures.filter(
        (f) =>
          !f.includes("allowedIntents") &&
          !f.includes("fold differs") &&
          !f.includes("winner") &&
          !f.includes("final taker"),
      ),
    );
    expect(failures.slice(0, 5)).toStrictEqual([]);
  });

  it("winners have the minimum score and exclude the final taker", () => {
    const failures = RUN.flatMap((r) =>
      r.failures.filter(
        (f) => f.includes("winner") || f.includes("final taker"),
      ),
    );
    expect(failures.slice(0, 5)).toStrictEqual([]);
    for (const { result } of RUN) {
      expect(result.winners).not.toBeNull();
      expect(result.winners).not.toContain(result.finalTaker);
    }
  });

  describe("fold equivalence", () => {
    it("events.reduce(applyEvent, state) deep-equals result.state for every accepted action (2,000 games)", () => {
      const failures = RUN.flatMap((r) =>
        r.failures.filter((f) => f.includes("fold differs")),
      );
      expect(failures.slice(0, 5)).toStrictEqual([]);
    });
  });

  describe("playback replay", () => {
    it("every released beat is a consistent turn", () => {
      expect(replayFailures("turn")).toStrictEqual([]);
    });

    it("limitReached exactly on the potTaken beat before gameEnded", () => {
      expect(replayFailures("limit")).toStrictEqual([]);
    });
  });

  describe("last-beat state", () => {
    it("after the last beat of each batch, shown deep-equals the engine state", () => {
      expect(replayFailures("state")).toStrictEqual([]);
    });
  });

  describe("beats", () => {
    it("mean < 200, p95 < 300, max < 400", () => {
      const beats = RUN.map((r) => r.result.beats);
      const stats = {
        mean: beats.reduce((a, b) => a + b, 0) / beats.length,
        p95: percentile(beats, 0.95),
        max: Math.max(...beats),
      };
      console.info("Beats per game", stats);
      expect(stats.mean).toBeLessThan(200);
      expect(stats.p95).toBeLessThan(300);
      expect(stats.max).toBeLessThan(400);
    });

    it("LoggedEvent.beat equals the seq of its beat's first event", () => {
      expect(replayFailures("stamp")).toStrictEqual([]);
    });

    it("every pot taken is preceded by a turnEnded beat", () => {
      // Or by the last tie-break roll, when the round went to a tie-break.
      expect(replayFailures("pot")).toStrictEqual([]);
    });

    it("beatsOf gives the whole stream back, each beat led by a headline", () => {
      expect(replayFailures("beats")).toStrictEqual([]);
    });
  });

  it("only the four reason codes are emitted", () => {
    const seen = new Set(RUN.flatMap((r) => r.result.reasons));
    expect([...seen].toSorted()).toStrictEqual(REASONS);
  });

  it("the games look like Mitchi: rounds, Mitchis and tie-breaks", () => {
    const rounds = RUN.map((r) => r.result.rounds);
    const share = (pick: (r: SimulationResult) => boolean) =>
      RUN.filter((r) => pick(r.result)).length / RUN.length;
    const stats = {
      medianRounds: median(rounds),
      mitchi: share((r) => r.mitchi),
      tieBreak: share((r) => r.tieBreak),
    };
    // Thresholds are pinned to what the seeded run found, not to the requirements' assumption.
    expect(stats.medianRounds).toBeGreaterThanOrEqual(6);
    expect(stats.medianRounds).toBeLessThanOrEqual(10);
    expect(stats.mitchi).toBeGreaterThanOrEqual(0.85);
    expect(stats.tieBreak).toBeGreaterThanOrEqual(0.3);
  });

  it("draws happen and are never the final taker", () => {
    const draws = RUN.filter((r) => (r.result.winners?.length ?? 0) > 1);
    expect(draws.length).toBeGreaterThan(0);
  });
});
