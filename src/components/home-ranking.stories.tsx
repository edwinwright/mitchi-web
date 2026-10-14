import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HomeRanking } from "@/components/home-ranking";

const meta = {
  title: "Home/HomeRanking",
  component: HomeRanking,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof HomeRanking>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
