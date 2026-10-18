import type { ReactNode, Ref } from "react";
import { useTranslations } from "next-intl";
import { MitchiDie } from "@/components/mitchi-die";
import { cn } from "@/lib/utils";
import type { DieSlot } from "../engine";
import type { ControlsData, DicePanelData } from "./board-slices";
import { ControlButton } from "./control-button";
import { SeatLabel } from "./seat-label";

const DIE_SIZE = 48;
const SLOTS = [0, 1] as const;

export type DicePanelProps = {
  data: DicePanelData;
  controls: ControlsData;
  onStart: () => void;
  onRoll: () => void;
  onKeep: (die: DieSlot, kept: boolean) => void;
  onStop: () => void;
  onNextRound: () => void;
  rollRef?: Ref<HTMLButtonElement>;
  /** Pacing controls, when the session has them. */
  footer?: ReactNode;
};

/** Where a die would be: keeps the panel the same height before a roll. */
function Placeholder() {
  return (
    <span
      aria-hidden
      className="block rounded-lg border border-dashed border-stone-300"
      style={{ width: DIE_SIZE, height: DIE_SIZE }}
    />
  );
}

/**
 * Whoever's roll is on the table, bots included, and the viewer's controls.
 * Nothing here is `disabled` and nothing unmounts when the phase changes
 * (Start and Next round, which come and go, sit after Stop).
 */
export function DicePanel({
  data,
  controls,
  onStart,
  onRoll,
  onKeep,
  onStop,
  onNextRound,
  rollRef,
  footer,
}: DicePanelProps) {
  const t = useTranslations("play");
  const hands = useTranslations("hands");
  const { shown, viewerSeat, phase } = data;
  const busy = controls.busy;

  const heading = (
    <h2 className="text-xl font-semibold">{t("dice.heading")}</h2>
  );

  if (phase === "notStarted") {
    return (
      <section className="flex min-w-0 flex-col gap-4">
        {heading}
        <div>
          <ControlButton
            unavailable={!controls.newGame}
            busy={busy}
            onPress={onStart}
          >
            {t("controls.start")}
          </ControlButton>
        </div>
        {footer}
      </section>
    );
  }

  const kept = shown?.kind === "hand" ? shown.kept : null;

  return (
    <section className="flex min-w-0 flex-col gap-4">
      {heading}

      <p className="min-h-6 font-semibold">
        {shown ? (
          <SeatLabel seat={shown.seat} viewerSeat={viewerSeat} />
        ) : (
          <span className="text-muted">{t("dice.notRolled")}</span>
        )}
      </p>

      {/* Not a live region: the log announces rolls and "Your turn". */}
      <p className="min-h-6 text-muted">
        {data.yourTurn ? t("dice.yourTurn") : null}
      </p>

      <div className="flex gap-4">
        {SLOTS.map((slot) => {
          if (shown?.kind === "hand") {
            const face = shown.dice[slot];
            const isKept = kept?.[slot] ?? false;
            return (
              <ControlButton
                key={slot}
                variant="secondary"
                pressed={isKept}
                unavailable={!controls.keep}
                busy={busy}
                onPress={() => onKeep(slot, !isKept)}
                className={cn(
                  "h-auto flex-col gap-1 px-3 py-2 motion-safe:transition-transform",
                  isKept && "ring-2 ring-blue-600 motion-safe:-translate-y-1",
                )}
              >
                <MitchiDie face={face} size={DIE_SIZE} />
                <span aria-hidden>
                  {isKept ? "✓ " : null}
                  {t("controls.keep")}
                </span>
                <span className="sr-only">
                  {t("controls.keepDie", { face })}
                </span>
              </ControlButton>
            );
          }
          if (shown?.kind === "die" && slot === 0) {
            return (
              <span key={slot} className="block">
                <MitchiDie face={shown.face} size={DIE_SIZE} />
                <span className="sr-only">{shown.face}</span>
              </span>
            );
          }
          return <Placeholder key={slot} />;
        })}
      </div>

      <p className="min-h-6 text-lg font-semibold">
        {shown?.kind === "hand" ? hands(shown.hand) : null}
      </p>

      <div className="flex gap-3">
        <ControlButton
          ref={rollRef}
          unavailable={!controls.roll}
          busy={busy}
          onPress={onRoll}
        >
          {t("controls.roll")}
        </ControlButton>
        <ControlButton
          variant="secondary"
          unavailable={!controls.stop}
          busy={busy}
          onPress={onStop}
        >
          {t("controls.stop")}
        </ControlButton>
      </div>

      {phase === "roundSummary" ? (
        <div>
          <ControlButton
            unavailable={!controls.nextRound}
            busy={busy}
            onPress={onNextRound}
          >
            {t("controls.nextRound")}
          </ControlButton>
        </div>
      ) : null}

      {footer}
    </section>
  );
}
