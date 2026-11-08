import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  beatGameStart,
  beatRoundTwoBotStarts,
  beatViewerStops,
  botMidTurn,
  chainedTieBreakSummary,
  closeToLimit,
  fixtureSession,
  gameOverAfterTieBreak,
  gameOverDraw,
  gameOverUnique,
  mitchiInRound,
  notStarted,
  rollOff,
  rollOffReroll,
  roundSummary,
  tieBreakSummary,
  tieBreakViewerToRoll,
  viewerToRoll,
  type Fixture,
} from "../testing";
import { sliceSession } from "./board-slices";
import { ByPlayer } from "./by-player";

function Showcase({
  fixture,
  viewerSeat,
}: {
  fixture: Fixture;
  viewerSeat?: number;
}) {
  const session = fixtureSession(fixture, { viewerSeat });
  const { roundBar, roundRows, points } = sliceSession(session);
  return (
    <div className="max-w-[370px]">
      <ByPlayer
        bar={roundBar}
        roundRows={roundRows}
        points={points}
        viewerSeat={session.view.viewerSeat}
      />
    </div>
  );
}

const meta = {
  title: "Practice game/By player",
  component: Showcase,
  args: { fixture: botMidTurn },
} satisfies Meta<typeof Showcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotStarted: Story = { args: { fixture: notStarted } };
export const RollOff: Story = { args: { fixture: rollOff } };
export const RollOffReroll: Story = { args: { fixture: rollOffReroll } };
export const StarterTurn: Story = { args: { fixture: viewerToRoll } };
export const BotMidTurn: Story = {};
export const Mitchi: Story = { args: { fixture: mitchiInRound } };
/** Seats outside the tie-break mute their round row; their points stay. */
export const TieBreak: Story = { args: { fixture: tieBreakViewerToRoll } };
/** End of round, three leaders on 0, no card gold. */
export const RoundSummary: Story = { args: { fixture: roundSummary } };
export const TieBreakSummary: Story = { args: { fixture: tieBreakSummary } };
/** Tie-breaks chained: only tie-break 2's hands, never tie-break 1's 4-3s. */
export const ChainedTieBreakSummary: Story = {
  args: { fixture: chainedTieBreakSummary },
};
/** Seat 3 on 3 of 5 is close: its bar and points are red. */
export const CloseToLimit: Story = { args: { fixture: closeToLimit } };
/** Game over: only the winner's card is gold. */
export const GameOverWin: Story = { args: { fixture: gameOverUnique } };
export const GameOverDraw: Story = { args: { fixture: gameOverDraw } };
export const GameOverAfterTieBreak: Story = {
  args: { fixture: gameOverAfterTieBreak },
};
// "You" and the rest follow the viewer's seat, not seat 0.
export const ViewedFromSeat2: Story = { args: { viewerSeat: 2 } };

/** The game starts: You are rolling now, the others Waiting. */
export const RollToStartRolling: Story = { args: { fixture: beatGameStart } };
/** The viewer has stopped: nobody is current until the handover. */
export const BetweenTurns: Story = { args: { fixture: beatViewerStops } };
/** A later round starts with a bot: its starter is current at once. */
export const RoundTwoStart: Story = {
  args: { fixture: beatRoundTwoBotStarts },
};
