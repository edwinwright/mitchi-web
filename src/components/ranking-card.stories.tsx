import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RankingCard } from "@/components/ranking-card";

const meta = {
  title: "Reference/RankingCard",
  component: RankingCard,
} satisfies Meta<typeof RankingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
