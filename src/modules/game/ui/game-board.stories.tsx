import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  botMidTurn,
  fixtureSession,
  gameOverDraw,
  gameOverUnique,
  notStarted,
  roundSummary,
  tieBreakViewerToRoll,
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

export const NotStarted: Story = { args: { fixture: notStarted } };
export const ViewerToRoll: Story = {};
export const BotMidTurn: Story = { args: { fixture: botMidTurn } };
export const Pending: Story = {
  args: { fixture: botMidTurn, options: { pending: true } },
};
export const TieBreak: Story = { args: { fixture: tieBreakViewerToRoll } };
export const RoundSummary: Story = { args: { fixture: roundSummary } };
export const GameOverDraw: Story = { args: { fixture: gameOverDraw } };
export const ViewerWins: Story = { args: { fixture: gameOverUnique } };
export const OnlineNoPacing: Story = {
  args: { fixture: botMidTurn, options: { pacing: null } },
};
export const ViewedFromSeat2: Story = {
  args: { fixture: botMidTurn, options: { viewerSeat: 2 } },
};
export const Mobile: Story = {
  args: { fixture: botMidTurn },
  globals: mobile,
};
export const MobilePolish: Story = {
  args: { fixture: tieBreakViewerToRoll },
  globals: { ...mobile, locale: "pl" },
};
