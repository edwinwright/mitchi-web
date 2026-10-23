import type { CSSProperties, ReactNode, Ref } from "react";
import { useTranslations } from "next-intl";
import { MitchiDie } from "@/components/mitchi-die";
import { cn } from "@/lib/utils";
import type { DieSlot, Seat } from "../engine";
import type {
  BoardSlices,
  HeaderData,
  PrimaryAction,
  RollingData,
  TrayData,
} from "./board-slices";
import { ControlButton } from "./control-button";
import { DiePlaceholder } from "./die-placeholder";
import { HandComparison } from "./hand-comparison";
import { Icon, Mark } from "./marks";
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
  "min-h-[52px] flex-1 rounded-xl border-2 px-3 py-1 text-[17px] leading-tight font-bold";

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

/**
 * Wraps one die. A rolling die gets the tumble; a still one gets nothing.
 * The key is the beat id while rolling and a constant after, so each roll
 * beat mounts a fresh element and the CSS animation restarts; only this
 * span remounts, never a control. Under reduced motion `motion-safe:`
 * matches nothing, so the die just shows its value.
 */
function AnimatedDie({
  rolling,
  slot,
  children,
}: {
  rolling: RollingData | null;
  slot: DieSlot;
  children: ReactNode;
}) {
  const on = rolling !== null && rolling.slots.includes(slot);
  return (
    <span
      key={on ? rolling.beat : "still"}
      className={cn("block", on && "motion-safe:animate-die-roll")}
      style={
        on ? ({ "--roll-ms": `${rolling.ms}ms` } as CSSProperties) : undefined
      }
    >
      {children}
    </span>
  );
}

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
            "border-stone-600 bg-stone-200 text-stone-800 shadow-[inset_0_3px_6px_color-mix(in_srgb,var(--color-stone-950)_14%,transparent)]",
        )}
      >
        <span aria-hidden className={cn("block", kept && "opacity-[0.62]")}>
          {face === null ? (
            <DiePlaceholder size={DIE_SIZE} />
          ) : (
            <AnimatedDie rolling={tray.rolling} slot={slot}>
              <MitchiDie face={face} size={DIE_SIZE} />
            </AnimatedDie>
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
          <AnimatedDie rolling={tray.rolling} slot={0}>
            <MitchiDie face={tray.shown.face} size={DIE_SIZE} />
          </AnimatedDie>
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
 * Three fixed rows: the hand on show, the dice, the buttons; the rolls left
 * are in the header. The Roll and Stop nodes are mounted in every phase;
 * Start, Next round and Play again are labels of the Roll node, so focus is
 * already where the next action is.
 */
export function DiceTray(props: DiceTrayProps) {
  const { tray, controls, stage, onPrimary, onStop, rollRef } = props;
  const t = useTranslations("play");
  const hands = useTranslations("hands");
  // Game over shows the result, not dice.
  const onShow = stage === "gameOver" ? null : tray.shown;
  const shown = onShow?.kind === "hand" ? onShow : null;
  const { action, available } = controls.primary;

  return (
    <div className="flex flex-col items-center px-[18px] pt-6 pb-5">
      <p className="flex min-h-[34px] flex-wrap items-center justify-center gap-x-2.5">
        {onShow && tray.held ? (
          <span className="text-base font-semibold text-stone-700">
            <SeatLabel seat={onShow.seat} viewerSeat={props.viewerSeat} />
            {shown ? <span className="sr-only">, </span> : null}
          </span>
        ) : null}
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

      <div className="mt-[22px] flex min-h-[52px] w-full gap-2.5">
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
