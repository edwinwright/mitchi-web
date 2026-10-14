import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HomeHero } from "@/components/home-hero";

const meta = {
  title: "Home/HomeHero",
  component: HomeHero,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof HomeHero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

export const Mobile: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
};
