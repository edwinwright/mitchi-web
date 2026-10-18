import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  botMidTurn,
  fixtureSession,
  tieBreakViewerToRoll,
  viewerRolledKeepable,
  viewerToRoll,
  type Fixture,
} from "../testing";
import { sliceSession } from "./board-slices";
import { RoundPanel } from "./round-panel";

function Showcase({ fixture }: { fixture: Fixture }) {
  const { round } = sliceSession(fixtureSession(fixture));
  if (!round) throw new Error("This fixture has no round yet");
  return (
    <div className="max-w-sm">
      <RoundPanel data={round} />
    </div>
  );
}

const meta = {
  title: "Practice game/Round panel",
  component: Showcase,
  args: { fixture: viewerToRoll },
} satisfies Meta<typeof Showcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const BotMidTurn: Story = { args: { fixture: botMidTurn } };
export const ViewerRolled: Story = { args: { fixture: viewerRolledKeepable } };
export const TieBreak: Story = { args: { fixture: tieBreakViewerToRoll } };
