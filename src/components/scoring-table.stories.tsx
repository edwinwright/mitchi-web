import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ScoringTable } from "@/components/scoring-table";

const meta = {
  title: "Rules/ScoringTable",
  component: ScoringTable,
} satisfies Meta<typeof ScoringTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
