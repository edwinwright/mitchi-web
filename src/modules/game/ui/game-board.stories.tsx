import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  botMidTurn,
  fixtureSession,
  gameOverDraw,
  gameOverUnique,
  notStarted,
  rollOff,
  roundSummary,
  tieBreakViewerToRoll,
  viewerKeptOne,
  viewerToRoll,
  type Fixture,
  type SessionOptions,
} from "../testing";
import { GameBoard } from "./game-board";

function Showcase({
  fixture,
  options,
}: {
  fixture: Fixture;
  options?: SessionOptions;
}) {
  return <GameBoard session={fixtureSession(fixture, options)} />;
}

const meta = {
  title: "Practice game/Game board",
  component: Showcase,
  args: { fixture: viewerToRoll },
  parameters: { layout: "padded" },
} satisfies Meta<typeof Showcase>;

export default meta;
type Story = StoryObj<typeof meta>;

const mobile = { viewport: { value: "mobile1", isRotated: false } };

// Every phase in the design spec, at the default viewport and at 320px.
export const NotStarted: Story = { args: { fixture: notStarted } };
export const NotStartedMobile: Story = {
  args: { fixture: notStarted },
  globals: mobile,
};
export const RollOff: Story = { args: { fixture: rollOff } };
export const RollOffMobile: Story = {
  args: { fixture: rollOff },
  globals: mobile,
};
export const StarterTurn: Story = { args: { fixture: viewerToRoll } };
export const StarterTurnMobile: Story = {
  args: { fixture: viewerToRoll },
  globals: mobile,
};
export const MidRoll: Story = { args: { fixture: viewerKeptOne } };
export const MidRollMobile: Story = {
  args: { fixture: viewerKeptOne },
  globals: mobile,
};
export const BotMidTurn: Story = { args: { fixture: botMidTurn } };
export const BotMidTurnMobile: Story = {
  args: { fixture: botMidTurn },
  globals: mobile,
};
export const TieBreak: Story = { args: { fixture: tieBreakViewerToRoll } };
export const TieBreakMobile: Story = {
  args: { fixture: tieBreakViewerToRoll },
  globals: mobile,
};
export const RoundSummary: Story = { args: { fixture: roundSummary } };
export const RoundSummaryMobile: Story = {
  args: { fixture: roundSummary },
  globals: mobile,
};
export const GameOverWin: Story = { args: { fixture: gameOverUnique } };
export const GameOverWinMobile: Story = {
  args: { fixture: gameOverUnique },
  globals: mobile,
};
export const GameOverDraw: Story = { args: { fixture: gameOverDraw } };
export const GameOverDrawMobile: Story = {
  args: { fixture: gameOverDraw },
  globals: mobile,
};

export const Pending: Story = {
  args: { fixture: botMidTurn, options: { pending: true } },
};
export const OnlineNoPacing: Story = {
  args: { fixture: botMidTurn, options: { pacing: null } },
};
export const ViewedFromSeat2: Story = {
  args: { fixture: botMidTurn, options: { viewerSeat: 2 } },
};
export const MobilePolish: Story = {
  args: { fixture: tieBreakViewerToRoll },
  globals: { ...mobile, locale: "pl" },
};
