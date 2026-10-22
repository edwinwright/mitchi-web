import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CommentaryRowView } from "./commentary-row";

const meta = {
  title: "Practice game/Commentary row",
  component: CommentaryRowView,
  args: { viewerSeat: 0, row: { kind: "turn", key: "1" } },
  decorators: [
    (Story) => (
      <p className="flex max-w-[420px] flex-wrap items-center gap-x-2 gap-y-1">
        <Story />
      </p>
    ),
  ],
} satisfies Meta<typeof CommentaryRowView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const YourTurn: Story = {};

export const PlayerRollsToStart: Story = {
  args: {
    row: {
      kind: "action",
      key: "1",
      seat: 2,
      voice: "player",
      shown: { kind: "die", face: 5 },
      phrase: { type: "rollsToStart" },
      reason: null,
    },
  },
};

export const Tied: Story = {
  args: { row: { kind: "tied", key: "1", face: 6 } },
};

export const Round: Story = {
  args: { row: { kind: "round", key: "1", number: 2 } },
};

export const YouRoll: Story = {
  args: {
    row: {
      kind: "action",
      key: "1",
      seat: 0,
      voice: "you",
      shown: { kind: "hand", dice: [3, 5], hand: "5-3" },
      phrase: { type: "rolls" },
      reason: null,
    },
  },
};

/** A bot row: label, dice, hand, phrase and the bot's reason. */
export const PlayerRollsAgainKeeping: Story = {
  args: {
    row: {
      kind: "action",
      key: "1",
      seat: 1,
      voice: "player",
      shown: { kind: "hand", dice: [6, 2], hand: "6-2" },
      phrase: { type: "rollAgainKeeping" },
      reason: "keepingHighDie",
    },
  },
};

export const PlayerStopsOnMitchi: Story = {
  args: {
    row: {
      kind: "action",
      key: "1",
      seat: 3,
      voice: "player",
      shown: { kind: "hand", dice: [1, 2], hand: "2-1" },
      phrase: { type: "stop" },
      reason: "goodEnough",
    },
  },
};

export const RollLimit: Story = {
  args: { row: { kind: "rollLimit", key: "1", limit: 2 } },
};

export const PotMitchi: Story = {
  args: { row: { kind: "pot", key: "1", pot: 2, cause: "mitchi" } },
};

export const TieBreakClockwise: Story = {
  args: {
    row: {
      kind: "tieBreak",
      key: "1",
      number: 1,
      direction: "clockwise",
      order: [1, 2],
    },
  },
};

export const TieBreakAnticlockwise: Story = {
  args: {
    row: {
      kind: "tieBreak",
      key: "1",
      number: 2,
      direction: "anticlockwise",
      order: [2, 0],
    },
  },
};

export const PotTieBreak: Story = {
  args: { row: { kind: "pot", key: "1", pot: 4, cause: "tieBreak" } },
};

export const YouTakeThePot: Story = {
  args: {
    row: {
      kind: "action",
      key: "1",
      seat: 0,
      voice: "you",
      shown: { kind: "hand", dice: [4, 1], hand: "4-1" },
      phrase: { type: "takesPot", pot: 3 },
      reason: null,
    },
  },
};

export const Draw: Story = {
  args: { row: { kind: "draw", key: "1" } },
};

export const GameOver: Story = {
  args: { row: { kind: "gameOver", key: "1" } },
};
