import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useTranslations } from "next-intl";
import { OnThisPage } from "@/components/on-this-page";

const meta = {
  title: "Page blocks/OnThisPage",
  component: OnThisPage,
  args: { items: [] },
} satisfies Meta<typeof OnThisPage>;

export default meta;
type Story = StoryObj<typeof meta>;

function Contents({ count }: { count: 3 | 6 }) {
  const t = useTranslations("rules");
  const items = [
    { id: "overview", title: t("overview.heading") },
    { id: "what-you-need", title: t("youNeed.heading") },
    { id: "setup", title: t("setup.heading") },
    { id: "hands", title: t("hands.heading") },
    { id: "round", title: t("round.heading") },
    { id: "scoring", title: t("scoring.heading") },
  ];
  return <OnThisPage items={items.slice(0, count)} />;
}

export const Default: Story = { render: () => <Contents count={3} /> };

export const SixItems: Story = { render: () => <Contents count={6} /> };
