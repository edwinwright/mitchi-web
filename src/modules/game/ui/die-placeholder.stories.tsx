import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DiePlaceholder } from "./die-placeholder";

const meta = {
  title: "Practice game/Die placeholder",
  component: DiePlaceholder,
  args: { size: 72 },
} satisfies Meta<typeof DiePlaceholder>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The tray. */
export const Tray: Story = {};
/** The dice card header, on ink. */
export const Header: Story = {
  args: { size: 26 },
  decorators: [
    (Story) => (
      <div className="inline-flex bg-stone-950 p-4">
        <Story />
      </div>
    ),
  ],
};
/** A players card row. */
export const Row: Story = { args: { size: 22 } };
