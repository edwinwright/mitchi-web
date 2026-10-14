import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useTranslations } from "next-intl";
import { CtaLink } from "@/components/cta-link";
import { withRedSurface } from "../../.storybook/decorators";

const meta = {
  title: "Page blocks/CtaLink",
  component: CtaLink,
  args: { href: "/rules", children: "" },
} satisfies Meta<typeof CtaLink>;

export default meta;
type Story = StoryObj<typeof meta>;

type LabelKey = "rules" | "reference";

function Cta({
  label = "rules",
  ...props
}: Omit<Parameters<typeof CtaLink>[0], "children" | "href"> & {
  label?: LabelKey;
}) {
  const t = useTranslations("home.links");
  return (
    <CtaLink href={`/${label}`} {...props}>
      {t(label)}
    </CtaLink>
  );
}

export const Primary: Story = { render: () => <Cta variant="primary" /> };

export const Secondary: Story = {
  render: () => <Cta variant="secondary" label="reference" />,
};

// The hero's ground is brand red: the inverse primary's offset shadow is the
// foreground colour, which would vanish on a foreground surface.
export const Inverse: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Cta variant="primary" inverse />
      <Cta variant="secondary" inverse label="reference" />
    </div>
  ),
  decorators: [withRedSurface],
};

// The longest sentence-length string available, to see the button wrap.
function LongLabel() {
  const t = useTranslations("nextPage");
  return (
    <div className="max-w-xs">
      <CtaLink href="/about">{t("about.summary")}</CtaLink>
    </div>
  );
}

export const LongLabelWraps: Story = { render: () => <LongLabel /> };
