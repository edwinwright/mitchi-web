import { useId } from "react";
import { useTranslations } from "next-intl";
import type { Pacing } from "../engine";
import { ControlButton } from "./control-button";

/** Pause or resume the bots, step one move while paused, and pick the speed. */
export function PacingControls({ pacing }: { pacing: Pacing }) {
  const t = useTranslations("play.pacing");
  const speedLabelId = useId();

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex gap-3">
        {/* One button, its label changes: it is not a toggle, so no aria-pressed. */}
        <ControlButton
          variant="secondary"
          onPress={pacing.paused ? pacing.resume : pacing.pause}
        >
          {pacing.paused ? t("resume") : t("pause")}
        </ControlButton>
        <ControlButton
          variant="secondary"
          unavailable={!pacing.canStep}
          onPress={pacing.step}
        >
          {t("step")}
        </ControlButton>
      </div>
      <div
        role="group"
        aria-labelledby={speedLabelId}
        className="flex items-center gap-3"
      >
        <span id={speedLabelId} className="text-sm font-semibold text-muted">
          {t("speed")}
        </span>
        <ControlButton
          variant="secondary"
          pressed={pacing.speed === "normal"}
          onPress={() => pacing.setSpeed("normal")}
        >
          {t("normal")}
        </ControlButton>
        <ControlButton
          variant="secondary"
          pressed={pacing.speed === "fast"}
          onPress={() => pacing.setSpeed("fast")}
        >
          {t("fast")}
        </ControlButton>
      </div>
    </div>
  );
}
