import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useTranslations } from "next-intl";
import { StepList } from "@/components/step-list";
import { tags } from "@/i18n/rich-text";

const meta = {
  title: "Page blocks/StepList",
  component: StepList,
  args: { items: [] },
} satisfies Meta<typeof StepList>;

export default meta;
type Story = StoryObj<typeof meta>;

function Steps() {
  const t = useTranslations("rules.setup");
  return (
    <StepList items={[t.rich("pointLimit", tags), t.rich("whoStarts", tags)]} />
  );
}

export const Setup: Story = { render: () => <Steps /> };
