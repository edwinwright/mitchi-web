import type { ReactNode, SVGProps } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Named by what each mark means; the name picks its label. */
export type MarkName =
  | "starting"
  | "holdsWorst"
  | "mitchi"
  | "leader"
  | "winner"
  | "closeToLimit"
  | "reachedLimit";

/** `md` in rows, `sm` in legends. */
export type MarkSize = "md" | "sm";

// `as const` so tsc checks every key against the messages.
const LABEL_KEYS = {
  starting: "play.players.starting",
  holdsWorst: "play.players.holdsWorst",
  mitchi: "handGroups.mitchi.name",
  leader: "play.game.leader",
  winner: "play.end.winner",
  closeToLimit: "play.game.closeToLimit",
  reachedLimit: "play.game.reachedLimit",
} as const;

/**
 * Every game icon is an inline SVG drawn through this, so every one is
 * hidden from assistive technology: its meaning is always text nearby.
 */
export function Icon({
  px,
  viewBox,
  ...rest
}: { px: number; viewBox: string } & Omit<
  SVGProps<SVGSVGElement>,
  "width" | "height" | "viewBox"
>) {
  const props = { width: px, height: px, viewBox, ...rest };
  return <svg aria-hidden {...props} />;
}

function StartingChip({ size }: { size: MarkSize }) {
  return (
    <Icon px={size === "md" ? 20 : 14} viewBox="0 0 20 20">
      <circle
        cx="10"
        cy="10"
        r="8.5"
        className="fill-white stroke-stone-950"
        strokeWidth="1.5"
      />
      <circle
        cx="10"
        cy="10"
        r="5"
        fill="none"
        className="stroke-stone-950"
        strokeWidth="1.5"
        strokeDasharray="2.2 2"
      />
    </Icon>
  );
}

/** The ink circle with a white down arrow. Also the "worse" comparison. */
export function DownArrowDisc({ px }: { px: 16 | 22 | 24 }) {
  const arrow = px === 16 ? 8 : px === 22 ? 11 : 12;
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-stone-950"
      style={{ width: px, height: px }}
    >
      <Icon px={arrow} viewBox="0 0 16 16">
        <path
          d="M8 2.5v10M3.5 8.5 8 13l4.5-4.5"
          fill="none"
          className="stroke-white"
          strokeWidth={px === 16 ? 2.6 : 2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Icon>
    </span>
  );
}

/** The orange flame in a pale orange circle. */
function Flame({ size }: { size: MarkSize }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-orange-50 shadow-[inset_0_0_0_1.5px_var(--color-orange-600)]",
        size === "md" ? "size-[22px]" : "size-4",
      )}
    >
      <Icon px={size === "md" ? 13 : 10} viewBox="0 0 24 24">
        <path
          d="M12 2c1 3.5 6 6 6 11.5A6 6 0 0 1 6 13.5c0-2.6 1.4-4.3 3-5.6 0 2 1 3.3 2.4 3.7C10.6 8.6 10.6 5.2 12 2z"
          className="fill-orange-600"
        />
      </Icon>
    </span>
  );
}

/** A line icon on a 24px grid, stroked in the current colour. */
function LineIcon({
  size,
  className,
  children,
}: {
  size: MarkSize;
  className: string;
  children: ReactNode;
}) {
  return (
    <Icon
      px={size === "md" ? 18 : 14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
    >
      {children}
    </Icon>
  );
}

function Glyph({ name, size }: { name: MarkName; size: MarkSize }) {
  switch (name) {
    case "starting":
      return <StartingChip size={size} />;
    case "holdsWorst":
      return <DownArrowDisc px={size === "md" ? 22 : 16} />;
    case "mitchi":
      return <Flame size={size} />;
    case "leader":
      // A chevron up in a ring: ahead in the game, not the trophy.
      return (
        <LineIcon size={size} className="text-stone-900">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M7.5 14l4.5-4.5 4.5 4.5" strokeWidth="2.4" />
        </LineIcon>
      );
    case "winner":
      return (
        <LineIcon size={size} className="text-gold-800">
          <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
          <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
        </LineIcon>
      );
    case "closeToLimit":
      return (
        <LineIcon size={size} className="text-red-700">
          <path d="M12 3l10 18H2z" />
          <path d="M12 10v5M12 18v.01" />
        </LineIcon>
      );
    case "reachedLimit":
      // A flag on its pole: the limit is reached, not near.
      return (
        <LineIcon size={size} className="text-red-700">
          <path d="M5 21V3" />
          <path d="M5 4h13l-3 4.5 3 4.5H5z" className="fill-current" />
        </LineIcon>
      );
  }
}

/**
 * A decorative mark. `labelled` adds its meaning as screen-reader text, for
 * places where nothing else says it. Leave it off where the mark repeats
 * text already there, such as a legend or a trophy beside "You win".
 */
export function Mark({
  name,
  size = "md",
  labelled = false,
}: {
  name: MarkName;
  size?: MarkSize;
  labelled?: boolean;
}) {
  const t = useTranslations();
  return (
    <>
      <Glyph name={name} size={size} />
      {labelled ? <span className="sr-only">{t(LABEL_KEYS[name])}</span> : null}
    </>
  );
}

/** A mark's label as visible text, for the legend. */
export function useMarkLabel() {
  const t = useTranslations();
  return (name: MarkName) => t(LABEL_KEYS[name]);
}
