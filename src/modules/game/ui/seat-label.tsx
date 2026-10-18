import { useTranslations } from "next-intl";
import type { Seat } from "../engine";

// `as const` so tsc checks every key against the messages.
const PLAYER_KEYS = ["player1", "player2", "player3", "player4"] as const;

/** The label for a seat: "You" for the viewer's own, "Player N" for the rest. */
export function useSeatLabel() {
  const t = useTranslations("play.players");
  return (seat: Seat, viewerSeat: Seat): string => {
    if (seat === viewerSeat) return t("you");
    const key = PLAYER_KEYS[seat];
    if (!key) throw new Error(`No label for seat ${seat}`);
    return t(key);
  };
}

export function SeatLabel({
  seat,
  viewerSeat,
}: {
  seat: Seat;
  viewerSeat: Seat;
}) {
  const label = useSeatLabel();
  return <>{label(seat, viewerSeat)}</>;
}
