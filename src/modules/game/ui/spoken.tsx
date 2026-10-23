import { Fragment, type ReactNode } from "react";

// How a row reads aloud: the count words, and the hidden comma that makes a
// row of separate cells one phrase.

/** `play.rolls.*`, indexed by the count. */
export const COUNT_KEYS = ["none", "one", "two", "three"] as const;

/** A hidden comma, so a row reads as one phrase. */
export const Comma = () => <span className="sr-only">, </span>;

/**
 * A hidden comma between each cell, so a screen reader hears "Player 2,
 * six-three, rolls both dice again" as one phrase. null cells are dropped.
 */
export function Cells({
  cells,
  visible,
}: {
  cells: ReactNode[];
  /** Shown between cells; screen readers hear a comma instead. */
  visible?: string;
}) {
  return cells
    .filter((cell) => cell !== null)
    .map((cell, index) => (
      <Fragment key={index}>
        {index > 0 ? (
          <>
            {visible ? <span aria-hidden>{visible}</span> : null}
            <Comma />
          </>
        ) : null}
        {cell}
      </Fragment>
    ));
}
