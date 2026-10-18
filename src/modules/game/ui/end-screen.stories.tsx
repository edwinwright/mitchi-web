import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  fixtureSession,
  gameOverDraw,
  gameOverUnique,
  type Fixture,
} from "../testing";
import { sliceSession } from "./board-slices";
import { EndScreen } from "./end-screen";

function Showcase({
  fixture,
  viewerSeat,
}: {
  fixture: Fixture;
  viewerSeat?: number;
}) {
  const { end } = sliceSession(fixtureSession(fixture, { viewerSeat }));
  if (!end) throw new Error("This fixture is not at game over");
  return (
    <div className="max-w-sm">
      <EndScreen data={end} viewerSeat={viewerSeat ?? 0} playAgain={() => {}} />
    </div>
  );
}

const meta = {
  title: "Practice game/End screen",
  component: Showcase,
  args: { fixture: gameOverUnique },
} satisfies Meta<typeof Showcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ViewerWins: Story = {};
// Seat 0 won; the viewer is seat 1, so the winner reads as a player.
export const OtherWins: Story = { args: { viewerSeat: 1 } };
export const Draw: Story = { args: { fixture: gameOverDraw } };
