"use client";

import { useLocalSession } from "./local";
import { GameBoard } from "./ui";

export function PlayIsland() {
  const session = useLocalSession();
  return <GameBoard session={session} />;
}
