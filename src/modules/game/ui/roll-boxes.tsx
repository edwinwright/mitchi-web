import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { RollsRowData } from "./board-slices";
import { Icon } from "./marks";

const COUNT_KEYS = ["none", "one", "two", "three"] as const;

/**
 * One box per roll this turn, for the dark header: a used roll is crossed
 * out, a roll left is an empty box. The shape says which, not the colour.
 * Screen readers hear the count left; the header's label names it.
 */
export function RollBoxes({ available, used }: RollsRowData) {
  const t = useTranslations("play");
  const left = COUNT_KEYS[available - used];
  if (!left) throw new Error(`No word for ${available - used} rolls left`);

  return (
    <>
      <span aria-hidden className="flex gap-1">
        {Array.from({ length: available }, (_, index) => (
          <span
            key={index}
            className={cn(
              "flex size-5 items-center justify-center rounded-[5px] border-2",
              index < used ? "border-stone-500" : "border-white",
            )}
          >
            {index < used ? (
              <Icon px={12} viewBox="0 0 16 16">
                <path
                  d="M3.5 3.5l9 9M12.5 3.5l-9 9"
                  fill="none"
                  className="stroke-stone-300"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </Icon>
            ) : null}
          </span>
        ))}
      </span>
      <span className="sr-only">{t(`rolls.${left}`)}</span>
    </>
  );
}
