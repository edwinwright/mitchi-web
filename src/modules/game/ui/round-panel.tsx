import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { RoundPanelData } from "./board-slices";

const COUNT_KEYS = ["none", "one", "two", "three"] as const;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}

/**
 * Stable rows first, conditional rows after, so nothing above them jumps
 * when a tie-break or the viewer's hand appears.
 */
export function RoundPanel({ data }: { data: RoundPanelData }) {
  const t = useTranslations("play");
  const hands = useTranslations("hands");

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="text-xl font-semibold">{t("round.heading")}</h2>
      <dl className="flex flex-col gap-2">
        <Row label={t("round.round")}>{data.number}</Row>
        <Row label={t("round.rollLimit")}>
          {data.rollLimit === null
            ? t("round.rollLimitUnset")
            : t(`rolls.${COUNT_KEYS[data.rollLimit]}`)}
        </Row>
        <Row label={t("round.worstHandSoFar")}>
          {data.worst ? hands(data.worst.hand) : t("round.worstHandNone")}
        </Row>
        <Row label={t("round.pot")}>
          <span className="text-red-600">{data.pot}</span>
        </Row>

        {data.tieBreak ? (
          <>
            <Row label={t("round.tieBreak")}>{data.tieBreak.number}</Row>
            <Row label={t("round.tiedOn")}>{hands(data.tieBreak.tiedOn)}</Row>
          </>
        ) : null}
        {data.rollsLeft !== null ? (
          <Row label={t("round.rollsLeft")}>
            {t(`rolls.${COUNT_KEYS[data.rollsLeft]}`)}
          </Row>
        ) : null}
      </dl>
      {data.standing ? (
        <p className="font-semibold">{t(`round.standing.${data.standing}`)}</p>
      ) : null}
    </section>
  );
}
