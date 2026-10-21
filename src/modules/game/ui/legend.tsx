import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Mark, useMarkLabel, type MarkName } from "./marks";

export type LegendItem = "rollingNow" | MarkName;

/** A row's colour, drawn small. */
function Swatch({ className }: { className: string }) {
  return <span className={cn("size-3.5 shrink-0 rounded", className)} />;
}

function Key({ item }: { item: LegendItem }) {
  switch (item) {
    case "rollingNow":
      return (
        <Swatch className="bg-blue-50 shadow-[inset_0_0_0_2px_var(--color-blue-600)]" />
      );
    // The row's gold, which the trophy sits on.
    case "fewestPoints":
      return (
        <Swatch className="bg-gold-50 shadow-[inset_0_0_0_1.5px_var(--color-gold-600)]" />
      );
    default:
      return <Mark name={item} size="sm" />;
  }
}

/**
 * What the marks and row colours mean. Hidden from screen readers: every row
 * already carries its own text.
 */
export function Legend({ items }: { items: readonly LegendItem[] }) {
  const t = useTranslations("play.players");
  const markLabel = useMarkLabel();
  return (
    <ul
      aria-hidden
      className="flex flex-wrap gap-x-4 gap-y-1.5 px-1.5 text-xs text-stone-700"
    >
      {items.map((item) => (
        <li key={item} className="inline-flex items-center gap-1.5">
          <Key item={item} />
          {item === "rollingNow" ? t("rollingNow") : markLabel(item)}
        </li>
      ))}
    </ul>
  );
}
