import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SiteFooter } from "@/components/site-footer";

const meta = {
  title: "Site chrome/SiteFooter",
  component: SiteFooter,
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/rules" } },
  },
} satisfies Meta<typeof SiteFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Desktop: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

export const Mobile: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
};
