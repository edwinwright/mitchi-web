import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  botMidTurn,
  fixtureSession,
  gameOverUnique,
  mitchiInRound,
  notStarted,
  rollOff,
  rollOffReroll,
  roundSummary,
  tieBreakViewerToRoll,
  viewerToRoll,
  type Fixture,
} from "../testing";
import { sliceSession } from "./board-slices";
import { RoundPanel } from "./round-panel";

function Showcase({
  fixture,
  viewerSeat,
}: {
  fixture: Fixture;
  viewerSeat?: number;
}) {
  const session = fixtureSession(fixture, { viewerSeat });
  const { roundBar, roundRows } = sliceSession(session);
  return (
    <div className="max-w-[370px]">
      <RoundPanel
        bar={roundBar}
        rows={roundRows}
        viewerSeat={session.view.viewerSeat}
      />
    </div>
  );
}

const meta = {
  title: "Practice game/Round panel",
  component: Showcase,
  args: { fixture: botMidTurn },
} satisfies Meta<typeof Showcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotStarted: Story = { args: { fixture: notStarted } };
export const RollOff: Story = { args: { fixture: rollOff } };
/** Only the tied seats roll again; the rest keep one empty slot. */
export const RollOffReroll: Story = { args: { fixture: rollOffReroll } };
export const StarterTurn: Story = { args: { fixture: viewerToRoll } };
export const BotMidTurn: Story = {};
/** The starter's Mitchi is also the worst hand so far: both marks show. */
export const Mitchi: Story = { args: { fixture: mitchiInRound } };
export const TieBreak: Story = { args: { fixture: tieBreakViewerToRoll } };
export const RoundSummary: Story = { args: { fixture: roundSummary } };
export const GameOver: Story = { args: { fixture: gameOverUnique } };
// "You" and the rest follow the viewer's seat, not seat 0.
export const ViewedFromSeat2: Story = { args: { viewerSeat: 2 } };
