import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SkipLink } from "@/components/skip-link";

const meta = {
  title: "Site chrome/SkipLink",
  component: SkipLink,
} satisfies Meta<typeof SkipLink>;

export default meta;
type Story = StoryObj<typeof meta>;

// Visually hidden until focused: click the canvas, then press Tab once.
export const HiddenUntilFocused: Story = {
  name: "Hidden until focused (press Tab)",
};
