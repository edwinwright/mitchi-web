import type { ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

export type ControlButtonProps = {
  children: ReactNode;
  onPress: () => void;
  /** Not available now. Stays mounted and focusable; pressing does nothing. */
  unavailable?: boolean;
  /** A move is in flight. */
  busy?: boolean;
  /** Makes this a toggle. Leave it out for a plain action. */
  pressed?: boolean;
  variant?: "primary" | "secondary";
  ref?: Ref<HTMLButtonElement>;
  className?: string;
};

/**
 * The one button every game control uses. Never `disabled`: a focused
 * `disabled` button drops focus to <body>. Enter and Space still fire `click`
 * on an `aria-disabled` button, so the guard in `onClick` is load-bearing.
 */
export function ControlButton({
  children,
  onPress,
  unavailable = false,
  busy = false,
  pressed,
  variant = "primary",
  ref,
  className,
}: ControlButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      aria-disabled={unavailable}
      aria-busy={busy}
      aria-pressed={pressed}
      onClick={() => {
        if (unavailable) return;
        onPress();
      }}
      className={cn(
        "focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-5 py-2 text-base font-semibold",
        unavailable
          ? "border-dashed border-muted bg-transparent text-muted"
          : [
              "border-foreground",
              variant === "primary"
                ? "bg-foreground text-white not-aria-disabled:hover:bg-blue-600"
                : "bg-transparent text-foreground not-aria-disabled:hover:border-blue-600 not-aria-disabled:hover:bg-stone-50 not-aria-disabled:hover:text-blue-600",
            ],
        "motion-safe:transition-colors",
        className,
      )}
    >
      {children}
    </button>
  );
}
