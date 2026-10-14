import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HomeProvenance } from "@/components/home-provenance";

const meta = {
  title: "Home/HomeProvenance",
  component: HomeProvenance,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof HomeProvenance>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
