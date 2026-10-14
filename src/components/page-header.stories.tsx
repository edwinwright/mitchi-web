import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";

const meta = {
  title: "Page blocks/PageHeader",
  component: PageHeader,
  parameters: { layout: "fullscreen" },
  args: { title: "" },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

function Header({ standfirst = true }: { standfirst?: boolean }) {
  const t = useTranslations("rules");
  return (
    <PageHeader
      title={t("title")}
      standfirst={standfirst ? t("intro") : undefined}
    />
  );
}

export const WithStandfirst: Story = { render: () => <Header /> };

export const TitleOnly: Story = { render: () => <Header standfirst={false} /> };
