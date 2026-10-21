"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Seat } from "../engine";
import type { BoardSlices } from "./board-slices";
import { GamePanel } from "./game-panel";
import { RoundPanel } from "./round-panel";

export type PlayersView = "thisRound" | "points";

/**
 * This round or Points, chosen by the user. It never switches by itself, at
 * game over included: the dice card carries the result. Two toggle buttons,
 * not a tablist: there is no automatic switching to justify that keyboard
 * model. Switching never moves focus.
 */
export function PlayersCard({
  slices,
  viewerSeat,
  defaultView = "thisRound",
}: {
  slices: Pick<BoardSlices, "roundBar" | "roundRows" | "points">;
  viewerSeat: Seat;
  /** The view on first render only, like `defaultValue`. */
  defaultView?: PlayersView;
}) {
  const t = useTranslations("play.players");
  const headingId = useId();
  const [view, setView] = useState<PlayersView>(defaultView);

  const option = (value: PlayersView, label: string) => (
    <button
      type="button"
      aria-pressed={view === value}
      onClick={() => setView(value)}
      className={cn(
        "focus-ring min-h-11 flex-1 rounded-[10px] text-[15px]",
        view === value
          ? "bg-white font-bold text-foreground shadow-[0_1px_3px_rgb(20_20_26/0.15)]"
          : "font-semibold text-stone-700",
      )}
    >
      {label}
    </button>
  );

  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-[22px] border border-stone-200 bg-stone-50 px-2.5 pt-2.5 pb-3.5">
      <h2 id={headingId} className="sr-only">
        {t("heading")}
      </h2>
      <div
        role="group"
        aria-labelledby={headingId}
        className="flex gap-1 rounded-[13px] bg-stone-100 p-1"
      >
        {option("thisRound", t("thisRound"))}
        {option("points", t("points"))}
      </div>
      {/* Both views share a minimum height, so switching moves nothing below. */}
      <div className="min-h-[470px]">
        {view === "thisRound" ? (
          <RoundPanel
            bar={slices.roundBar}
            rows={slices.roundRows}
            viewerSeat={viewerSeat}
          />
        ) : (
          <GamePanel data={slices.points} viewerSeat={viewerSeat} />
        )}
      </div>
    </section>
  );
}
