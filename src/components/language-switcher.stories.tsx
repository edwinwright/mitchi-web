import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LanguageSwitcher } from "@/components/language-switcher";
import { withInverseSurface } from "../../.storybook/decorators";

const meta = {
  title: "Site chrome/LanguageSwitcher",
  component: LanguageSwitcher,
  parameters: { nextjs: { navigation: { pathname: "/rules" } } },
} satisfies Meta<typeof LanguageSwitcher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Group: Story = { args: { variant: "group" } };

export const List: Story = { args: { variant: "list" } };

export const Inverse: Story = {
  args: { variant: "list", inverse: true },
  decorators: [withInverseSurface],
};

export const Spanish: Story = { globals: { locale: "es" } };

export const Polish: Story = { globals: { locale: "pl" } };
