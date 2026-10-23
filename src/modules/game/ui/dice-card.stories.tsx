import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  beatBotKeepSwap,
  beatGameStart,
  beatLastHandOfRound,
  beatNoRollsLeft,
  beatRollOffTie,
  beatRollOffWinner,
  beatTieBreakOpens,
  beatTieBreakRolled,
  beatViewerRollToStart,
  beatViewerStops,
  botKept,
  botMidTurn,
  fixtureSession,
  gameOverDraw,
  gameOverUnique,
  notStarted,
  rollOff,
  rollOffReroll,
  roundSummary,
  starterLimitSet,
  tieBreakViewerToRoll,
  viewerKeptOne,
  viewerRolledKeepable,
  type Fixture,
  type SessionOptions,
} from "../testing";
import { sliceSession } from "./board-slices";
import { DiceCard } from "./dice-card";

const noop = () => {};

function Showcase({
  fixture,
  options,
}: {
  fixture: Fixture;
  options?: SessionOptions;
}) {
  const session = fixtureSession(fixture, options);
  return (
    <div className="max-w-[420px]">
      <DiceCard
        slices={sliceSession(session)}
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
  title: "Practice game/Dice card",
  component: Showcase,
  args: { fixture: notStarted },
} satisfies Meta<typeof Showcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotStarted: Story = {};
/** The viewer has rolled to start; a bot is next. */
export const RollOff: Story = { args: { fixture: rollOff } };
/** A tie on the highest die: the viewer rolls again. */
export const RollOffReroll: Story = { args: { fixture: rollOffReroll } };
/** The starter mid-turn, one die kept: no roll limit yet, three boxes. */
export const StarterTurn: Story = { args: { fixture: viewerKeptOne } };
/** The handover beat: placeholders, and the status names Player 2. */
export const LimitSet: Story = { args: { fixture: starterLimitSet } };
export const BotMidTurn: Story = { args: { fixture: botMidTurn } };
export const TieBreak: Story = { args: { fixture: tieBreakViewerToRoll } };
export const RoundSummary: Story = { args: { fixture: roundSummary } };
export const GameOverWin: Story = { args: { fixture: gameOverUnique } };
export const GameOverDraw: Story = { args: { fixture: gameOverDraw } };
export const Pending: Story = {
  args: { fixture: viewerKeptOne, options: { pending: true } },
};

// The beat gallery: the status line under the heading says what is happening now.
export const GameStart: Story = { args: { fixture: beatGameStart } };
export const RollToStartLanded: Story = {
  args: { fixture: beatViewerRollToStart },
};
export const RollOffTie: Story = { args: { fixture: beatRollOffTie } };
export const RollOffWinner: Story = { args: { fixture: beatRollOffWinner } };
export const ViewerRolls: Story = { args: { fixture: viewerRolledKeepable } };
/** The viewer's keep is silent: the line still reads "You roll". */
export const ViewerKeepSilent: Story = { args: { fixture: viewerKeptOne } };
export const BotKeeps: Story = { args: { fixture: botKept } };
export const BotKeepSwap: Story = { args: { fixture: beatBotKeepSwap } };
export const ViewerStops: Story = { args: { fixture: beatViewerStops } };
export const NoRollsLeft: Story = { args: { fixture: beatNoRollsLeft } };
export const TieBreakOpens: Story = { args: { fixture: beatTieBreakOpens } };
export const TieBreakRolled: Story = { args: { fixture: beatTieBreakRolled } };
export const LastHandOfRound: Story = {
  args: { fixture: beatLastHandOfRound },
};
