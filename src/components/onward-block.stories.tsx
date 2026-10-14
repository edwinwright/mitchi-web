import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useTranslations } from "next-intl";
import { OnwardBlock } from "@/components/onward-block";

const meta = {
  title: "Layout/OnwardBlock",
  component: OnwardBlock,
  args: { href: "/reference", heading: "", label: "", summary: "" },
} satisfies Meta<typeof OnwardBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

function Onward({ page }: { page: "reference" | "rules" | "about" }) {
  const t = useTranslations("nextPage");
  return (
    <OnwardBlock
      href={`/${page}`}
      heading={t("heading")}
      label={t(`${page}.label`)}
      summary={t(`${page}.summary`)}
    />
  );
}

export const ToReference: Story = { render: () => <Onward page="reference" /> };

export const ToRules: Story = { render: () => <Onward page="rules" /> };

export const ToAbout: Story = { render: () => <Onward page="about" /> };
