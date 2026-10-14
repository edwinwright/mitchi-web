import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SiteNav } from "@/components/site-nav";
import { withInverseSurface } from "../../.storybook/decorators";

const meta = {
  title: "Site chrome/SiteNav",
  component: SiteNav,
  parameters: { nextjs: { navigation: { pathname: "/rules" } } },
} satisfies Meta<typeof SiteNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Row: Story = { args: { layout: "row" } };

export const Stack: Story = { args: { layout: "stack" } };

export const Grid: Story = { args: { layout: "grid" } };

export const Inverse: Story = {
  args: { inverse: true },
  decorators: [withInverseSurface],
};
