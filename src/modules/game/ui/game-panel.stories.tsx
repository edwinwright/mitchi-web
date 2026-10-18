import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  fixtureSession,
  gameOverDraw,
  roundSummary,
  viewerToRoll,
  type Fixture,
} from "../testing";
import { sliceSession } from "./board-slices";
import { GamePanel } from "./game-panel";

function Showcase({ fixture }: { fixture: Fixture }) {
  const session = fixtureSession(fixture);
  const { game } = sliceSession(session);
  return (
    <div className="max-w-sm">
      <GamePanel data={game} viewerSeat={session.view.viewerSeat} />
    </div>
  );
}

const meta = {
  title: "Practice game/Game panel",
  component: Showcase,
  args: { fixture: viewerToRoll },
} satisfies Meta<typeof Showcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoPoints: Story = {};
export const OneNearest: Story = { args: { fixture: roundSummary } };

// Two seats level on the most points. No fixture reaches this state, so the
// points are set by hand on a reachable one.
export const TiedNearest: Story = {
  args: {
    fixture: {
      ...roundSummary,
      state: { ...roundSummary.state, points: [0, 1, 0, 1] },
    },
  },
};

export const GameOver: Story = { args: { fixture: gameOverDraw } };
