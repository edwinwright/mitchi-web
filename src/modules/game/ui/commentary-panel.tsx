"use client";

import { Fragment, useEffect, useId, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { MitchiDie } from "@/components/mitchi-die";
import { MitchiHand } from "@/components/mitchi-hand";
import type { Seat } from "../engine";
import type { CommentaryRow, Shown } from "./commentary-rows";
import { SeatLabel } from "./seat-label";

/** The reader counts as "at the bottom" within this many pixels. */
const STUCK_PX = 24;
const LIMIT_KEYS = [null, "one", "two", "three"] as const;

/**
 * Each cell but the last is followed by a hidden comma, so a screen reader
 * hears "Player 2, six-three, rolls both dice again" as one phrase.
 */
function Cells({ cells }: { cells: ReactNode[] }) {
  const present = cells.filter((cell) => cell !== null);
  return present.map((cell, index) => (
    <Fragment key={index}>
      {cell}
      {index < present.length - 1 ? <span className="sr-only">, </span> : null}
    </Fragment>
  ));
}

function shownCells(
  shown: Shown,
  hands: ReturnType<typeof useTranslations<"hands">>,
): ReactNode[] {
  if (shown.kind === "die") {
    return [
      <span key="die">
        <MitchiDie face={shown.face} size={20} />
        <span className="sr-only">{shown.face}</span>
      </span>,
    ];
  }
  return [
    <MitchiHand
      key="dice"
      high={shown.dice[0]}
      low={shown.dice[1]}
      size={20}
    />,
    <span key="hand">{hands(shown.hand)}</span>,
  ];
}

function Row({ row, viewerSeat }: { row: CommentaryRow; viewerSeat: Seat }) {
  const t = useTranslations("play.commentary");
  const hands = useTranslations("hands");

  switch (row.kind) {
    case "turn":
      return <span className="font-semibold">{t("you.turn")}</span>;
    case "round":
      return (
        <span className="font-semibold">
          {t("notice.round", { number: row.number })}
        </span>
      );
    case "rollLimit": {
      const word = LIMIT_KEYS[row.limit];
      return word ? <span>{t(`notice.rollLimit.${word}`)}</span> : null;
    }
    case "tieBreak":
      return (
        <>
          <span className="font-semibold">
            {row.direction === "clockwise"
              ? t("notice.tieBreakClockwise", { number: row.number })
              : t("notice.tieBreakAnticlockwise", { number: row.number })}
          </span>
          {row.order.map((seat) => (
            <Fragment key={seat}>
              <span className="sr-only">, </span>
              <span>
                <SeatLabel seat={seat} viewerSeat={viewerSeat} />
              </span>
            </Fragment>
          ))}
        </>
      );
    case "pot":
      return (
        <span>
          {row.cause === "mitchi"
            ? t("notice.potMitchi", { pot: row.pot })
            : t("notice.potDoubled", { pot: row.pot })}
        </span>
      );
    case "draw":
      return <span className="font-semibold">{t("notice.draw")}</span>;
    case "gameOver":
      return <span className="font-semibold">{t("notice.gameOver")}</span>;
    case "action": {
      const { phrase, voice } = row;
      // The viewer's rows carry their own subject, so they have no label cell.
      // A re-roll phrase exists only for other players: the viewer's re-rolls
      // show as results ("You roll").
      let text: string;
      if (phrase.type === "takesPot") {
        text =
          voice === "you"
            ? t("you.takesPot", { pot: phrase.pot })
            : t("player.takesPot", { pot: phrase.pot });
      } else if (voice === "you") {
        if (
          phrase.type === "rollAgainBoth" ||
          phrase.type === "rollAgainKeeping"
        ) {
          throw new Error(`The viewer has no "${phrase.type}" row`);
        }
        text = t(`you.${phrase.type}`);
      } else {
        text = t(`player.${phrase.type}`);
      }
      return (
        <Cells
          cells={[
            voice === "player" ? (
              <span key="label" className="font-semibold">
                <SeatLabel seat={row.seat} viewerSeat={viewerSeat} />
              </span>
            ) : null,
            ...(row.shown ? shownCells(row.shown, hands) : []),
            <span key="phrase">{text}</span>,
            row.reason ? (
              <span key="reason" className="text-muted">
                {t(`reason.${row.reason}`)}
              </span>
            ) : null,
          ]}
        />
      );
    }
  }
}

/**
 * The page's only live region. Rows are cells, never sentences with a name
 * inside. New rows scroll into view only if the reader was already at the
 * bottom, so scrolling up to read is never undone.
 */
export function CommentaryPanel({
  rows,
  viewerSeat,
}: {
  rows: readonly CommentaryRow[];
  viewerSeat: Seat;
}) {
  const t = useTranslations("play.commentary");
  const headingId = useId();
  const logRef = useRef<HTMLOListElement>(null);
  const stuck = useRef(true);

  useEffect(() => {
    const log = logRef.current;
    if (log && stuck.current) log.scrollTop = log.scrollHeight;
  }, [rows]);

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 id={headingId} className="text-xl font-semibold">
        {t("heading")}
      </h2>
      {rows.length === 0 ? <p className="text-muted">{t("empty")}</p> : null}
      <ol
        ref={logRef}
        role="log"
        aria-labelledby={headingId}
        aria-relevant="additions"
        tabIndex={0}
        onScroll={(event) => {
          const log = event.currentTarget;
          stuck.current =
            log.scrollHeight - log.scrollTop - log.clientHeight <= STUCK_PX;
        }}
        className="focus-ring flex max-h-72 flex-col gap-2 overflow-y-auto md:max-h-[32rem]"
      >
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex flex-wrap items-center gap-x-2 gap-y-1"
          >
            <Row row={row} viewerSeat={viewerSeat} />
          </li>
        ))}
      </ol>
    </section>
  );
}
