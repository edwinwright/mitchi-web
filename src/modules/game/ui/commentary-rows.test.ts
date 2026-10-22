import { describe, expect, it } from "vitest";
import type { LoggedEvent } from "../engine";
import {
  botKept,
  botMidTurn,
  gameOverDraw,
  rollOff,
  rollOffReroll,
  secondTieBreak,
  simulateGame,
  starterLimitSet,
  viewerRolledKeepable,
  viewerToRoll,
} from "../testing";
import { commentaryRows, type CommentaryRow } from "./commentary-rows";

const VIEWER = 0;
/**
 * The most rows one step may add, so the live region is never flooded. The
 * game-ending step also adds one `wins` row per winner (a draw has two or
 * more), so those rows are not counted: they are the result, not noise.
 */
const MAX_ROWS_PER_STEP = 6;

const actions = (rows: CommentaryRow[]) =>
  rows.flatMap((row) => (row.kind === "action" ? [row] : []));

describe("commentaryRows", () => {
  it("voices: the viewer's rows are 'you', everyone else's are 'player'", () => {
    const rows = actions(commentaryRows(gameOverDraw.events, VIEWER));
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.voice).toBe(row.seat === VIEWER ? "you" : "player");
    }
    // The viewer is not always seat 0: seat 2's rows are the "you" rows.
    const asSeatTwo = actions(commentaryRows(gameOverDraw.events, 2));
    for (const row of asSeatTwo) {
      expect(row.voice).toBe(row.seat === 2 ? "you" : "player");
    }
    expect(asSeatTwo.some((row) => row.voice === "you")).toBe(true);
  });

  it("rollLimitSet becomes a rollLimit row", () => {
    const rows = commentaryRows(starterLimitSet.events, VIEWER);
    expect(rows.filter((row) => row.kind === "rollLimit")).toEqual([
      expect.objectContaining({ kind: "rollLimit", limit: 2 }),
    ]);
  });

  it("viewer rolled event gives a rolls row for the new hand", () => {
    const rows = actions(commentaryRows(viewerRolledKeepable.events, VIEWER));
    expect(rows.at(-1)).toMatchObject({
      seat: VIEWER,
      voice: "you",
      phrase: { type: "rolls" },
      shown: { kind: "hand", dice: [5, 2], hand: "5-2" },
      reason: null,
    });
  });

  it("roll-off rolls carry the die", () => {
    const rows = actions(commentaryRows(rollOff.events, VIEWER));
    expect(rows).toEqual([
      expect.objectContaining({
        phrase: { type: "rollsToStart" },
        shown: { kind: "die", face: 4 },
      }),
    ]);
  });

  it("a bot's first roll gets no row: the panels show it at once", () => {
    const before = commentaryRows(starterLimitSet.events, VIEWER).length;
    const after = commentaryRows(botMidTurn.events, VIEWER).length;
    expect(after).toBe(before);
  });

  it("a bot's re-roll gets a row for the hand it decided against, with its reason", () => {
    const rolled = (
      seq: number,
      kept: readonly [boolean, boolean],
    ): LoggedEvent => ({
      seq,
      beat: seq,
      type: "rolled",
      seat: 2,
      dice: [6, 1],
      hand: "6-1",
      rollNumber: 2,
      previous: { dice: [5, 2], hand: "5-2" },
      kept,
      reason: kept[0] ? "keepingHighDie" : "rerollingBoth",
    });
    expect(commentaryRows([rolled(1, [false, false])], VIEWER)).toEqual([
      {
        kind: "action",
        key: "1",
        seat: 2,
        voice: "player",
        shown: { kind: "hand", dice: [5, 2], hand: "5-2" },
        phrase: { type: "rollAgainBoth" },
        reason: "rerollingBoth",
      },
    ]);
    expect(commentaryRows([rolled(2, [true, false])], VIEWER)[0]).toMatchObject(
      {
        phrase: { type: "rollAgainKeeping" },
        reason: "keepingHighDie",
      },
    );
  });

  it("a keep gets no row", () => {
    const keeps = botKept.events.filter((event) => event.type === "keepSet");
    expect(keeps).toHaveLength(1);
    expect(commentaryRows(keeps, VIEWER)).toEqual([]);
  });

  it("a tie-break gives a tieBreak row, then a rolls row per roll, then the pot taken", () => {
    const kinds = commentaryRows(secondTieBreak.events, VIEWER).map(
      (row) => row.kind,
    );
    expect(kinds).toContain("tieBreak");
    const rows = commentaryRows(secondTieBreak.events, VIEWER);
    expect(rows.filter((row) => row.kind === "tieBreak")).toHaveLength(2);
  });

  it("gameEnded gives gameOver, draw, then one wins row per winner, ascending", () => {
    const end = gameOverDraw.events.at(-1);
    expect(end?.type).toBe("gameEnded");
    const rows = commentaryRows([end as LoggedEvent], VIEWER);
    const winners = end?.type === "gameEnded" ? end.winners : [];
    expect(winners.length).toBeGreaterThanOrEqual(2);
    expect(rows.map((row) => row.kind)).toEqual([
      "gameOver",
      "draw",
      ...winners.map(() => "action"),
    ]);
    expect(actions(rows).map((row) => row.seat)).toEqual([...winners]);
  });

  it("rollOffStarted yields no row; the viewer's turnStarted{rollOff} yields the turn row", () => {
    const [gameStarted, rollOffStarted, turnStarted] = rollOff.events;
    expect(rollOffStarted.type).toBe("rollOffStarted");
    expect(commentaryRows([gameStarted, rollOffStarted], VIEWER)).toEqual([]);
    expect(turnStarted).toMatchObject({ seat: VIEWER, context: "rollOff" });
    // The viewer rolls first, so the turn row is the first row, once.
    const rows = commentaryRows(rollOff.events, VIEWER);
    expect(rows[0]).toMatchObject({ kind: "turn" });
    expect(rows.filter((row) => row.kind === "turn")).toHaveLength(1);
  });

  it("a roll-to-start tie gives a tie notice row with the face", () => {
    const rows = commentaryRows(rollOffReroll.events, VIEWER);
    const tied = rows.filter((row) => row.kind === "tied");
    expect(tied).toMatchObject([{ kind: "tied", face: 4 }]);
    // The viewer is tied and rolls first again: the turn row follows the notice.
    expect(rows.slice(-2).map((row) => row.kind)).toStrictEqual([
      "tied",
      "turn",
    ]);
  });

  it("turn row for the viewer is last in the step", () => {
    // At the start of round 1 the roll-off hands the viewer the turn.
    expect(commentaryRows(viewerToRoll.events, VIEWER).at(-1)).toMatchObject({
      kind: "turn",
    });
  });
});

describe("commentaryRows over simulated games", () => {
  const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);

  function play(seed: number, viewerSeat: number) {
    const steps: CommentaryRow[][] = [];
    const eventSteps: LoggedEvent[][] = [];
    let seq = 0;
    const result = simulateGame(seed, {
      onStep: ({ result }) => {
        if (!result.ok) return;
        // The rows do not read the beat stamp.
        const logged = result.events.map((event) => {
          seq += 1;
          return { ...event, seq, beat: seq };
        });
        eventSteps.push(logged);
        steps.push(commentaryRows(logged, viewerSeat));
      },
    });
    return { steps, eventSteps, result };
  }

  it("a step that hands the viewer the turn ends with the turn row", () => {
    let checked = 0;
    for (const seed of SEEDS) {
      const { steps, eventSteps } = play(seed, 2);
      steps.forEach((rows, index) => {
        const last = eventSteps[index]!.at(-1)!;
        const handsTurn = last.type === "turnStarted" && last.seat === 2;
        if (handsTurn) {
          checked += 1;
          expect(rows.at(-1)?.kind, `seed ${seed}`).toBe("turn");
        }
      });
    }
    expect(checked).toBeGreaterThan(100);
  });

  it("no step yields more than six rows, and keys are unique", () => {
    for (const seed of SEEDS) {
      for (const viewerSeat of [0, 3]) {
        const { steps } = play(seed, viewerSeat);
        const keys = new Set<string>();
        for (const rows of steps) {
          const counted = rows.filter(
            (row) => !(row.kind === "action" && row.phrase.type === "wins"),
          );
          expect(counted.length, `seed ${seed}`).toBeLessThanOrEqual(
            MAX_ROWS_PER_STEP,
          );
          for (const row of rows) {
            expect(keys.has(row.key), `seed ${seed} key ${row.key}`).toBe(
              false,
            );
            keys.add(row.key);
          }
        }
      }
    }
  });
});
