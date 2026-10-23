import { Fragment, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { MitchiDie } from "@/components/mitchi-die";
import { MitchiHand } from "@/components/mitchi-hand";
import { handById } from "@/data/hands";
import type { Seat } from "../engine";
import type { CommentaryRow, Shown } from "./commentary-rows";
import { Mark } from "./marks";
import { SeatLabel } from "./seat-label";
import { Cells } from "./spoken";

// One commentary row, as the log and the status line both render it.

const LIMIT_KEYS = [null, "one", "two", "three"] as const;

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
  // High die first, as everywhere a hand is named, not the rolled order.
  const { high, low, group } = handById(shown.hand);
  // One cell: the drawing has no text, so as a cell of its own it read as an
  // empty item, "Player 2, , double-six".
  return [
    <span key="hand" className="inline-flex items-center gap-2">
      {/* Decorative: the hand name is already text. */}
      <span aria-hidden className="flex">
        <MitchiHand high={high} low={low} size={20} />
      </span>
      {group === "mitchi" ? <Mark name="mitchi" /> : null}
      {hands(shown.hand)}
    </span>,
  ];
}

export function CommentaryRowView({
  row,
  viewerSeat,
}: {
  row: CommentaryRow;
  viewerSeat: Seat;
}) {
  const t = useTranslations("play.commentary");
  const status = useTranslations("play.status");
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
    case "tied":
      return <span>{status("tied", { face: row.face })}</span>;
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
