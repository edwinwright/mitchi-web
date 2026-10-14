import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Wordmark } from "@/components/wordmark";
import { withInverseSurface } from "../../.storybook/decorators";

const meta = {
  title: "Foundations/Wordmark",
  component: Wordmark,
} satisfies Meta<typeof Wordmark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Inverse: Story = {
  args: { inverse: true },
  decorators: [withInverseSurface],
};

export const Small: Story = { args: { size: 20 } };

export const Large: Story = { args: { size: 64 } };
