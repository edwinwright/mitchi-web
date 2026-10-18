"use client";

import { useEffect, useMemo, useRef } from "react";
import type { GameSession } from "../engine";
import { sliceSession } from "./board-slices";
import { CommentaryPanel } from "./commentary-panel";
import { commentaryRows } from "./commentary-rows";
import { DicePanel } from "./dice-panel";
import { EndScreen } from "./end-screen";
import { GamePanel } from "./game-panel";
import { PacingControls } from "./pacing-controls";
import { PlayersPanel } from "./players-panel";
import { RoundPanel } from "./round-panel";

/**
 * The only component that receives the session. DOM order is the 320px
 * order (dice, round, players, commentary, game); on desktop each panel is
 * placed explicitly, never with `order`.
 */
export function GameBoard({ session }: { session: GameSession }) {
  const { view, intents, pacing } = session;
  const { viewerSeat } = view;
  const slices = sliceSession(session);
  const rows = useMemo(
    () => commentaryRows(view.events, viewerSeat),
    [view.events, viewerSeat],
  );

  // Start, Next round and Play again hand focus to Roll. Nothing else moves
  // focus: not bot play, not the end of a round or game, not the viewer's turn.
  const rollRef = useRef<HTMLButtonElement>(null);
  const focusRoll = useRef(false);
  useEffect(() => {
    // Cleared whether or not focus moved: a flag left over from a rejected or
    // no-op intent must not let a later bot step steal focus.
    const wanted = focusRoll.current;
    focusRoll.current = false;
    if (wanted) rollRef.current?.focus();
  });
  const thenFocusRoll = (intent: () => void) => () => {
    focusRoll.current = true;
    intent();
  };

  const { controls } = slices;
  return (
    <div className="grid min-w-0 gap-8 md:grid-cols-2">
      <div className="min-w-0 md:col-start-1 md:row-start-1">
        <DicePanel
          data={slices.dice}
          controls={controls}
          onStart={thenFocusRoll(intents.newGame)}
          onRoll={intents.roll}
          onKeep={intents.setKeep}
          onStop={intents.stop}
          onNextRound={thenFocusRoll(intents.nextRound)}
          rollRef={rollRef}
          footer={pacing ? <PacingControls pacing={pacing} /> : null}
        />
      </div>
      <div className="min-w-0 md:col-start-2 md:row-start-1">
        {slices.end ? (
          <EndScreen
            data={slices.end}
            viewerSeat={viewerSeat}
            playAgain={thenFocusRoll(intents.newGame)}
            unavailable={!controls.newGame}
            busy={controls.busy}
          />
        ) : slices.round ? (
          <RoundPanel data={slices.round} />
        ) : null}
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
