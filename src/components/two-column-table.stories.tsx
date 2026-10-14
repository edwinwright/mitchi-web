import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useTranslations } from "next-intl";
import { TwoColumnTable } from "@/components/two-column-table";

const meta = {
  title: "Layout/TwoColumnTable",
  component: TwoColumnTable,
  args: { leftHeader: "", rightHeader: "", rows: [] },
} satisfies Meta<typeof TwoColumnTable>;

export default meta;
type Story = StoryObj<typeof meta>;

// The pot values are data, as in ScoringTable.
const ROWS = [
  { count: "none", points: 1 },
  { count: "one", points: 2 },
  { count: "two", points: 4 },
  { count: "three", points: 6 },
] as const;

function Table() {
  const t = useTranslations("potTable");
  return (
    <TwoColumnTable
      leftHeader={t("mitchisHeader")}
      rightHeader={t("pointsHeader")}
      rows={ROWS.map((row) => ({
        key: row.count,
        left: t(row.count),
        right: row.points,
      }))}
    />
  );
}

export const Default: Story = { render: () => <Table /> };
