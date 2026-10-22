"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Seat } from "../engine";
import { CommentaryRowView } from "./commentary-row";
import type { CommentaryRow } from "./commentary-rows";
import { Icon } from "./marks";

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
 * A plain list, named by its heading: the announcements live in
 * `BeatAnnouncer`. Rows are cells, never sentences with a name inside. New
 * rows scroll into view only if the reader was already at the bottom, so
 * scrolling up to read is never undone.
 *
 * Below `xl` it is collapsed under its heading, showing the latest row, and
 * the list is `hidden`: out of the accessibility tree and not a tab stop, so
 * the latest row is read once, on demand. From `xl` it is always open.
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
        <p className={cn(ROW, "min-h-6 text-[15px] text-stone-700")}>
          <CommentaryRowView row={latest} viewerSeat={viewerSeat} />
        </p>
      ) : null}
      <ol
        ref={logRef}
        id={logId}
        aria-labelledby={headingId}
        hidden={!open}
        tabIndex={open ? 0 : undefined}
        onScroll={(event) => {
          const log = event.currentTarget;
          stuck.current =
            log.scrollHeight - log.scrollTop - log.clientHeight <= STUCK_PX;
        }}
        className="focus-ring flex max-h-72 flex-col gap-2 overflow-y-auto xl:max-h-[40rem]"
      >
        {rows.map((row) => (
          <li key={row.key} className={ROW}>
            <CommentaryRowView row={row} viewerSeat={viewerSeat} />
          </li>
        ))}
      </ol>
    </section>
  );
}
