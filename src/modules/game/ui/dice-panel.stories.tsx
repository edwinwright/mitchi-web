import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  botKept,
  botMidTurn,
  fixtureSession,
  notStarted,
  rollOff,
  roundSummary,
  tieBreakViewerToRoll,
  viewerKeptBoth,
  viewerKeptOne,
  viewerRolledKeepable,
  viewerToRoll,
  type Fixture,
} from "../testing";
import { sliceSession } from "./board-slices";
import { DicePanel } from "./dice-panel";
import { PacingControls } from "./pacing-controls";

const noop = () => {};

function Showcase({
  fixture,
  pending = false,
}: {
  fixture: Fixture;
  pending?: boolean;
}) {
  const session = fixtureSession(fixture, { pending });
  const { dice, controls } = sliceSession(session);
  return (
    <div className="max-w-sm">
      <DicePanel
        data={dice}
        controls={controls}
        onStart={noop}
        onRoll={noop}
        onKeep={noop}
        onStop={noop}
        onNextRound={noop}
        footer={
          session.pacing ? <PacingControls pacing={session.pacing} /> : null
        }
      />
    </div>
  );
}

const meta = {
  title: "Practice game/Dice panel",
  component: Showcase,
  args: { fixture: viewerToRoll },
} satisfies Meta<typeof Showcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotStarted: Story = { args: { fixture: notStarted } };
export const RollOff: Story = { args: { fixture: rollOff } };
export const ViewerToRoll: Story = {};
export const KeptOne: Story = { args: { fixture: viewerKeptOne } };
export const KeptBoth: Story = { args: { fixture: viewerKeptBoth } };
export const TieBreakRoll: Story = {
  args: { fixture: tieBreakViewerToRoll },
};
export const BotMidTurn: Story = { args: { fixture: botMidTurn } };
export const BotKept: Story = { args: { fixture: botKept } };
export const RoundSummary: Story = { args: { fixture: roundSummary } };
export const Pending: Story = {
  args: { fixture: viewerRolledKeepable, pending: true },
};
