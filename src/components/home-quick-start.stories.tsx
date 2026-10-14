import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HomeQuickStart } from "@/components/home-quick-start";

const meta = {
  title: "Home/HomeQuickStart",
  component: HomeQuickStart,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof HomeQuickStart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
