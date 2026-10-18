import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  botMidTurn,
  fixtureSession,
  rollOff,
  starterLimitSet,
  tieBreakViewerToRoll,
  type Fixture,
} from "../testing";
import { sliceSession } from "./board-slices";
import { PlayersPanel } from "./players-panel";

function Showcase({
  fixture,
  viewerSeat,
}: {
  fixture: Fixture;
  viewerSeat?: number;
}) {
  const { players } = sliceSession(fixtureSession(fixture, { viewerSeat }));
  return (
    <div className="max-w-sm">
      <PlayersPanel data={players} />
    </div>
  );
}

const meta = {
  title: "Practice game/Players panel",
  component: Showcase,
  args: { fixture: botMidTurn },
} satisfies Meta<typeof Showcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RollOff: Story = { args: { fixture: rollOff } };
export const StarterLimitSet: Story = { args: { fixture: starterLimitSet } };
export const BotMidTurn: Story = {};
export const TieBreak: Story = { args: { fixture: tieBreakViewerToRoll } };
// "You" and the rest follow the viewer's seat, not seat 0.
export const ViewedFromSeat2: Story = { args: { viewerSeat: 2 } };
