import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RollBoxes } from "./roll-boxes";

const meta = {
  title: "Practice game/Roll boxes",
  component: RollBoxes,
  args: { available: 3, used: 0 },
  // The header's ink.
  decorators: [
    (Story) => (
      <div className="inline-flex bg-stone-950 p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RollBoxes>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The starting player, before the limit is set. */
export const StarterThree: Story = {};
export const StarterOneUsed: Story = { args: { used: 1 } };
export const LimitTwoOneUsed: Story = { args: { available: 2, used: 1 } };
export const LimitOneUsed: Story = { args: { available: 1, used: 1 } };
