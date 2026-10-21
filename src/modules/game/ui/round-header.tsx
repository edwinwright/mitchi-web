import { Fragment, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { MitchiHand } from "@/components/mitchi-hand";
import { handById, type HandId } from "@/data/hands";
import { cn } from "@/lib/utils";
import type { Seat } from "../engine";
import type { HeaderData } from "./board-slices";
import { DiePlaceholder } from "./die-placeholder";
import { SeatLabel } from "./seat-label";

const COUNT_KEYS = ["none", "one", "two", "three"] as const;
const LABEL = "text-xs font-semibold text-stone-300";
const DIE_SIZE = 26;

type Cells = {
  /** Above the heading. null keeps its space. */
  label: ReactNode[] | null;
  /** A seat and the phrase after it are separate cells, never one sentence. */
  heading: [ReactNode] | [ReactNode, string];
  pot: number | null;
  /** Line 2, left: a label and a hand, or placeholders while there is none. */
  hand: { label: string; hand: HandId | null } | null;
  /** Line 2, right. */
  rollLimit: string | null;
};

/** Hidden commas between cells, so each line reads as one phrase. */
function Joined({
  cells,
  visible,
}: {
  cells: ReactNode[];
  /** Shown between cells; screen readers hear a comma instead. */
  visible?: string;
}) {
  return cells.map((cell, index) => (
    <Fragment key={index}>
      {index > 0 ? (
        <>
          {visible ? <span aria-hidden>{visible}</span> : null}
          <span className="sr-only">, </span>
        </>
      ) : null}
      {cell}
    </Fragment>
  ));
}

function useCells(header: HeaderData, viewerSeat: Seat): Cells {
  const t = useTranslations("play");
  const limitWord = (limit: number | null) => {
    const key = limit === null ? null : COUNT_KEYS[limit];
    return key ? t(`rolls.${key}`) : null;
  };
  const seat = (s: Seat) => <SeatLabel seat={s} viewerSeat={viewerSeat} />;

  switch (header.stage) {
    case "notStarted":
      return {
        label: [t("title")],
        heading: [t("header.readyToPlay")],
        pot: null,
        hand: null,
        rollLimit: null,
      };
    case "rollOff":
      return {
        label: null,
        heading: header.viewer
          ? [t("dice.yourTurn")]
          : [seat(header.seat), t("commentary.player.rollsToStart")],
        pot: null,
        hand: null,
        rollLimit: null,
      };
    case "round":
      return {
        label: [
          t("header.round", { number: header.number }),
          ...(header.tieBreak === null
            ? []
            : [t("header.tieBreak", { number: header.tieBreak })]),
        ],
        heading: header.viewer
          ? [t("dice.yourTurn")]
          : [seat(header.seat), t("players.rollingNow")],
        pot: header.pot,
        hand: { label: t("header.handToBeat"), hand: header.handToBeat },
        rollLimit: limitWord(header.rollLimit),
      };
    case "summary":
      return {
        label: [
          t("header.round", { number: header.number }),
          t("header.endOfRound"),
        ],
        heading: header.viewer
          ? [t("players.you"), t("header.youTakePot")]
          : [seat(header.taker), t("header.takesPot")],
        pot: header.pot,
        hand: { label: t("header.worstHand"), hand: header.worstHand },
        rollLimit: null,
      };
    case "gameOver": {
      const [first, ...others] = header.winners;
      return {
        label: [t("end.heading")],
        heading:
          others.length > 0
            ? [t("commentary.notice.draw")]
            : header.viewerWon
              ? [t("commentary.you.wins")]
              : [seat(first), t("header.wins")],
        pot: null,
        hand: null,
        rollLimit: null,
      };
    }
  }
}

function HandDice({ hand }: { hand: HandId | null }) {
  const t = useTranslations("play");
  const hands = useTranslations("hands");
  if (hand === null) {
    return (
      <>
        <span aria-hidden className="flex gap-1">
          <DiePlaceholder size={DIE_SIZE} />
          <DiePlaceholder size={DIE_SIZE} />
        </span>
        <span className="sr-only">{t("round.worstHandNone")}</span>
      </>
    );
  }
  const { high, low } = handById(hand);
  return (
    <>
      <span aria-hidden className="flex">
        <MitchiHand high={high} low={low} size={DIE_SIZE} inverse />
      </span>
      <span className="sr-only">{hands(hand)}</span>
    </>
  );
}

/**
 * The dice card's ink header: 128px, so nothing below it moves. A field that
 * does not apply keeps its space but is not shown. The heights are minimums:
 * at 320px a long translation grows the header rather than being clipped.
 */
export function RoundHeader({
  header,
  viewerSeat,
}: {
  header: HeaderData;
  viewerSeat: Seat;
}) {
  const t = useTranslations("play");
  const cells = useCells(header, viewerSeat);
  const [name, after] = cells.heading;

  return (
    <div className="flex min-h-32 flex-col bg-stone-950 px-[18px] pt-3 text-white">
      <div className="flex min-h-[52px] items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className={cn(LABEL, "min-h-4", !cells.label && "invisible")}>
            {cells.label ? <Joined cells={cells.label} visible=" · " /> : null}
          </span>
          <h2 className="flex flex-wrap items-baseline gap-x-2.5">
            <span className="text-[26px] leading-tight font-extrabold tracking-[-0.015em]">
              {name}
            </span>
            {after ? (
              <>
                <span className="sr-only">, </span>
                <span className="text-sm font-semibold text-stone-300">
                  {after}
                </span>
              </>
            ) : null}
          </h2>
        </div>
        <dl
          className={cn(
            "min-w-14 flex-none text-right",
            cells.pot === null && "invisible",
          )}
        >
          <dt className={LABEL}>{t("round.pot")}</dt>
          <dd className="text-[34px] leading-none font-extrabold text-red-400">
            {cells.pot}
          </dd>
        </dl>
      </div>

      <dl
        className={cn(
          "mt-2.5 flex min-h-[54px] items-center gap-3 border-t border-stone-800",
          !cells.hand && "invisible",
        )}
      >
        <dt className={LABEL}>{cells.hand?.label}</dt>
        <dd className="flex items-center">
          {cells.hand ? <HandDice hand={cells.hand.hand} /> : null}
        </dd>
        <dt className={cn(LABEL, "ml-auto", !cells.rollLimit && "invisible")}>
          {t("round.rollLimit")}
        </dt>
        <dd
          className={cn(
            "min-w-[34px] text-right text-base font-bold",
            !cells.rollLimit && "invisible",
          )}
        >
          {cells.rollLimit}
        </dd>
      </dl>
    </div>
  );
}
