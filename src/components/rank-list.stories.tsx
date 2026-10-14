import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RankList } from "@/components/rank-list";

const meta = {
  title: "Rules content/RankList",
  component: RankList,
} satisfies Meta<typeof RankList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const List: Story = { args: { variant: "list" } };

export const Cards: Story = { args: { variant: "cards" } };
