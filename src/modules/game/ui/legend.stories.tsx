import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Legend } from "./legend";

const meta = {
  title: "Practice game/Legend",
  component: Legend,
  args: { items: ["rollingNow", "starting", "holdsWorst", "mitchi"] },
  decorators: [
    (Story) => (
      <div className="max-w-[370px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Legend>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThisRound: Story = {};
export const Points: Story = {
  args: { items: ["fewestPoints", "closeToLimit"] },
};
export const PointsGameOver: Story = {
  args: { items: ["fewestPoints", "reachedLimit"] },
};
