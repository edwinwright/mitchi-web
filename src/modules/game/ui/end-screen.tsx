import { useTranslations } from "next-intl";
import type { EndScreenData } from "./board-slices";
import { ControlButton } from "./control-button";
import { SeatLabel } from "./seat-label";

/**
 * Takes the Round panel's slot at gameOver. It never takes focus when it
 * appears. One winner is a win and two or more a draw: each winning seat
 * gets the same Winner cell, so no sentence is needed.
 */
export function EndScreen({
  data,
  viewerSeat,
  playAgain,
  unavailable = false,
  busy = false,
}: {
  data: EndScreenData;
  viewerSeat: number;
  playAgain: () => void;
  unavailable?: boolean;
  busy?: boolean;
}) {
  const t = useTranslations("play");
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="text-xl font-semibold">{t("end.heading")}</h2>
      <div>
        <p className="text-muted">{t("end.standings")}</p>
        <ul className="flex flex-col gap-1">
          {data.points.map((points, seat) => (
            <li key={seat} className="flex flex-wrap gap-x-3">
              <span className="font-semibold">
                <SeatLabel seat={seat} viewerSeat={viewerSeat} />
              </span>
              <span className="sr-only">, </span>
              <span>{points}</span>
              {data.winners.includes(seat) ? (
                <>
                  <span className="sr-only">, </span>
                  <span className="font-bold">{t("end.winner")}</span>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <ControlButton
          unavailable={unavailable}
          busy={busy}
          onPress={playAgain}
        >
          {t("controls.playAgain")}
        </ControlButton>
      </div>
    </section>
  );
}
