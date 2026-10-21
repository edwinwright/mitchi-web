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
  viewerToRoll,
  type Fixture,
} from "../testing";
import { sliceSession } from "./board-slices";
import { RoundHeader } from "./round-header";

function Showcase({ fixture }: { fixture: Fixture }) {
  const session = fixtureSession(fixture);
  return (
    <div className="max-w-[420px] overflow-hidden rounded-[22px]">
      <RoundHeader
        header={sliceSession(session).header}
        viewerSeat={session.view.viewerSeat}
      />
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

// One story per row of the design spec's header table.
export const NotStarted: Story = {};
export const RollOff: Story = { args: { fixture: rollOff } };
export const RollOffViewerNext: Story = { args: { fixture: rollOffReroll } };
/** No roll limit yet, and placeholders for the hand to beat. */
export const StarterTurn: Story = { args: { fixture: viewerToRoll } };
export const LimitSet: Story = { args: { fixture: starterLimitSet } };
export const BotMidTurn: Story = { args: { fixture: botMidTurn } };
export const TieBreak: Story = { args: { fixture: tieBreakViewerToRoll } };
export const RoundSummary: Story = { args: { fixture: roundSummary } };
export const GameOverWin: Story = { args: { fixture: gameOverUnique } };
export const GameOverDraw: Story = { args: { fixture: gameOverDraw } };
