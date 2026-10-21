import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  botMidTurn,
  fixtureSession,
  gameOverDraw,
  type Fixture,
} from "../testing";
import { sliceSession } from "./board-slices";
import { PlayersCard, type PlayersView } from "./players-card";

function Showcase({
  fixture,
  defaultView,
}: {
  fixture: Fixture;
  defaultView?: PlayersView;
}) {
  const session = fixtureSession(fixture);
  return (
    <div className="max-w-[370px]">
      <PlayersCard
        slices={sliceSession(session)}
        viewerSeat={session.view.viewerSeat}
        defaultView={defaultView}
      />
    </div>
  );
}

const meta = {
  title: "Practice game/Players card",
  component: Showcase,
  args: { fixture: botMidTurn },
} satisfies Meta<typeof Showcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThisRound: Story = {};
export const Points: Story = { args: { defaultView: "points" } };
/** Game over leaves the card on This round: it never switches by itself. */
export const GameOver: Story = { args: { fixture: gameOverDraw } };
export const GameOverPoints: Story = {
  args: { fixture: gameOverDraw, defaultView: "points" },
};
