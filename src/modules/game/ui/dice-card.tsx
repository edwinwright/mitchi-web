import type { Ref } from "react";
import type { DieSlot, Seat } from "../engine";
import { BeatAnnouncer, BeatStatus } from "./beat-status-line";
import type { BoardSlices, PrimaryAction } from "./board-slices";
import { DiceTray } from "./dice-tray";
import { RoundHeader } from "./round-header";

export type DiceCardProps = {
  slices: Pick<BoardSlices, "header" | "tray" | "controls" | "status">;
  viewerSeat: Seat;
  onPrimary: Record<PrimaryAction, () => void>;
  onKeep: (die: DieSlot, kept: boolean) => void;
  onStop: () => void;
  rollRef?: Ref<HTMLButtonElement>;
};

/**
 * The game: a player can play a whole game from this card alone. The round
 * summary on top, then what is happening now, the dice and the controls
 * below. Its `h2` is in the header. The announcer is the page's only live
 * region.
 */
export function DiceCard({
  slices,
  viewerSeat,
  onPrimary,
  onKeep,
  onStop,
  rollRef,
}: DiceCardProps) {
  const { header, tray, controls, status } = slices;
  return (
    <section className="min-w-0 overflow-hidden rounded-xl bg-stone-100">
      <RoundHeader header={header} />
      <BeatStatus status={status} viewerSeat={viewerSeat} />
      <BeatAnnouncer status={status} viewerSeat={viewerSeat} />
      <DiceTray
        tray={tray}
        controls={controls}
        stage={header.stage}
        viewerSeat={viewerSeat}
        onPrimary={onPrimary}
        onKeep={onKeep}
        onStop={onStop}
        rollRef={rollRef}
      />
    </section>
  );
}
