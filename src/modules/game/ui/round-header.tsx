import { Fragment, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { MitchiHand } from "@/components/mitchi-hand";
import { handById, type HandId } from "@/data/hands";
import { cn } from "@/lib/utils";
import type { HeaderData, RollsRowData } from "./board-slices";
import { DiePlaceholder } from "./die-placeholder";
import { RollBoxes } from "./roll-boxes";

const LABEL = "text-xs font-semibold text-stone-300";
const DIE_SIZE = 26;

type Cells = {
  /** Above the heading. null keeps its space. */
  label: string[] | null;
  /** Where play is, never who: the status line names the seat. */
  heading: string;
  pot: number | null;
  /** Line 2, left: a label and a hand, or placeholders while there is none. */
  hand: { label: string; hand: HandId | null } | null;
  /** Line 2, right: in a main-round turn only. */
  rolls: RollsRowData | null;
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

function useCells(header: HeaderData): Cells {
  const t = useTranslations("play");

  switch (header.stage) {
    case "notStarted":
      return {
        label: [t("title")],
        heading: t("header.readyToPlay"),
        pot: null,
        hand: null,
        rolls: null,
      };
    case "rollOff":
      return {
        label: null,
        heading: t("header.rollingToStart"),
        pot: null,
        hand: null,
        rolls: null,
      };
    case "round": {
      const round = t("header.round", { number: header.number });
      return {
        label: header.tieBreak === null ? null : [round],
        heading:
          header.tieBreak === null
            ? round
            : t("header.tieBreak", { number: header.tieBreak }),
        pot: header.pot,
        hand: { label: t("header.handToBeat"), hand: header.handToBeat },
        rolls: header.rolls,
      };
    }
    case "summary":
      return {
        label: [t("header.round", { number: header.number })],
        heading: t("header.endOfRound"),
        pot: header.pot,
        hand: { label: t("header.worstHand"), hand: header.worstHand },
        rolls: null,
      };
    case "gameOver":
      return {
        label: null,
        heading: t("end.heading"),
        pot: null,
        hand: null,
        rolls: null,
      };
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
export function RoundHeader({ header }: { header: HeaderData }) {
  const t = useTranslations("play");
  const cells = useCells(header);

  return (
    <div className="flex min-h-32 flex-col bg-stone-950 px-[18px] pt-3 text-white">
      <div className="flex min-h-[52px] items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className={cn(LABEL, "min-h-4", !cells.label && "invisible")}>
            {cells.label ? <Joined cells={cells.label} visible=" · " /> : null}
          </span>
          <h2 className="text-[26px] leading-tight font-extrabold tracking-[-0.015em]">
            {cells.heading}
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

      <dl className="mt-2.5 flex min-h-[54px] flex-wrap items-center gap-x-3 gap-y-1 border-t border-stone-800 py-1">
        <div
          className={cn("flex items-center gap-3", !cells.hand && "invisible")}
        >
          <dt className={LABEL}>{cells.hand?.label}</dt>
          <dd className="flex items-center">
            {cells.hand ? <HandDice hand={cells.hand.hand} /> : null}
          </dd>
        </div>
        <div
          className={cn(
            "ml-auto flex items-center gap-2.5",
            !cells.rolls && "invisible",
          )}
        >
          <dt className={LABEL}>{t("round.rollsLeft")}</dt>
          <dd className="flex items-center">
            {cells.rolls ? <RollBoxes {...cells.rolls} /> : null}
          </dd>
        </div>
      </dl>
    </div>
  );
}
