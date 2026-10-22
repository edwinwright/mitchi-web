import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  beatGameStart,
  beatRoundTwoBotStarts,
  beatViewerStops,
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
import { RoundPanel, type RoundView } from "./round-panel";

function Showcase({
  fixture,
  viewerSeat,
  defaultView,
}: {
  fixture: Fixture;
  viewerSeat?: number;
  defaultView?: RoundView;
}) {
  const session = fixtureSession(fixture, { viewerSeat });
  const { roundBar, roundRows } = sliceSession(session);
  return (
    <div className="max-w-[370px]">
      <RoundPanel
        bar={roundBar}
        rows={roundRows}
        viewerSeat={session.view.viewerSeat}
        defaultView={defaultView}
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
/** Opens on By hand; Tab to the switch and press By player to go back. */
export const ByHand: Story = { args: { defaultView: "byHand" } };

/** The game starts: You are rolling now, the others Waiting. */
export const RollToStartRolling: Story = { args: { fixture: beatGameStart } };
/** The viewer has stopped: nobody is current until the handover. */
export const BetweenTurns: Story = { args: { fixture: beatViewerStops } };
/** A later round starts with a bot: its starter is current at once. */
export const RoundTwoStart: Story = {
  args: { fixture: beatRoundTwoBotStarts },
};
