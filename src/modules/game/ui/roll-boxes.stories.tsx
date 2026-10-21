import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RollBoxes } from "./roll-boxes";

const meta = {
  title: "Practice game/Roll boxes",
  component: RollBoxes,
  args: { available: 3, used: 0 },
  // The tray's linen.
  decorators: [
    (Story) => (
      <div className="inline-flex bg-stone-100 p-4">
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
/** A tie-break, or the roll to start. */
export const OneRoll: Story = { args: { available: 1, used: 0 } };
