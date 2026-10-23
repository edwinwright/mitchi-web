import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { MitchiHand } from "@/components/mitchi-hand";
import { rankedGroups, type Hand, type HandId } from "@/data/hands";
import { cn } from "@/lib/utils";
import type { Seat } from "../engine";
import type { RoundRowData } from "./board-slices";
import { Mark } from "./marks";
import { SeatLabel } from "./seat-label";
import { Comma } from "./spoken";

// Decorative: the order of the list and the labelled worst row already say
// which hands are below the worst so far.
const HATCH =
  "repeating-linear-gradient(135deg, var(--color-stone-100) 0 6px, white 6px 12px)";

/**
 * This round, by hand: all 21 hands in their groups, best first, with who
 * holds each. The order is `rankedGroups()`; nothing here ranks hands.
 */
export function RoundByHand({
  rows,
  viewerSeat,
}: {
  rows: readonly RoundRowData[];
  viewerSeat: Seat;
}) {
  const t = useTranslations("play.players");
  const tGroups = useTranslations("handGroups");
  const hands = useTranslations("hands");
  const groups = rankedGroups();

  const holders = (id: HandId) =>
    rows.filter((row) => row.hand?.kind === "hand" && row.hand.hand === id);
  const handOf = (row: RoundRowData | undefined) =>
    row?.hand?.kind === "hand" ? row.hand.hand : null;
  const worst = handOf(rows.find((row) => row.holdsWorst));
  const acting = handOf(rows.find((row) => row.current));

  // Read the position from the ranked list, so "below the worst" follows it.
  const order: readonly Hand[] = groups.flatMap((group) => group.hands);
  const worstIndex =
    worst === null ? -1 : order.findIndex((hand) => hand.id === worst);
  const belowWorst = (id: HandId) =>
    worstIndex >= 0 && order.findIndex((hand) => hand.id === id) > worstIndex;

  return (
    <div className="flex flex-col gap-2">
      {groups.map(({ group, hands: inGroup }) => (
        <div key={group} className="flex flex-col gap-1">
          <h3 className="px-1 text-xs font-bold text-stone-700">
            {tGroups(`${group}.name`)}
          </h3>
          <ol className="flex flex-col gap-1">
            {inGroup.map((hand) => {
              const isWorst = hand.id === worst;
              const isActing = hand.id === acting;
              const held = holders(hand.id);
              return (
                <li
                  key={hand.id}
                  className={cn(
                    "flex min-h-8 items-center gap-2.5 rounded-lg px-2 py-1 text-sm",
                    isWorst
                      ? "bg-stone-950 font-bold text-white"
                      : isActing
                        ? "bg-blue-50 font-bold shadow-[inset_0_0_0_2px_var(--color-blue-600)]"
                        : "bg-white shadow-[inset_0_0_0_1px_var(--color-stone-200)]",
                    !isWorst &&
                      !isActing &&
                      belowWorst(hand.id) &&
                      "text-stone-700",
                  )}
                  style={
                    !isWorst && !isActing && belowWorst(hand.id)
                      ? { backgroundImage: HATCH }
                      : undefined
                  }
                >
                  <span aria-hidden className="flex">
                    <MitchiHand high={hand.high} low={hand.low} size={18} />
                  </span>
                  <span>{hands(hand.id)}</span>
                  {hand.group === "mitchi" ? <Mark name="mitchi" /> : null}
                  {isWorst ? (
                    <>
                      <Comma />
                      {/* A white ring keeps the ink mark visible on the ink row. */}
                      <span className="inline-flex rounded-full ring-2 ring-white">
                        <Mark name="holdsWorst" labelled />
                      </span>
                    </>
                  ) : null}
                  <span className="ml-auto flex flex-wrap justify-end gap-x-2">
                    {held.map((row) => (
                      <Fragment key={row.seat}>
                        <Comma />
                        <span className="font-semibold">
                          <SeatLabel seat={row.seat} viewerSeat={viewerSeat} />
                          {row.current ? (
                            <span className="sr-only">
                              <Comma />
                              {t("rollingNow")}
                            </span>
                          ) : null}
                        </span>
                      </Fragment>
                    ))}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
