import { useTranslations } from "next-intl";
import { DownArrowDisc, Icon } from "./marks";

export type Standing = "beats" | "ties" | "worse";

function OutlinedDisc({ path }: { path: string }) {
  return (
    <span
      aria-hidden
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-stone-950 bg-white"
    >
      <Icon px={12} viewBox="0 0 16 16">
        <path
          d={path}
          fill="none"
          className="stroke-stone-950"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Icon>
    </span>
  );
}

/**
 * The shown hand against the hand to beat. The viewer hears the sentence for
 * each standing; for another player only "beats" has copy so far, so ties and
 * worse are the icon alone.
 */
export function HandComparison({
  standing,
  viewer,
}: {
  standing: Standing;
  /** The hand is the viewer's own. */
  viewer: boolean;
}) {
  const t = useTranslations("play");
  const sentence = viewer
    ? t(`round.standing.${standing}`)
    : standing === "beats"
      ? t("commentary.reason.beatsWorstHandSoFar")
      : null;

  return (
    <>
      {standing === "worse" ? <DownArrowDisc px={24} /> : null}
      {standing === "ties" ? <OutlinedDisc path="M3.5 6h9M3.5 10h9" /> : null}
      {standing === "beats" ? (
        <OutlinedDisc path="M8 13.5v-10M3.5 7.5 8 3l4.5 4.5" />
      ) : null}
      {sentence ? <span className="sr-only">{sentence}</span> : null}
    </>
  );
}
