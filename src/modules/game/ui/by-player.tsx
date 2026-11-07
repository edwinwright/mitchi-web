import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Seat } from "../engine";
import type {
  PointsData,
  PointsRowData,
  RoundBarData,
  RoundRowData,
} from "./board-slices";
import { Legend } from "./legend";
import {
  isRed,
  PointsBar,
  PointsMarks,
  RoundBar,
  RoundCells,
} from "./player-cells";
import { Comma } from "./spoken";

function Card({
  round,
  points,
  pointLimit,
  viewerSeat,
  rollOff,
}: {
  round: RoundRowData;
  points: PointsRowData;
  pointLimit: number;
  viewerSeat: Seat;
  rollOff: boolean;
}) {
  const t = useTranslations("play");
  const red = isRed(points);

  return (
    <li
      aria-current={round.current ? "true" : undefined}
      className={cn(
        "flex flex-col rounded-xl pr-3 pb-2 pl-2",
        // Nobody is rolling at game over, so blue and gold never meet.
        round.current
          ? "bg-blue-50 shadow-[inset_0_0_0_2px_var(--color-blue-600)]"
          : points.winner
            ? "bg-gold-50 shadow-[inset_0_0_0_1.5px_var(--color-gold-600)]"
            : "bg-white shadow-[inset_0_0_0_1px_var(--color-stone-200)]",
      )}
    >
      {/* The round. Out of a tie-break mutes this row only: the points still count. */}
      <div
        className={cn(
          "grid h-12 grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2",
          !round.inContest && "text-muted",
        )}
      >
        <RoundCells row={round} viewerSeat={viewerSeat} rollOff={rollOff} />
      </div>
      <Comma />
      {/* The game. */}
      <div className="grid h-6 grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2.5">
        <PointsMarks row={points} />
        <span className="flex min-w-0 items-center gap-2.5">
          {points.winner ? (
            <>
              <span className="text-xs font-extrabold text-gold-800">
                {t("end.winner")}
              </span>
              <Comma />
            </>
          ) : null}
          <PointsBar
            row={points}
            pointLimit={pointLimit}
            className="min-w-10 flex-1"
          />
        </span>
        <span className="text-right text-[15px] whitespace-nowrap">
          <span aria-hidden>
            <span className={cn("font-bold", red && "text-red-700")}>
              {points.points}
            </span>
            <span className="text-stone-600"> / {pointLimit}</span>
          </span>
          <span className="sr-only">
            {t("players.pointsOf", {
              points: points.points,
              limit: pointLimit,
            })}
          </span>
        </span>
      </div>
    </li>
  );
}

/**
 * By player: one card per seat, the round on its first row and the game on
 * its second. `roundRows` and `points.rows` are both in seat order.
 */
export function ByPlayer({
  bar,
  roundRows,
  points,
  viewerSeat,
}: {
  bar: RoundBarData | null;
  roundRows: readonly RoundRowData[];
  points: PointsData;
  viewerSeat: Seat;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <RoundBar bar={bar} />
      <ol className="flex flex-col gap-1.5">
        {roundRows.map((round, index) => {
          const row = points.rows[index];
          if (row?.seat !== round.seat) {
            throw new Error(`No points row for seat ${round.seat}`);
          }
          return (
            <Card
              key={round.seat}
              round={round}
              points={row}
              pointLimit={points.pointLimit}
              viewerSeat={viewerSeat}
              rollOff={bar?.kind === "rollOff"}
            />
          );
        })}
      </ol>
      <div className="mt-1.5">
        <Legend
          items={[
            "rollingNow",
            "starting",
            "holdsWorst",
            "mitchi",
            ...(points.gameOver
              ? (["winner", "reachedLimit"] as const)
              : (["leader", "closeToLimit"] as const)),
          ]}
        />
      </div>
    </div>
  );
}
