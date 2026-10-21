import type { Ref } from "react";
import { useTranslations } from "next-intl";
import { MitchiDie } from "@/components/mitchi-die";
import { cn } from "@/lib/utils";
import type { DieSlot, Seat } from "../engine";
import type {
  BoardSlices,
  HeaderData,
  PrimaryAction,
  TrayData,
} from "./board-slices";
import { ControlButton } from "./control-button";
import { DiePlaceholder } from "./die-placeholder";
import { HandComparison } from "./hand-comparison";
import { Icon, Mark } from "./marks";
import { RollBoxes } from "./roll-boxes";
import { SeatLabel } from "./seat-label";

const DIE_SIZE = 72;
const SLOTS = [0, 1] as const;

// `as const` so tsc checks every key against the messages.
const PRIMARY_LABEL_KEYS = {
  start: "controls.start",
  roll: "controls.roll",
  nextRound: "controls.nextRound",
  playAgain: "controls.playAgain",
} as const satisfies Record<PrimaryAction, string>;

const BIG_BUTTON =
  "h-[52px] flex-1 rounded-xl border-2 px-6 text-[17px] font-bold";

export type DiceTrayProps = {
  tray: TrayData;
  controls: BoardSlices["controls"];
  stage: HeaderData["stage"];
  viewerSeat: Seat;
  /** The Roll node's handler for each of its labels. */
  onPrimary: Record<PrimaryAction, () => void>;
  onKeep: (die: DieSlot, kept: boolean) => void;
  onStop: () => void;
  rollRef?: Ref<HTMLButtonElement>;
};

function KeepButtons({
  tray,
  controls,
  onKeep,
}: Pick<DiceTrayProps, "tray" | "controls" | "onKeep">) {
  const t = useTranslations("play.controls");
  const shown = tray.shown?.kind === "hand" ? tray.shown : null;

  return SLOTS.map((slot) => {
    const face = shown?.dice[slot] ?? null;
    const kept = shown?.kept?.[slot] ?? false;
    // Another seat's dice are decorative: the hand name row says the hand.
    const name =
      face !== null && tray.ownDice ? t("keepDie", { face }) : t("keep");
    return (
      <ControlButton
        key={slot}
        variant="secondary"
        pressed={kept}
        unavailable={!controls.keep}
        busy={controls.busy}
        onPress={() => onKeep(slot, !kept)}
        className={cn(
          "h-32 min-w-[104px] flex-col gap-2 rounded-2xl border-2 px-3.5 pt-3 pb-2.5 text-[15px] font-bold",
          // Unavailable keeps its dashed style; the tick and the faded face say kept.
          kept &&
            controls.keep &&
            "border-stone-600 bg-stone-200 text-stone-800 shadow-[inset_0_3px_6px_rgb(20_20_26/0.14)]",
        )}
      >
        <span aria-hidden className={cn("block", kept && "opacity-[0.62]")}>
          {face === null ? (
            <DiePlaceholder size={DIE_SIZE} />
          ) : (
            <MitchiDie face={face} size={DIE_SIZE} />
          )}
        </span>
        <span aria-hidden className="inline-flex items-center gap-1">
          {kept ? (
            <Icon px={14} viewBox="0 0 16 16">
              <path
                d="M3 8.5l3 3 7-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Icon>
          ) : null}
          {t("keep")}
        </span>
        <span className="sr-only">{name}</span>
      </ControlButton>
    );
  });
}

function DiceRow({
  tray,
  controls,
  stage,
  viewerSeat,
  onKeep,
}: Pick<
  DiceTrayProps,
  "tray" | "controls" | "stage" | "viewerSeat" | "onKeep"
>) {
  const t = useTranslations("play");
  switch (stage) {
    case "notStarted":
      return (
        <p className="max-w-[300px] text-center text-[15px] leading-[1.45] text-stone-800">
          {t("tray.intro")}
        </p>
      );
    case "rollOff":
      return tray.shown?.kind === "die" ? (
        <span className="block">
          <MitchiDie face={tray.shown.face} size={DIE_SIZE} />
          <span className="sr-only">{tray.shown.face}</span>
        </span>
      ) : (
        <DiePlaceholder size={DIE_SIZE} />
      );
    case "round":
    case "summary":
      return <KeepButtons tray={tray} controls={controls} onKeep={onKeep} />;
    case "gameOver":
      // The heading says who won; the trophy is decorative.
      return (
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {tray.winners?.map((seat) => (
            <li
              key={seat}
              className="inline-flex items-center gap-2 text-xl font-bold"
            >
              <Mark name="fewestPoints" />
              <SeatLabel seat={seat} viewerSeat={viewerSeat} />
            </li>
          ))}
        </ul>
      );
  }
}

/**
 * Four fixed rows: the hand on show, the dice, the rolls, the buttons. The
 * Roll and Stop nodes are mounted in every phase; Start, Next round and Play
 * again are labels of the Roll node, so focus is already where the next
 * action is.
 */
export function DiceTray(props: DiceTrayProps) {
  const { tray, controls, stage, onPrimary, onStop, rollRef } = props;
  const t = useTranslations("play");
  const hands = useTranslations("hands");
  const shown =
    tray.shown?.kind === "hand" && stage !== "gameOver" ? tray.shown : null;
  const { action, available } = controls.primary;

  return (
    <div className="flex flex-col items-center px-[18px] pt-6 pb-5">
      <p className="flex h-[34px] items-center gap-2.5">
        {shown ? (
          <>
            <span className="text-[26px] font-extrabold">
              {hands(shown.hand)}
            </span>
            {tray.comparison ? (
              <HandComparison
                standing={tray.comparison}
                viewer={tray.ownDice}
              />
            ) : null}
          </>
        ) : null}
      </p>

      <div className="mt-5 flex h-[132px] w-full items-center justify-center gap-[18px]">
        <DiceRow {...props} />
      </div>

      <div
        className={cn(
          "mt-[22px] mb-2.5 flex h-[26px] w-full items-center",
          !tray.rolls && "invisible",
        )}
      >
        {tray.rolls ? <RollBoxes {...tray.rolls} /> : null}
      </div>

      <div className="flex h-[52px] w-full gap-2.5">
        <ControlButton
          ref={rollRef}
          unavailable={!available}
          busy={controls.busy}
          onPress={onPrimary[action]}
          className={BIG_BUTTON}
        >
          {t(PRIMARY_LABEL_KEYS[action])}
        </ControlButton>
        <ControlButton
          variant="secondary"
          unavailable={!controls.stop}
          busy={controls.busy}
          onPress={onStop}
          className={BIG_BUTTON}
        >
          {t("controls.stop")}
        </ControlButton>
      </div>
    </div>
  );
}
