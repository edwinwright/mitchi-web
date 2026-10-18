import { useTranslations } from "next-intl";
import { MitchiDie } from "@/components/mitchi-die";
import { MitchiHand } from "@/components/mitchi-hand";
import { cn } from "@/lib/utils";
import type { PlayerRowData, PlayersPanelData } from "./board-slices";
import { SeatLabel } from "./seat-label";

const ROLLED_IN = [null, "one", "two", "three"] as const;

function PlayerRow({
  player,
  viewerSeat,
}: {
  player: PlayerRowData;
  viewerSeat: number;
}) {
  const t = useTranslations("play");
  const hands = useTranslations("hands");
  const { hand } = player;
  const rolledIn =
    hand?.kind === "hand" && hand.final && hand.rollsUsed !== null
      ? ROLLED_IN[hand.rollsUsed]
      : null;

  return (
    <li
      aria-current={player.current ? "true" : undefined}
      className={cn(
        "flex min-w-0 flex-col gap-1 border-l-4 py-2 pl-3",
        player.current ? "border-foreground" : "border-transparent",
        !player.inContest && "text-muted",
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className={cn(player.current && "font-bold")}>
          <SeatLabel seat={player.seat} viewerSeat={viewerSeat} />
        </span>
        <span>
          <span className="text-muted">{t("players.points")} </span>
          {player.points}
        </span>
        {player.current ? <span>{t("players.rollingNow")}</span> : null}
        {player.waiting ? (
          <span className="text-muted">{t("players.waiting")}</span>
        ) : null}
        {player.starting ? (
          <span className="text-muted">{t("players.starting")}</span>
        ) : null}
      </div>

      {hand?.kind === "hand" ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <MitchiHand high={hand.dice[0]} low={hand.dice[1]} size={24} />
          <span>{hands(hand.hand)}</span>
          {rolledIn ? (
            <span className="text-muted">{t(`rolledIn.${rolledIn}`)}</span>
          ) : null}
        </div>
      ) : null}
      {hand?.kind === "die" ? (
        <div>
          <MitchiDie face={hand.face} size={24} />
          <span className="sr-only">{hand.face}</span>
        </div>
      ) : null}

      {player.holdsWorst ? (
        <span className="font-semibold">{t("players.holdsWorst")}</span>
      ) : null}
      {!player.inContest ? <span>{t("players.outOfTieBreak")}</span> : null}
    </li>
  );
}

export function PlayersPanel({ data }: { data: PlayersPanelData }) {
  const t = useTranslations("play.players");
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="text-xl font-semibold">{t("heading")}</h2>
      <ol className="flex flex-col">
        {data.players.map((player) => (
          <PlayerRow
            key={player.seat}
            player={player}
            viewerSeat={data.viewerSeat}
          />
        ))}
      </ol>
    </section>
  );
}
