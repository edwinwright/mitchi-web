import { useTranslations } from "next-intl";
import { MitchiDie } from "@/components/mitchi-die";
import { MitchiHand } from "@/components/mitchi-hand";
import { handById } from "@/data/hands";
import { cn } from "@/lib/utils";
import type { Seat } from "../engine";
import type { RoundBarData, RoundRowData } from "./board-slices";
import { DiePlaceholder } from "./die-placeholder";
import { Legend } from "./legend";
import { Mark } from "./marks";
import { SeatLabel } from "./seat-label";

const DIE_SIZE = 22;
const ROLLED_IN = [null, "one", "two", "three"] as const;

/** A hidden comma, so a row reads as one phrase. */
const Comma = () => <span className="sr-only">, </span>;

function RoundBar({ bar }: { bar: RoundBarData | null }) {
  const t = useTranslations("play");
  const hands = useTranslations("hands");
  const title =
    bar === null
      ? null
      : bar.kind === "rollOff"
        ? t("players.highestDieStarts")
        : bar.kind === "tieBreak"
          ? t("header.tieBreak", { number: bar.number })
          : t("header.round", { number: bar.number });
  const tiedOn = bar?.kind === "tieBreak" ? handById(bar.tiedOn) : null;

  return (
    <div
      className={cn(
        "flex h-12 items-center gap-x-3 gap-y-2 rounded-xl bg-stone-100 px-3 text-sm font-bold",
        bar === null && "invisible",
      )}
    >
      <span>{title}</span>
      {bar?.kind === "tieBreak" && tiedOn ? (
        <span className="ml-auto inline-flex items-center gap-2">
          <Comma />
          <span className="text-xs font-semibold text-stone-700">
            {t("round.tiedOn")}
          </span>
          <span aria-hidden className="flex">
            <MitchiHand high={tiedOn.high} low={tiedOn.low} size={20} />
          </span>
          <span className="sr-only">{hands(bar.tiedOn)}</span>
        </span>
      ) : null}
    </div>
  );
}

function Dice({ row, single }: { row: RoundRowData; single: boolean }) {
  const hands = useTranslations("hands");
  const { hand } = row;
  if (hand?.kind === "hand") {
    return (
      <>
        <span aria-hidden className="flex">
          <MitchiHand high={hand.dice[0]} low={hand.dice[1]} size={DIE_SIZE} />
        </span>
        <span className="sr-only">{hands(hand.hand)}</span>
      </>
    );
  }
  if (hand?.kind === "die") {
    return (
      <>
        <MitchiDie face={hand.face} size={DIE_SIZE} />
        <span className="sr-only">{hand.face}</span>
      </>
    );
  }
  // Nothing rolled yet: one placeholder in the roll to start, two otherwise.
  return (
    <span aria-hidden className="flex gap-[3px]">
      <DiePlaceholder size={DIE_SIZE} />
      {single ? null : <DiePlaceholder size={DIE_SIZE} />}
    </span>
  );
}

function Row({
  row,
  viewerSeat,
  rollOff,
}: {
  row: RoundRowData;
  viewerSeat: Seat;
  /** The roll to start: one die per seat. */
  rollOff: boolean;
}) {
  const t = useTranslations("play");
  const { hand } = row;
  const rolledIn =
    hand?.kind === "hand" && hand.final && hand.rollsUsed !== null
      ? ROLLED_IN[hand.rollsUsed]
      : null;
  const note = !row.inContest
    ? t("players.outOfTieBreak")
    : row.waiting
      ? t("players.waiting")
      : rolledIn
        ? t(`rolledIn.${rolledIn}`)
        : null;

  return (
    <li
      aria-current={row.current ? "true" : undefined}
      className={cn(
        "grid h-14 grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl pr-3 pl-2",
        row.current
          ? "bg-blue-50 shadow-[inset_0_0_0_2px_var(--color-blue-600)]"
          : "bg-white shadow-[inset_0_0_0_1px_var(--color-stone-200)]",
        // The muted colour, never a faded row: faded text fails contrast.
        !row.inContest && "text-muted",
      )}
    >
      <span className="flex justify-center">
        {row.starting ? (
          <>
            <Mark name="starting" labelled />
            <Comma />
          </>
        ) : (
          <span aria-hidden className="text-[15px] text-stone-500">
            –
          </span>
        )}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "text-base",
            row.current ? "font-extrabold" : "font-semibold",
          )}
        >
          <SeatLabel seat={row.seat} viewerSeat={viewerSeat} />
        </span>
        {row.current ? (
          <span className="sr-only">
            <Comma />
            {t("players.rollingNow")}
          </span>
        ) : null}
      </span>
      <span className="flex items-center gap-2.5">
        <span className="flex min-w-[22px] justify-center gap-1">
          {row.holdsWorst ? (
            <>
              <Comma />
              <Mark name="holdsWorst" labelled />
            </>
          ) : null}
          {row.mitchi ? (
            <>
              <Comma />
              <Mark name="mitchi" labelled />
            </>
          ) : null}
        </span>
        {row.inContest ? (
          <>
            <Comma />
            <Dice row={row} single={rollOff} />
          </>
        ) : null}
        {note ? (
          <>
            <Comma />
            <span
              className={cn(
                "min-w-[50px] text-[13px]",
                row.inContest && "text-stone-700",
              )}
            >
              {note}
            </span>
          </>
        ) : null}
      </span>
    </li>
  );
}

/** This round, by player: who is rolling, what each seat holds. */
export function RoundPanel({
  bar,
  rows,
  viewerSeat,
}: {
  bar: RoundBarData | null;
  rows: readonly RoundRowData[];
  viewerSeat: Seat;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <RoundBar bar={bar} />
      <ol className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <Row
            key={row.seat}
            row={row}
            viewerSeat={viewerSeat}
            rollOff={bar?.kind === "rollOff"}
          />
        ))}
      </ol>
      <div className="mt-1.5">
        <Legend items={["rollingNow", "starting", "holdsWorst", "mitchi"]} />
      </div>
    </div>
  );
}
