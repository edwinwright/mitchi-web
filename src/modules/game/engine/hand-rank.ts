import { HANDS, type HandId } from "@/data/hands";
import type { DicePair } from "./types";

/**
 * The hand a pair of dice makes, in either order. Reads the pair as higher
 * die, then lower, and never writes that order back (ENG-11).
 */
export function handFromDice(dice: DicePair): HandId {
  const high = Math.max(dice[0], dice[1]);
  const low = Math.min(dice[0], dice[1]);
  const hand = HANDS.find((hand) => hand.high === high && hand.low === low);
  if (!hand) throw new Error(`Corrupt state: no hand for ${dice.join(",")}`);
  return hand.id;
}

/** The index in HANDS (ENG-6). 0 is the best hand, so the worst has the highest rank. */
export function rankOf(hand: HandId): number {
  return HANDS.findIndex((h) => h.id === hand);
}

export function isMitchi(hand: HandId): boolean {
  return HANDS[rankOf(hand)].group === "mitchi";
}
