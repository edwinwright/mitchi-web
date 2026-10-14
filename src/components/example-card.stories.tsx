import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useTranslations } from "next-intl";
import { ExampleCard } from "@/components/example-card";
import { ExampleStrip } from "@/components/example-strip";
import { tags } from "@/i18n/rich-text";

const meta = {
  title: "Rules/ExampleCard",
  component: ExampleCard,
  args: { children: null },
} satisfies Meta<typeof ExampleCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const stripWrap =
  "mb-4 md:mb-5 border-b border-dashed border-border pb-4 md:pb-5";
const prose = "font-serif text-base text-stone-900 xl:text-lg";

function ProseOnly() {
  const t = useTranslations("rules.round.rollLimit");
  return (
    <ExampleCard>
      <div className={prose}>{t.rich("example", tags)}</div>
    </ExampleCard>
  );
}

// A strip above prose, as /rules composes the worked examples.
function WithStrip() {
  const t = useTranslations("rules.round.rollLimit");
  return (
    <ExampleCard>
      <div className={stripWrap}>
        <ExampleStrip
          rows={[
            {
              label: t("exampleStrip.player"),
              hand: "6-3",
              note: (
                <>
                  {t("exampleStrip.rolled")} → {t("exampleStrip.limit")}
                </>
              ),
            },
          ]}
        />
      </div>
      <div className={prose}>{t.rich("example", tags)}</div>
    </ExampleCard>
  );
}

export const Default: Story = { render: () => <ProseOnly /> };

export const WithDiceStrip: Story = { render: () => <WithStrip /> };
