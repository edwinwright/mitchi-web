import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TieBreakExampleTable } from "@/components/tie-break-example-table";

const meta = {
  title: "Rules/TieBreakExampleTable",
  component: TieBreakExampleTable,
} satisfies Meta<typeof TieBreakExampleTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
