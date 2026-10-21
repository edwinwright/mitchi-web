import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  botMidTurn,
  fixtureSession,
  gameOverDraw,
  notStarted,
  rollOff,
  roundSummary,
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
  holding = false,
}: {
  fixture: Fixture;
  options?: SessionOptions;
  /** As the board does while the last roll's hold runs. */
  holding?: boolean;
}) {
  const session = fixtureSession(fixture, options);
  const slices = sliceSession(session, { holding });
  return (
    <div className="max-w-[420px] rounded-[22px] bg-stone-100">
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
/** The viewer's roll-off die, held and named, while a bot is next. */
export const RollOffHeld: Story = { args: { fixture: rollOff, holding: true } };
export const MidRoll: Story = { args: { fixture: viewerKeptOne } };
export const BotMidTurn: Story = { args: { fixture: botMidTurn } };
/** Player 2's tie-break roll, held under the viewer's turn and named. */
export const TieBreakHeld: Story = {
  args: { fixture: tieBreakViewerToRoll, holding: true },
};
/** After the hold: placeholders for the viewer's roll. */
export const TieBreak: Story = { args: { fixture: tieBreakViewerToRoll } };
export const RoundSummaryHeld: Story = {
  args: { fixture: roundSummary, holding: true },
};
export const GameOver: Story = { args: { fixture: gameOverDraw } };
export const Pending: Story = {
  args: { fixture: viewerKeptOne, options: { pending: true } },
};
