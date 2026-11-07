// The cells a player's card is built from: the round header bar, the
// round's cells (row 1) and the points' marks and bar (row 2).

import { useTranslations } from "next-intl";
import { MitchiDie } from "@/components/mitchi-die";
import { MitchiHand } from "@/components/mitchi-hand";
import { handById } from "@/data/hands";
import { cn } from "@/lib/utils";
import type { Seat } from "../engine";
import type { PointsRowData, RoundBarData, RoundRowData } from "./board-slices";
import { DiePlaceholder } from "./die-placeholder";
import { Mark } from "./marks";
import { SeatLabel } from "./seat-label";
import { Comma, COUNT_KEYS } from "./spoken";

const DIE_SIZE = 22;
/** Wide enough for a hand or two placeholders, so neither moves the other. */
const DICE_WIDTH = "w-[49px]";

/** The phase of the game. Hidden before start, keeping its space. */
export function RoundBar({ bar }: { bar: RoundBarData | null }) {
  const t = useTranslations("play");
  const hands = useTranslations("hands");
  const title =
    bar === null
      ? null
      : bar.kind === "rollOff"
        ? t("players.highestDieStarts")
        : bar.kind === "tieBreak"
          ? t("header.tieBreak", { number: bar.number })
          : bar.kind === "endOfRound"
            ? t("header.endOfRound")
            : bar.kind === "gameOver"
              ? t("end.heading")
              : t("header.round", { number: bar.number });
  const tiedOn = bar?.kind === "tieBreak" ? handById(bar.tiedOn) : null;
  const rollLimit = bar?.kind === "round" ? bar.rollLimit : null;

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
      {bar?.kind === "round" ? (
        // Hidden until the starter's turn ends, keeping its space.
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-2",
            rollLimit === null && "invisible",
          )}
        >
          <Comma />
          <span className="text-xs font-semibold text-stone-700">
            {t("round.rollLimit")}
          </span>
          {rollLimit === null ? null : (
            <>
              <Comma />
              <span>{t(`rolls.${COUNT_KEYS[rollLimit]}`)}</span>
            </>
          )}
        </span>
      ) : null}
    </div>
  );
}

function Dice({ row, single }: { row: RoundRowData; single: boolean }) {
  const hands = useTranslations("hands");
  const { hand } = row;
  if (hand?.kind === "hand") {
    // High die first, as everywhere a hand is named; the rolled order is the
    // tray's, where each die is its own Keep button.
    const { high, low } = handById(hand.hand);
    return (
      <>
        <span aria-hidden className="flex">
          <MitchiHand high={high} low={low} size={DIE_SIZE} />
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

/**
 * A seat's round, as three grid cells: the starting mark, the seat, then the
 * marks, note and dice. The parent sets the grid
 * (`grid-cols-[22px_minmax(0,1fr)_auto]`) and the row's colours.
 */
export function RoundCells({
  row,
  viewerSeat,
  rollOff,
  winner,
}: {
  row: RoundRowData;
  viewerSeat: Seat;
  /** The roll to start: one die per seat. */
  rollOff: boolean;
  /** At game over: the trophy takes the seat's place. */
  winner: boolean;
}) {
  const t = useTranslations("play");
  const note = !row.inContest
    ? t("players.outOfTieBreak")
    : row.waiting
      ? t("players.waiting")
      : null;

  return (
    <>
      {/* The trophy, else the starting chip, else the seat number. */}
      <span className="flex justify-center">
        {/* The seat, not the player: the label beside it may be a name. Read
            aloud even when a mark takes its place on screen. */}
        <span className="sr-only">
          {t("players.seat", { number: row.seat + 1 })}
          <Comma />
        </span>
        {winner ? (
          <>
            <Mark name="winner" labelled />
            <Comma />
          </>
        ) : row.starting ? (
          <>
            <Mark name="starting" labelled />
            <Comma />
          </>
        ) : (
          <span
            aria-hidden
            className="flex size-5 items-center justify-center rounded-full text-xs font-bold text-stone-600 shadow-[inset_0_0_0_1.5px_var(--color-stone-300)]"
          >
            {row.seat + 1}
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
        {/* The note sits before the dice, so its length never moves them. */}
        {note ? (
          <>
            <Comma />
            <span
              className={cn("text-[13px]", row.inContest && "text-stone-700")}
            >
              {note}
            </span>
          </>
        ) : null}
        {row.inContest ? (
          <>
            {/* Placeholders are silent, so no comma before them. */}
            {row.hand ? <Comma /> : null}
            <span className={cn("flex", DICE_WIDTH)}>
              <Dice row={row} single={rollOff} />
            </span>
          </>
        ) : null}
      </span>
    </>
  );
}

/** Close to the limit, or reached it: the bar and the points turn red. */
export const isRed = (row: PointsRowData) => row.close || row.reachedLimit;

/**
 * The marks cell: leader, close or reached limit, or empty. The trophy is
 * not here: it takes the seat's place on the round row. A mark is followed
 * by a hidden comma.
 */
export function PointsMarks({ row }: { row: PointsRowData }) {
  const marked = row.leader || row.close || row.reachedLimit;
  return (
    <span className="flex justify-center gap-0.5">
      {row.leader ? <Mark name="leader" labelled /> : null}
      {row.close ? <Mark name="closeToLimit" labelled /> : null}
      {row.reachedLimit ? <Mark name="reachedLimit" labelled /> : null}
      {marked ? <Comma /> : null}
    </span>
  );
}

/** The points against the limit, drawn. Hidden: the points are text nearby. */
export function PointsBar({
  row,
  pointLimit,
  className,
}: {
  row: PointsRowData;
  pointLimit: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative block h-2 overflow-hidden rounded bg-stone-200 shadow-[inset_0_0_0_1px_var(--color-stone-300)]",
        className,
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 motion-safe:transition-[width]",
          isRed(row) ? "bg-red-600" : "bg-blue-600",
        )}
        style={{
          width: `${Math.min(100, (row.points / pointLimit) * 100)}%`,
        }}
      />
    </span>
  );
}
