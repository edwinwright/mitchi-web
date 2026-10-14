import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TermList } from "@/components/term-list";

const meta = {
  title: "Rules/TermList",
  component: TermList,
} satisfies Meta<typeof TermList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
