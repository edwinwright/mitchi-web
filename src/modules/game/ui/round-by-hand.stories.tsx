import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  botMidTurn,
  fixtureSession,
  mitchiInRound,
  notStarted,
  tieBreakViewerToRoll,
  type Fixture,
} from "../testing";
import { sliceSession } from "./board-slices";
import { RoundByHand } from "./round-by-hand";

function Showcase({ fixture }: { fixture: Fixture }) {
  const session = fixtureSession(fixture);
  const { roundRows } = sliceSession(session);
  return (
    <div className="max-w-[370px]">
      <RoundByHand rows={roundRows} viewerSeat={session.view.viewerSeat} />
    </div>
  );
}

const meta = {
  title: "Practice game/Round by hand",
  component: Showcase,
  args: { fixture: botMidTurn },
} satisfies Meta<typeof Showcase>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Seat 1 rolling 4-2 below the viewer's 6-3, the worst so far. */
export const DuringARound: Story = {};
/** The viewer's Mitchi is the only finished hand, so it is also the worst. */
export const WithAMitchi: Story = { args: { fixture: mitchiInRound } };
/** Tie-break rolls only: seat 1's 4-3, the viewer to roll. */
export const TieBreak: Story = { args: { fixture: tieBreakViewerToRoll } };
export const BeforeStart: Story = { args: { fixture: notStarted } };
