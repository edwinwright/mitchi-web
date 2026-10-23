import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  beatTieBreakOpens,
  botMidTurn,
  fixtureSession,
  gameOverUnique,
  notStarted,
  rollOff,
  roundSummary,
  starterLimitSet,
  tieBreakViewerToRoll,
  viewerRolledKeepable,
  viewerToRoll,
  type Fixture,
} from "../testing";
import { sliceSession } from "./board-slices";
import { RoundHeader } from "./round-header";

function Showcase({ fixture }: { fixture: Fixture }) {
  return (
    <div className="max-w-[420px] overflow-hidden rounded-xl">
      <RoundHeader header={sliceSession(fixtureSession(fixture)).header} />
    </div>
  );
}

const meta = {
  title: "Practice game/Round header",
  component: Showcase,
  args: { fixture: notStarted },
} satisfies Meta<typeof Showcase>;

export default meta;
type Story = StoryObj<typeof meta>;

// One story per stage: the heading says where play is, never who.
export const NotStarted: Story = {};
/** One roll each: no rolls left. */
export const RollOff: Story = { args: { fixture: rollOff } };
/** The starter has three rolls, and nobody has a hand to beat yet. */
export const StarterTurn: Story = { args: { fixture: viewerToRoll } };
export const StarterOneRollUsed: Story = {
  args: { fixture: viewerRolledKeepable },
};
/** The starter used two rolls: everyone else has two. */
export const LimitSet: Story = { args: { fixture: starterLimitSet } };
export const BotMidTurn: Story = { args: { fixture: botMidTurn } };
/** Player 3 ended the round and Players 1 and 2 tied: no seat named. */
export const TieBreakOpens: Story = { args: { fixture: beatTieBreakOpens } };
export const TieBreak: Story = { args: { fixture: tieBreakViewerToRoll } };
export const RoundSummary: Story = { args: { fixture: roundSummary } };
export const GameOver: Story = { args: { fixture: gameOverUnique } };
