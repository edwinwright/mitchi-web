import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  beatGameStart,
  beatRoundTwoBotStarts,
  beatViewerStops,
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

/** The game starts: You are rolling now, the others Waiting. */
export const RollToStartRolling: Story = { args: { fixture: beatGameStart } };
/** The viewer has stopped: nobody is current until the handover. */
export const BetweenTurns: Story = { args: { fixture: beatViewerStops } };
/** A later round starts with a bot: its starter is current at once. */
export const RoundTwoStart: Story = {
  args: { fixture: beatRoundTwoBotStarts },
};
