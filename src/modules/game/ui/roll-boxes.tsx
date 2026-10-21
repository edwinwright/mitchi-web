import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { RollsRowData } from "./board-slices";
import { Icon } from "./marks";

const COUNT_KEYS = ["none", "one", "two", "three"] as const;

/** One box per roll this turn, used ones scratched off, then "rolls left". */
export function RollBoxes({ available, used }: RollsRowData) {
  const t = useTranslations("play");
  const left = COUNT_KEYS[available - used];
  if (!left) throw new Error(`No word for ${available - used} rolls left`);

  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="flex gap-[5px]">
        {Array.from({ length: available }, (_, index) => (
          <span
            key={index}
            className={cn(
              "flex size-6 items-center justify-center rounded-md border-2",
              index < used
                ? "border-stone-600 bg-stone-200"
                : "border-stone-950 bg-white",
            )}
          >
            {index < used ? (
              <Icon px={14} viewBox="0 0 16 16">
                <path
                  d="M3.5 3.5l9 9M12.5 3.5l-9 9"
                  fill="none"
                  className="stroke-stone-800"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </Icon>
            ) : null}
          </span>
        ))}
      </span>
      <span aria-hidden className="text-[13px] font-semibold text-stone-700">
        {t("tray.rollsLeft")}
      </span>
      <span className="sr-only">
        {t("round.rollsLeft")}, {t(`rolls.${left}`)}
      </span>
    </span>
  );
}
