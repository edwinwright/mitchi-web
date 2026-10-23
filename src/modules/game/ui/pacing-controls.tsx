import { useId } from "react";
import { useTranslations } from "next-intl";
import type { Pacing, Speed } from "../engine";
import { ControlButton } from "./control-button";
import { Icon } from "./marks";

const SPEEDS = ["slow", "normal", "fast"] as const satisfies readonly Speed[];
const ICON_BUTTON = "w-11 px-0";

function PauseIcon() {
  return (
    <Icon px={20} viewBox="0 0 20 20" fill="currentColor">
      <rect x="4.5" y="3.5" width="4" height="13" rx="1" />
      <rect x="11.5" y="3.5" width="4" height="13" rx="1" />
    </Icon>
  );
}

function ResumeIcon() {
  return (
    <Icon px={20} viewBox="0 0 20 20" fill="currentColor">
      <path d="M5.5 3.6v12.8a.8.8 0 0 0 1.2.7l10-6.4a.8.8 0 0 0 0-1.4l-10-6.4a.8.8 0 0 0-1.2.7z" />
    </Icon>
  );
}

/** Play to the next move, then stop: a triangle against a bar. */
function StepIcon() {
  return (
    <Icon px={20} viewBox="0 0 20 20" fill="currentColor">
      <path d="M3.5 3.8v12.4a.8.8 0 0 0 1.2.7l9-6.2a.8.8 0 0 0 0-1.4l-9-6.2a.8.8 0 0 0-1.2.7z" />
      <rect x="14" y="3.5" width="3" height="13" rx="1" />
    </Icon>
  );
}

/** Pick the speed, pause or resume the bots, and step one move while paused. */
export function PacingControls({ pacing }: { pacing: Pacing }) {
  const t = useTranslations("play.pacing");
  const speedId = useId();
  const headingId = useId();

  return (
    // Boxed like the players card, and named so screen readers hear the
    // controls as one group.
    <div
      role="group"
      aria-labelledby={headingId}
      className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-stone-50 px-[18px] pt-3 pb-3.5"
    >
      <span id={headingId} className="text-sm font-bold">
        {t("heading")}
      </span>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
        <div className="flex items-center gap-3">
          {/* The box's heading says what the dropdown is for. */}
          <label htmlFor={speedId} className="sr-only">
            {t("speed")}
          </label>
          {/* Native: the platform's own keyboard and screen reader handling. */}
          <select
            id={speedId}
            value={pacing.speed}
            onChange={(event) => pacing.setSpeed(event.target.value as Speed)}
            className="focus-ring min-h-11 rounded-lg border border-foreground bg-transparent px-3 text-base font-semibold"
          >
            {SPEEDS.map((speed) => (
              <option key={speed} value={speed}>
                {t(speed)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          {/* One button, its name changes: it is not a toggle, so no aria-pressed. */}
          <ControlButton
            variant="secondary"
            onPress={pacing.paused ? pacing.resume : pacing.pause}
            className={ICON_BUTTON}
          >
            {pacing.paused ? <ResumeIcon /> : <PauseIcon />}
            <span className="sr-only">
              {pacing.paused ? t("resume") : t("pause")}
            </span>
          </ControlButton>
          <ControlButton
            variant="secondary"
            unavailable={!pacing.canStep}
            onPress={pacing.step}
            className={ICON_BUTTON}
          >
            <StepIcon />
            <span className="sr-only">{t("step")}</span>
          </ControlButton>
        </div>
      </div>
    </div>
  );
}
