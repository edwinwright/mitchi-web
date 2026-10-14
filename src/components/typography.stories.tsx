import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useTranslations } from "next-intl";
import { Heading } from "@/components/heading";
import { Prose } from "@/components/prose";
import { RuleBody } from "@/components/rule-body";
import { SectionHeading } from "@/components/section-heading";
import { tags } from "@/i18n/rich-text";
import { withInverseSurface } from "../../.storybook/decorators";

// Heading, SectionHeading, Prose and RuleBody are thin wrappers, so they share
// one story file. Classes on Heading are the ones the pages pass.
const meta = {
  title: "Typography",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Headings() {
  const t = useTranslations("rules");
  return (
    <div className="flex flex-col gap-4">
      <Heading level={1} className="text-3xl">
        {t("title")}
      </Heading>
      <Heading level={2} className="text-2xl md:text-3xl">
        {t("overview.heading")}
      </Heading>
      <Heading level={3} className="text-lg font-semibold xl:text-xl">
        {t("round.rollLimit.heading")}
      </Heading>
    </div>
  );
}

function SectionHeadings({ inverse = false }: { inverse?: boolean }) {
  const t = useTranslations("rules");
  return <SectionHeading inverse={inverse}>{t("scoring.heading")}</SectionHeading>;
}

function ProseSample() {
  const t = useTranslations("rules");
  return (
    <Prose>
      <p>{t.rich("overview.summary", tags)}</p>
      <ul>
        {(["dice", "paper", "players"] as const).map((key) => (
          <li key={key}>{t.rich(`youNeed.${key}`, tags)}</li>
        ))}
      </ul>
    </Prose>
  );
}

function RuleBodySample() {
  const t = useTranslations("rules");
  return (
    <RuleBody>
      <p>{t.rich("setup.pointLimit", tags)}</p>
      <p>{t.rich("setup.whoStarts", tags)}</p>
      <p>{t.rich("scoring.startingPot", tags)}</p>
    </RuleBody>
  );
}

export const Headings1To3: Story = {
  name: "Heading levels 1 to 3",
  render: () => <Headings />,
};

export const SectionHeadingPlain: Story = {
  name: "SectionHeading",
  render: () => <SectionHeadings />,
};

export const SectionHeadingInverse: Story = {
  name: "SectionHeading inverse",
  render: () => <SectionHeadings inverse />,
  decorators: [withInverseSurface],
};

export const ProseLongForm: Story = {
  name: "Prose",
  render: () => <ProseSample />,
};

export const RuleBodyParagraphs: Story = {
  name: "RuleBody",
  render: () => <RuleBodySample />,
};
