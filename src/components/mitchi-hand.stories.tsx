import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useTranslations } from "next-intl";
import { MitchiHand } from "@/components/mitchi-hand";
import { withInverseSurface } from "../../.storybook/decorators";

const meta = {
  title: "Foundations/MitchiHand",
  component: MitchiHand,
  args: { high: 2, low: 1 },
} satisfies Meta<typeof MitchiHand>;

export default meta;
type Story = StoryObj<typeof meta>;

// The hand's name is a message keyed by hand id, never composed from the dice.
function Labelled({
  hand,
  ...props
}: Parameters<typeof MitchiHand>[0] & { hand: "2-1" | "6-6" }) {
  const t = useTranslations("hands");
  return <MitchiHand {...props} label={t(hand)} />;
}

export const Mitchi: Story = {
  render: (args) => <Labelled {...args} hand="2-1" />,
};

export const Double: Story = {
  args: { high: 6, low: 6 },
  render: (args) => <Labelled {...args} hand="6-6" />,
};

export const Inverse: Story = {
  args: { inverse: true },
  render: (args) => <Labelled {...args} hand="2-1" />,
  decorators: [withInverseSurface],
};
