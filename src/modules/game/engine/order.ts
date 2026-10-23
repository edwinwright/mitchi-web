import type { Direction, Seat } from "./types";

export function opposite(direction: Direction): Direction {
  return direction === "clockwise" ? "anticlockwise" : "clockwise";
}

/** Every seat, clockwise (ascending, wrapping) from `from`. A round's order. */
export function clockwiseFrom(seats: number, from: Seat): readonly Seat[] {
  return orderFrom(seats, from, "clockwise", allSeats(seats));
}

/**
 * Walks the table from `from` in `direction`, keeping only the seats in
 * `only`. `from` comes first if it is in `only`; otherwise the walk starts
 * there and skips it. How a tie-break's rolling order is found.
 */
export function orderFrom(
  seats: number,
  from: Seat,
  direction: Direction,
  only: readonly Seat[],
): readonly Seat[] {
  if (!Number.isInteger(seats) || seats < 1) {
    throw new Error(`Corrupt state: ${seats} seats`);
  }
  if (
    !isSeat(seats, from) ||
    only.length === 0 ||
    !only.every((seat) => isSeat(seats, seat))
  ) {
    throw new Error(
      `Corrupt state: orderFrom(${seats}, ${from}, [${only.join(",")}])`,
    );
  }
  const step = direction === "clockwise" ? 1 : seats - 1;
  return allSeats(seats)
    .map((offset) => (from + offset * step) % seats)
    .filter((seat) => only.includes(seat));
}

function allSeats(seats: number): readonly Seat[] {
  return Array.from({ length: seats }, (_, seat) => seat);
}

function isSeat(seats: number, seat: Seat): boolean {
  return Number.isInteger(seat) && seat >= 0 && seat < seats;
}
