import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  closeToLimit,
  fixtureSession,
  gameOverDraw,
  gameOverUnique,
  notStarted,
  roundSummary,
  type Fixture,
} from "../testing";
import { sliceSession } from "./board-slices";
import { GamePanel } from "./game-panel";

function Showcase({ fixture }: { fixture: Fixture }) {
  const session = fixtureSession(fixture);
  const { points } = sliceSession(session);
  return (
    <div className="max-w-[370px]">
      <GamePanel data={points} viewerSeat={session.view.viewerSeat} />
    </div>
  );
}

const meta = {
  title: "Practice game/Game panel",
  component: Showcase,
  args: { fixture: notStarted },
} satisfies Meta<typeof Showcase>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every seat on 0: nobody is a leader. */
export const NotStarted: Story = {};
/** Three seats tied on 0: three leaders, and no row is gold. */
export const ThreeLeaders: Story = { args: { fixture: roundSummary } };
/** Seat 3 on 3 of 5 is close; seat 1 on 2 is not. */
export const CloseToLimit: Story = { args: { fixture: closeToLimit } };
/** Only the winner is gold, under the trophy. */
export const GameOverWin: Story = { args: { fixture: gameOverUnique } };
export const GameOverDraw: Story = { args: { fixture: gameOverDraw } };
