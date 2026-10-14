import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useTranslations } from "next-intl";
import { RuleBody } from "@/components/rule-body";
import { RuleSection } from "@/components/rule-section";
import { tags } from "@/i18n/rich-text";

const meta = {
  title: "Rules/RuleSection",
  component: RuleSection,
  args: { id: "setup", number: 3, heading: "", children: null },
} satisfies Meta<typeof RuleSection>;

export default meta;
type Story = StoryObj<typeof meta>;

function Section() {
  const t = useTranslations("rules.scoring");
  return (
    <RuleSection id="scoring" number={6} heading={t("heading")}>
      <RuleBody>
        <p>{t.rich("startingPot", tags)}</p>
        <p>{t.rich("mitchis", tags)}</p>
        <p>{t.rich("takeThePot", tags)}</p>
      </RuleBody>
    </RuleSection>
  );
}

export const Default: Story = { render: () => <Section /> };
