import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  MitchiDie,
  type DieFace,
  type DieVariant,
} from "@/components/mitchi-die";
import { withInverseSurface } from "../../.storybook/decorators";

const meta = {
  title: "Foundations/MitchiDie",
  component: MitchiDie,
  args: { face: 1 },
} satisfies Meta<typeof MitchiDie>;

export default meta;
type Story = StoryObj<typeof meta>;

const FACES: DieFace[] = [1, 2, 3, 4, 5, 6];
const VARIANTS: DieVariant[] = ["flat", "block", "offset"];

function FaceGrid({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      {VARIANTS.map((variant) => (
        <div key={variant} className="flex items-start gap-4">
          {FACES.map((face) => (
            <MitchiDie
              key={face}
              face={face}
              variant={variant}
              inverse={inverse}
              size={64}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export const Default: Story = {};

export const Faces: Story = {
  render: () => <FaceGrid />,
};

export const InverseFaces: Story = {
  render: () => <FaceGrid inverse />,
  decorators: [withInverseSurface],
};
