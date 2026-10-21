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

// Another player's hand: only "beats" has screen-reader copy.
export const AnotherPlayerBeats: Story = { args: { viewer: false } };
export const AnotherPlayerWorse: Story = {
  args: { standing: "worse", viewer: false },
};
