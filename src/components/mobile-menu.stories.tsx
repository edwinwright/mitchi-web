import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LanguageSwitcher } from "@/components/language-switcher";
import { MobileMenu } from "@/components/mobile-menu";
import { SiteNav } from "@/components/site-nav";

const meta = {
  title: "Site chrome/MobileMenu",
  component: MobileMenu,
  parameters: { nextjs: { navigation: { pathname: "/rules" } } },
  args: { children: null },
} satisfies Meta<typeof MobileMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

// A <details> element, closed by default and with no `open` prop: click the
// hamburger to open it. The panel is absolutely positioned against the nearest
// positioned ancestor, as it is in the header, hence the `relative` wrapper.
export const Closed: Story = {
  name: "Closed (click to open)",
  render: () => (
    <div className="relative min-h-72">
      <MobileMenu>
        <div className="flex flex-row items-end justify-between gap-4">
          <SiteNav layout="stack" />
          <LanguageSwitcher />
        </div>
      </MobileMenu>
    </div>
  ),
};
