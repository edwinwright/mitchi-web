import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  beatGameStart,
  beatRoundTwoBotStarts,
  beatViewerStops,
  botMidTurn,
  chainedTieBreakSummary,
  fixtureSession,
  gameOverDraw,
  tieBreakSummary,
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

export const ByPlayer: Story = {};
/** Opens on By hand; Tab to the switch and press By player to go back. */
export const ByHand: Story = { args: { defaultView: "byHand" } };
/** Game over leaves the card on By player: it never switches by itself. */
export const GameOver: Story = { args: { fixture: gameOverDraw } };
export const GameOverByHand: Story = {
  args: { fixture: gameOverDraw, defaultView: "byHand" },
};
/**
 * Settled by tie-break 1: the tied seats show their tie-break hands, the
 * header's worst hand among them; the others are not in this tie-break.
 */
export const TieBreakSummaryByHand: Story = {
  args: { fixture: tieBreakSummary, defaultView: "byHand" },
};
/** Tie-breaks chained: only tie-break 2's hands, never tie-break 1's 4-3s. */
export const ChainedTieBreakSummaryByHand: Story = {
  args: { fixture: chainedTieBreakSummary, defaultView: "byHand" },
};

/** The game starts: You are rolling now, the others Waiting. */
export const RollToStartRolling: Story = { args: { fixture: beatGameStart } };
/** The viewer has stopped: nobody is current until the handover. */
export const BetweenTurns: Story = { args: { fixture: beatViewerStops } };
/** A later round starts with a bot: its starter is current at once. */
export const RoundTwoStart: Story = {
  args: { fixture: beatRoundTwoBotStarts },
};
