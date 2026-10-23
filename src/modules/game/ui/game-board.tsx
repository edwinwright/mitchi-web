"use client";

import { useMemo, useRef } from "react";
import type { GameSession } from "../engine";
import { sliceSession } from "./board-slices";
import { CommentaryPanel } from "./commentary-panel";
import { commentaryRows } from "./commentary-rows";
import { DiceCard } from "./dice-card";
import { PacingControls } from "./pacing-controls";
import { PlayersCard } from "./players-card";

/**
 * The only component that receives the session. DOM order is dice card,
 * pacing bar, players card, log, at every width. Below `lg` that is one
 * column. From `lg` the dice card and pacing bar stack in the first column,
 * the players card is beside them, and the log spans both below: visual
 * order is still DOM order, so the tab order needs no exception. No
 * `order`, no grid areas.
 */
export function GameBoard({ session }: { session: GameSession }) {
  const { view, intents, pacing } = session;
  const { viewerSeat } = view;

  const slices = sliceSession(session);
  const rows = useMemo(
    () => commentaryRows(view.events, viewerSeat),
    [view.events, viewerSeat],
  );

  // Start, Next round and Play again are labels of the Roll node, so a key
  // press leaves focus on it already. A click may not focus a button (Safari),
  // so the press focuses it, there and then: nothing is left pending for a
  // later commit, which a rejected intent never makes. Nothing else moves
  // focus: not bot play, not the end of a round or game, not the viewer's turn.
  const rollRef = useRef<HTMLButtonElement>(null);
  const thenFocusRoll = (intent: () => void) => () => {
    rollRef.current?.focus();
    intent();
  };

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
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
      <div className="min-w-0 lg:col-span-2">
        <CommentaryPanel rows={rows} viewerSeat={viewerSeat} />
      </div>
    </div>
  );
}
