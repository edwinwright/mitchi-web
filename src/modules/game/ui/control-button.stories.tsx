import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useTranslations } from "next-intl";
import { ControlButton } from "./control-button";

const meta = {
  title: "Practice game/ControlButton",
  component: ControlButton,
  args: { children: "", onPress: () => {} },
} satisfies Meta<typeof ControlButton>;

export default meta;
type Story = StoryObj<typeof meta>;

type Label = "roll" | "stop" | "keep";

function Labelled({
  label,
  ...props
}: Omit<Parameters<typeof ControlButton>[0], "children"> & { label: Label }) {
  const t = useTranslations("play.controls");
  return <ControlButton {...props}>{t(label)}</ControlButton>;
}

export const Primary: Story = {
  render: (args) => <Labelled {...args} label="roll" />,
};

export const Secondary: Story = {
  args: { variant: "secondary" },
  render: (args) => <Labelled {...args} label="stop" />,
};

// Tab to it and press Enter or Space: nothing happens and focus stays.
export const Unavailable: Story = {
  args: { unavailable: true },
  render: (args) => <Labelled {...args} label="roll" />,
};

export const Busy: Story = {
  args: { unavailable: true, busy: true },
  render: (args) => <Labelled {...args} label="roll" />,
};

export const Toggle: Story = {
  args: { variant: "secondary" },
  render: (args) => (
    <div className="flex gap-4">
      <Labelled {...args} label="keep" pressed={false} />
      <Labelled {...args} label="keep" pressed />
    </div>
  ),
};
