import { useTranslations } from "next-intl";
import type { GamePanelData } from "./board-slices";
import { SeatLabel } from "./seat-label";

export function GamePanel({
  data,
  viewerSeat,
}: {
  data: GamePanelData;
  viewerSeat: number;
}) {
  const t = useTranslations("play.game");
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="text-xl font-semibold">{t("heading")}</h2>
      <p>
        <span className="text-muted">{t("pointLimit")} </span>
        <span className="font-semibold">{data.pointLimit}</span>
      </p>
      <p className="text-muted">{t("usuallyTo25")}</p>
      <div>
        <p className="text-muted">{t("nearestLimit")}</p>
        {data.nearest ? (
          <p className="font-semibold">
            {data.nearest.seats.map((seat, index) => (
              <span key={seat}>
                {index > 0 ? <span>, </span> : null}
                <SeatLabel seat={seat} viewerSeat={viewerSeat} />
              </span>
            ))}{" "}
            {data.nearest.points}
          </p>
        ) : (
          <p className="font-semibold">{t("nearestNone")}</p>
        )}
      </div>
    </section>
  );
}
