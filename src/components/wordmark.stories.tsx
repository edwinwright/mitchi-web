import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Wordmark } from "@/components/wordmark";

const meta = {
  title: "Brand/Wordmark",
  component: Wordmark,
} satisfies Meta<typeof Wordmark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Inverse: Story = {
  args: { inverse: true },
  decorators: [
    (Story) => (
      <div className="bg-red-600 p-6">
        <Story />
      </div>
    ),
  ],
};

export const Small: Story = { args: { size: 20 } };

export const Large: Story = { args: { size: 64 } };
