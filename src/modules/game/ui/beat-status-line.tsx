import { Fragment, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { Seat } from "../engine";
import type { BeatStatusData, Status, StatusLine } from "./beat-status";
import { CommentaryRowView } from "./commentary-row";
import { SeatLabel } from "./seat-label";
import { Comma } from "./spoken";

type Props = { status: BeatStatusData | null; viewerSeat: Seat };

function Line({ line, viewerSeat }: { line: StatusLine; viewerSeat: Seat }) {
  const t = useTranslations("play");
  // A seat and the phrase after it are separate cells, never one sentence.
  const labelled = (seat: Seat, phrase: string) => (
    <>
      <span className="font-semibold">
        <SeatLabel seat={seat} viewerSeat={viewerSeat} />
      </span>
      <Comma />
      <span>{phrase}</span>
    </>
  );

  switch (line.kind) {
    case "intro":
      // A space, not a hidden comma: a comma after a full stop reads badly.
      return (
        <>
          <span>{t("status.intro")}</span>
          {line.viewerFirst ? (
            <>
              {" "}
              <span className="font-semibold">{t("status.youRollFirst")}</span>
            </>
          ) : null}
        </>
      );
    case "handover":
      return line.viewer ? (
        <span className="font-semibold">{t("dice.yourTurn")}</span>
      ) : (
        labelled(line.seat, t("status.rollsNext"))
      );
    case "rolledToStart":
      return line.viewer ? (
        <span className="font-semibold">
          {t("status.youRolledToStart", { face: line.face })}
        </span>
      ) : (
        labelled(
          line.seat,
          t("status.playerRolledToStart", { face: line.face }),
        )
      );
    case "tied":
      return <span>{t("status.tied", { face: line.face })}</span>;
    case "keeps":
      return labelled(
        line.seat,
        line.instead
          ? t("status.keepsInstead", { face: line.face })
          : t("status.keeps", { face: line.face }),
      );
    case "row":
      return <CommentaryRowView row={line.row} viewerSeat={viewerSeat} />;
  }
}

/** The line, then each detail row, with a hidden comma between. Shared, so the visible line and the announcement never differ. */
function StatusText({
  status,
  viewerSeat,
}: {
  status: Status;
  viewerSeat: Seat;
}): ReactNode {
  return (
    <>
      <Line line={status.line} viewerSeat={viewerSeat} />
      {status.details.map((row) => (
        <Fragment key={row.key}>
          <Comma />
          <CommentaryRowView row={row} viewerSeat={viewerSeat} />
        </Fragment>
      ))}
    </>
  );
}

/**
 * What is happening now, under the dice card's heading. A plain paragraph:
 * not live, so it is not announced, but found in place by a reader. Always
 * rendered, and tall enough for nearly every status, so the dice below do
 * not move as it changes: three 21px lines below `sm`, two from it. From
 * 669 statuses (five simulated games) in en, es and pl, that fits all but
 * the longest few percent, mostly Polish; a longer one grows rather than
 * clips. No row gap: it would make two lines taller than the space kept.
 */
export function BeatStatus({ status, viewerSeat }: Props) {
  return (
    <p className="flex min-h-[75px] flex-wrap content-center items-center justify-center gap-x-2.5 px-[18px] sm:min-h-[54px] pt-3 text-center text-[15px] leading-[1.4] text-stone-800">
      {status ? (
        <StatusText status={status.status} viewerSeat={viewerSeat} />
      ) : null}
    </p>
  );
}

/**
 * The page's only live region. Always mounted, so it exists before its
 * content changes. Each beat is a new node, keyed by the beat id, so it is
 * announced once, riders included, even when two beats read the same. A
 * silent beat (the viewer's keep) keeps the id, so nothing is announced.
 * `role="status"` is polite already: no `aria-live` beside it.
 */
export function BeatAnnouncer({ status, viewerSeat }: Props) {
  return (
    <div role="status" aria-atomic="true" className="sr-only">
      {status ? (
        <p key={status.beat}>
          <StatusText status={status.status} viewerSeat={viewerSeat} />
        </p>
      ) : null}
    </div>
  );
}
