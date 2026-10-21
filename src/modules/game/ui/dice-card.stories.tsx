import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
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
/** The limit is set; a bot is to roll, the viewer's 6-3 still on show. */
export const LimitSet: Story = { args: { fixture: starterLimitSet } };
export const BotMidTurn: Story = { args: { fixture: botMidTurn } };
export const TieBreak: Story = { args: { fixture: tieBreakViewerToRoll } };
export const RoundSummary: Story = { args: { fixture: roundSummary } };
export const GameOverWin: Story = { args: { fixture: gameOverUnique } };
export const GameOverDraw: Story = { args: { fixture: gameOverDraw } };
export const Pending: Story = {
  args: { fixture: viewerKeptOne, options: { pending: true } },
};
