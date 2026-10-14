import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useTranslations } from "next-intl";
import { ExampleStrip } from "@/components/example-strip";

const meta = {
  title: "Rules content/ExampleStrip",
  component: ExampleStrip,
  args: { rows: [] },
} satisfies Meta<typeof ExampleStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

// Rows as /rules assembles them.
function OneRow() {
  const t = useTranslations("rules.round.rollLimit.exampleStrip");
  return (
    <ExampleStrip
      rows={[
        {
          label: t("player"),
          hand: "6-3",
          note: (
            <>
              {t("rolled")} → {t("limit")}
            </>
          ),
        },
      ]}
    />
  );
}

function ThreeRows() {
  const t = useTranslations("rules.round.everyoneElse.example1Strip");
  return (
    <ExampleStrip
      rows={[
        {
          label: t("player1"),
          hand: "6-4",
          note: (
            <>
              {t("player1Rolled")} → {t("player1Limit")}
            </>
          ),
        },
        {
          label: t("player2"),
          hand: "5-1",
          note: (
            <>
              {t("player2Rolled")} · {t("player2Note")}
            </>
          ),
        },
        { label: t("player3"), hand: "5-2", note: t("player3Note") },
      ]}
    />
  );
}

export const SingleRow: Story = { render: () => <OneRow /> };

export const ThreePlayers: Story = { render: () => <ThreeRows /> };
