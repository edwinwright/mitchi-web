"use client";

import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { MitchiDie } from "@/components/mitchi-die";
import { MitchiHand } from "@/components/mitchi-hand";
import { handById } from "@/data/hands";
import { cn } from "@/lib/utils";
import type { Seat } from "../engine";
import type { CommentaryRow, Shown } from "./commentary-rows";
import { Icon, Mark } from "./marks";
import { SeatLabel } from "./seat-label";

/** The reader counts as "at the bottom" within this many pixels. */
const STUCK_PX = 24;

/** Tailwind's `xl`: from here the log is always open. */
const WIDE = "(min-width: 80rem)";

function subscribeWide(onChange: () => void) {
  if (typeof matchMedia !== "function") return () => {};
  const query = matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Whether the log has the wide layout. A tab stop cannot be set by CSS, so
 * the panel has to know. The server snapshot is "narrow", so the prerendered
 * HTML and the first render agree; jsdom has no `matchMedia`, so tests are
 * narrow too.
 */
function useWide() {
  return useSyncExternalStore(
    subscribeWide,
    () => typeof matchMedia === "function" && matchMedia(WIDE).matches,
    () => false,
  );
}
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
    <span key="hand" className="inline-flex items-center gap-2">
      {/* Decorative: the hand name is already text. */}
      {handById(shown.hand).group === "mitchi" ? <Mark name="mitchi" /> : null}
      {hands(shown.hand)}
    </span>,
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

function Chevron({ open }: { open: boolean }) {
  return (
    <Icon px={20} viewBox="0 0 20 20">
      <path
        d={open ? "M5 12l5-5 5 5" : "M5 8l5 5 5-5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

const ROW = "flex flex-wrap items-center gap-x-2 gap-y-1";

/**
 * The page's only live region. Rows are cells, never sentences with a name
 * inside. New rows scroll into view only if the reader was already at the
 * bottom, so scrolling up to read is never undone.
 *
 * Below `xl` it is collapsed under its heading, showing the latest row. The
 * full log stays mounted, visually hidden, so every row is still announced;
 * the visible latest row is hidden from screen readers so it is not read
 * twice, and the hidden log is not a tab stop. From `xl` it is always open.
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
  const logId = useId();
  const logRef = useRef<HTMLOListElement>(null);
  const stuck = useRef(true);
  const wide = useWide();
  const [expanded, setExpanded] = useState(false);
  const open = wide || expanded;
  const latest = rows.at(-1);

  useEffect(() => {
    const log = logRef.current;
    if (log && stuck.current) log.scrollTop = log.scrollHeight;
  }, [rows, open]);

  return (
    <section
      className={cn(
        "flex min-w-0 flex-col",
        wide
          ? "gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4"
          : "gap-1 border-t border-stone-200 pt-1",
      )}
    >
      <h2
        id={headingId}
        className={cn("font-bold", wide ? "text-[17px]" : "text-[19px]")}
      >
        {wide ? (
          t("heading")
        ) : (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={logId}
            onClick={() => setExpanded((value) => !value)}
            className="focus-ring flex min-h-12 w-full items-center justify-between text-left"
          >
            {t("heading")}
            <Chevron open={expanded} />
          </button>
        )}
      </h2>
      {rows.length === 0 ? <p className="text-muted">{t("empty")}</p> : null}
      {!open && latest ? (
        <p
          aria-hidden
          className={cn(ROW, "min-h-6 text-[15px] text-stone-700")}
        >
          <Row row={latest} viewerSeat={viewerSeat} />
        </p>
      ) : null}
      <ol
        ref={logRef}
        id={logId}
        role="log"
        aria-labelledby={headingId}
        aria-relevant="additions"
        tabIndex={open ? 0 : undefined}
        onScroll={(event) => {
          const log = event.currentTarget;
          stuck.current =
            log.scrollHeight - log.scrollTop - log.clientHeight <= STUCK_PX;
        }}
        className={cn(
          open
            ? "focus-ring flex max-h-72 flex-col gap-2 overflow-y-auto xl:max-h-[40rem]"
            : "sr-only",
        )}
      >
        {rows.map((row) => (
          <li key={row.key} className={ROW}>
            <Row row={row} viewerSeat={viewerSeat} />
          </li>
        ))}
      </ol>
    </section>
  );
}
