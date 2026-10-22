import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HandComparison } from "./hand-comparison";

const meta = {
  title: "Practice game/Hand comparison",
  component: HandComparison,
  args: { standing: "beats", viewer: true },
  // The tray's linen.
  decorators: [
    (Story) => (
      <div className="inline-flex items-center bg-stone-100 p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HandComparison>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Beats: Story = {};
export const Ties: Story = { args: { standing: "ties" } };
export const Worse: Story = { args: { standing: "worse" } };

// Another player's hand: each standing has its own screen-reader sentence.
export const AnotherPlayerBeats: Story = { args: { viewer: false } };
export const AnotherPlayerTies: Story = {
  args: { standing: "ties", viewer: false },
};
export const AnotherPlayerWorse: Story = {
  args: { standing: "worse", viewer: false },
};
