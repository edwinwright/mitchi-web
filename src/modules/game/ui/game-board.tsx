"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GameSession, GameState } from "../engine";
import { latestRollSeq, sliceSession } from "./board-slices";
import { CommentaryPanel } from "./commentary-panel";
import { commentaryRows } from "./commentary-rows";
import { DiceCard } from "./dice-card";
import { HOLD_MS } from "./hold";
import { PacingControls } from "./pacing-controls";
import { PlayersCard } from "./players-card";

/**
 * The only component that receives the session. DOM order is dice card,
 * pacing bar, players card, log, at every width. Below `xl` that is one
 * column; from `xl` the same order fills three columns left to right, so
 * visual order is DOM order and the tab order needs no exception. No
 * `order`, no grid areas.
 */
export function GameBoard({ session }: { session: GameSession }) {
  const { view, intents, pacing } = session;
  const { viewerSeat } = view;

  // The dice hold: the most recent roll stays on screen for one bot step,
  // then each turn shows placeholders. Display only: no intent waits for it.
  // The engine ends one turn and starts the next in a single step, so the gap
  // can only live here.
  const lastRoll = latestRollSeq(view.events);
  const speed = pacing?.speed ?? "normal";
  const [heldOver, setHeldOver] = useState<number | null>(null);
  useEffect(() => {
    if (lastRoll === null) return;
    // The one timer outside the session (WO-0017): display timing, not pacing.
    // eslint-disable-next-line no-restricted-globals -- the dice hold
    const id = setTimeout(() => setHeldOver(lastRoll), HOLD_MS[speed]);
    // eslint-disable-next-line no-restricted-globals -- the dice hold
    return () => clearTimeout(id);
  }, [lastRoll, speed]);
  const holding = lastRoll !== null && heldOver !== lastRoll;

  const slices = sliceSession(session, { holding });
  const rows = useMemo(
    () => commentaryRows(view.events, viewerSeat),
    [view.events, viewerSeat],
  );

  // Start, Next round and Play again are labels of the Roll node, so a key
  // press leaves focus on it already. A click may not focus a button (Safari),
  // so the flag still hands focus to Roll. Nothing else moves focus: not bot
  // play, not the end of a round or game, not the viewer's turn.
  const rollRef = useRef<HTMLButtonElement>(null);
  const focusRoll = useRef(false);
  const committedState = useRef<GameState>(view.state);
  useEffect(() => {
    // Cleared on the next commit whatever happened. A rejected or no-op
    // intent commits the same state and moves nothing, and a flag left over
    // from one must not let a later bot step steal focus.
    const moved = committedState.current !== view.state;
    committedState.current = view.state;
    const wanted = focusRoll.current;
    focusRoll.current = false;
    if (wanted && moved) rollRef.current?.focus();
  });
  const thenFocusRoll = (intent: () => void) => () => {
    focusRoll.current = true;
    intent();
  };

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[420px_370px_minmax(0,1fr)] xl:items-start xl:gap-8">
      <div className="flex min-w-0 flex-col gap-4">
        <DiceCard
          slices={slices}
          viewerSeat={viewerSeat}
          onPrimary={{
            start: thenFocusRoll(intents.newGame),
            roll: intents.roll,
            nextRound: thenFocusRoll(intents.nextRound),
            playAgain: thenFocusRoll(intents.newGame),
          }}
          onKeep={intents.setKeep}
          onStop={intents.stop}
          rollRef={rollRef}
        />
        {pacing ? <PacingControls pacing={pacing} /> : null}
      </div>
      <div className="min-w-0">
        <PlayersCard slices={slices} viewerSeat={viewerSeat} />
      </div>
      <div className="min-w-0">
        <CommentaryPanel rows={rows} viewerSeat={viewerSeat} />
      </div>
    </div>
  );
}
