"use client";

import { useEffect, useMemo, useRef } from "react";
import type { GameSession, GameState } from "../engine";
import { sliceSession } from "./board-slices";
import { CommentaryPanel } from "./commentary-panel";
import { commentaryRows } from "./commentary-rows";
import { DiceCard } from "./dice-card";
import { GamePanel } from "./game-panel";
import { PacingControls } from "./pacing-controls";
import { PlayersPanel } from "./players-panel";
import { RoundPanel } from "./round-panel";

/**
 * The only component that receives the session. DOM order is the 320px
 * order (dice card, pacing, round, players, commentary, game); on desktop
 * each panel is placed explicitly, never with `order`.
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
    <div className="grid min-w-0 gap-8 md:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-4 md:col-start-1 md:row-start-1">
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
      <div className="min-w-0 md:col-start-2 md:row-start-1">
        {slices.round ? <RoundPanel data={slices.round} /> : null}
      </div>
      <div className="min-w-0 md:col-start-1 md:row-start-2">
        <PlayersPanel data={slices.players} />
      </div>
      <div className="min-w-0 md:col-start-2 md:row-span-2 md:row-start-2">
        <CommentaryPanel rows={rows} viewerSeat={viewerSeat} />
      </div>
      <div className="min-w-0 md:col-start-1 md:row-start-3">
        <GamePanel data={slices.game} viewerSeat={viewerSeat} />
      </div>
    </div>
  );
}
