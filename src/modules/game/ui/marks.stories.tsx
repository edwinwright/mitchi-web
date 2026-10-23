import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Mark } from "./marks";

const meta = {
  title: "Practice game/Marks",
  component: Mark,
  args: { name: "starting", size: "md", labelled: true },
} satisfies Meta<typeof Mark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StartingPlayer: Story = {};
export const WorstHand: Story = { args: { name: "holdsWorst" } };
export const Mitchi: Story = { args: { name: "mitchi" } };
export const Leader: Story = { args: { name: "leader" } };
export const Winner: Story = { args: { name: "winner" } };
export const CloseToLimit: Story = { args: { name: "closeToLimit" } };
export const ReachedLimit: Story = { args: { name: "reachedLimit" } };

// The legend size, every mark side by side.
export const Small: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      {(
        [
          "starting",
          "holdsWorst",
          "mitchi",
          "leader",
          "winner",
          "closeToLimit",
          "reachedLimit",
        ] as const
      ).map((name) => (
        <Mark key={name} {...args} name={name} size="sm" />
      ))}
    </div>
  ),
};
