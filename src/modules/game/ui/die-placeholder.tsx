import { cn } from "@/lib/utils";

/** A dotted square where a die will be, at the die's edge length. */
export function DiePlaceholder({ size }: { size: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block shrink-0 border-dashed border-stone-500",
        size > 40 ? "border-2" : "border-[1.5px]",
      )}
      // The die's corner radius, so the placeholder has the die's shape.
      style={{ width: size, height: size, borderRadius: size * 0.229 }}
    />
  );
}
