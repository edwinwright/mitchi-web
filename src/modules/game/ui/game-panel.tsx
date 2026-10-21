import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Seat } from "../engine";
import type { PointsData, PointsRowData } from "./board-slices";
import { Legend } from "./legend";
import { Mark } from "./marks";
import { SeatLabel } from "./seat-label";

/** A hidden comma, so a row reads as one phrase. */
const Comma = () => <span className="sr-only">, </span>;

function Row({
  row,
  pointLimit,
  viewerSeat,
}: {
  row: PointsRowData;
  pointLimit: number;
  viewerSeat: Seat;
}) {
  const t = useTranslations("play");
  const red = row.close || row.reachedLimit;
  const marked = row.fewest || row.close || row.reachedLimit;

  return (
    <li
      className={cn(
        "grid h-14 grid-cols-[22px_minmax(0,1fr)_minmax(40px,1fr)_30px] items-center gap-2.5 rounded-xl pr-3 pl-2",
        row.fewest
          ? "bg-gold-50 shadow-[inset_0_0_0_1.5px_var(--color-gold-600)]"
          : "bg-white shadow-[inset_0_0_0_1px_var(--color-stone-200)]",
      )}
    >
      <span className="flex justify-center gap-0.5">
        {row.fewest ? <Mark name="fewestPoints" labelled /> : null}
        {row.close ? <Mark name="closeToLimit" labelled /> : null}
        {row.reachedLimit ? <Mark name="reachedLimit" labelled /> : null}
        {marked ? (
          <Comma />
        ) : (
          <span aria-hidden className="text-[15px] text-stone-500">
            –
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
        <span className="text-base font-semibold">
          <SeatLabel seat={row.seat} viewerSeat={viewerSeat} />
        </span>
        {row.winner ? (
          <>
            <Comma />
            <span className="text-xs font-extrabold text-gold-800">
              {t("end.winner")}
            </span>
          </>
        ) : null}
      </span>
      <span
        aria-hidden
        className="relative block h-2 overflow-hidden rounded bg-stone-200 shadow-[inset_0_0_0_1px_var(--color-stone-300)]"
      >
        <span
          className={cn(
            "absolute inset-y-0 left-0 motion-safe:transition-[width]",
            red ? "bg-red-600" : "bg-blue-600",
          )}
          style={{
            width: `${Math.min(100, (row.points / pointLimit) * 100)}%`,
          }}
        />
      </span>
      <span
        className={cn(
          "text-right text-[15px] font-bold",
          red && "text-red-700",
        )}
      >
        <Comma />
        <span className="sr-only">{t("players.points")} </span>
        {row.points}
      </span>
    </li>
  );
}

/** Points: the game so far, against the point limit. */
export function GamePanel({
  data,
  viewerSeat,
}: {
  data: PointsData;
  viewerSeat: Seat;
}) {
  const t = useTranslations("play");
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid h-12 grid-cols-[minmax(0,1fr)_auto_30px] items-center gap-2.5 rounded-xl bg-stone-100 px-3">
        <span
          className={cn(
            "text-sm leading-tight",
            data.gameOver ? "font-bold" : "text-stone-700",
          )}
        >
          {data.gameOver ? t("end.standings") : t("game.usuallyTo25")}
        </span>
        <span className="text-right text-xs font-semibold text-stone-700">
          {t("game.pointLimit")}
        </span>
        <strong className="text-right text-base">{data.pointLimit}</strong>
      </div>
      <ol className="flex flex-col gap-1.5">
        {data.rows.map((row) => (
          <Row
            key={row.seat}
            row={row}
            pointLimit={data.pointLimit}
            viewerSeat={viewerSeat}
          />
        ))}
      </ol>
      <div className="mt-1.5">
        <Legend
          items={[
            "fewestPoints",
            data.gameOver ? "reachedLimit" : "closeToLimit",
          ]}
        />
      </div>
    </div>
  );
}
