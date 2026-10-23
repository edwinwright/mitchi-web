import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  beatTieBreakRolled,
  beatViewerRollToStart,
  beatViewerRolls,
  beatViewerStops,
  botBeats,
  botMidTurn,
  botTies,
  botWorse,
  fixtureSession,
  gameOverDraw,
  gameOverUnique,
  notStarted,
  roundSummary,
  starterLimitSet,
  tieBreakViewerToRoll,
  viewerKeptOne,
  type Fixture,
  type SessionOptions,
} from "../testing";
import { sliceSession } from "./board-slices";
import { DiceTray } from "./dice-tray";

const noop = () => {};

function Showcase({
  fixture,
  options,
}: {
  fixture: Fixture;
  options?: SessionOptions;
}) {
  const session = fixtureSession(fixture, options);
  const slices = sliceSession(session);
  return (
    <div className="max-w-[420px] rounded-xl bg-stone-100">
      <DiceTray
        tray={slices.tray}
        controls={slices.controls}
        stage={slices.header.stage}
        viewerSeat={session.view.viewerSeat}
        onPrimary={{
          start: noop,
          roll: noop,
          nextRound: noop,
          playAgain: noop,
        }}
        onKeep={noop}
        onStop={noop}
      />
    </div>
  );
}

const meta = {
  title: "Practice game/Dice tray",
  component: Showcase,
  args: { fixture: notStarted },
} satisfies Meta<typeof Showcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotStarted: Story = {};
/** The viewer's die to start, on its own beat, named, before the handover. */
export const RollToStartLanded: Story = {
  args: { fixture: beatViewerRollToStart },
};
/** The handover beat: placeholders while Player 2's turn starts. */
export const HandoverPlaceholders: Story = {
  args: { fixture: starterLimitSet },
};
export const MidRoll: Story = { args: { fixture: viewerKeptOne } };
export const BotMidTurn: Story = { args: { fixture: botMidTurn } };
/** The viewer's stop: their finished hand, named, before the handover. */
export const TurnEndedHeld: Story = { args: { fixture: beatViewerStops } };
/** Player 2's tie-break roll, on its own beat, named. */
export const TieBreakRolledHeld: Story = {
  args: { fixture: beatTieBreakRolled },
};
/** The handover to the viewer's tie-break roll: placeholders. */
export const TieBreak: Story = { args: { fixture: tieBreakViewerToRoll } };
/** The pot taken: placeholders. */
export const PotTaken: Story = { args: { fixture: roundSummary } };
export const GameOverWin: Story = { args: { fixture: gameOverUnique } };
export const GameOverDraw: Story = { args: { fixture: gameOverDraw } };
export const Pending: Story = {
  args: { fixture: viewerKeptOne, options: { pending: true } },
};

// The tumble plays on load. In DevTools, getComputedStyle on a rolling die
// gives animationDuration 0.5s here and 0.2s at Fast.
export const ViewerRolling: Story = { args: { fixture: beatViewerRolls } };
export const ViewerRollingFast: Story = {
  args: { fixture: beatViewerRolls, options: { rollMs: 200 } },
};
export const BotRolling: Story = {
  args: { fixture: botMidTurn, options: { rollMs: 500 } },
};
// Another player against the viewer's 6-3: the three sentences, in context.
export const BotBeats: Story = { args: { fixture: botBeats } };
export const BotTies: Story = { args: { fixture: botTies } };
export const BotWorse: Story = { args: { fixture: botWorse } };
