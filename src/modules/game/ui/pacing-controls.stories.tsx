import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { Pacing } from "../engine";
import { PacingControls } from "./pacing-controls";

const noop = () => {};

const running: Pacing = {
  paused: false,
  speed: "normal",
  canStep: false,
  pause: noop,
  resume: noop,
  step: noop,
  setSpeed: noop,
};

const meta = {
  title: "Practice game/Pacing controls",
  component: PacingControls,
  args: { pacing: running },
} satisfies Meta<typeof PacingControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// Paused with the next move a bot's: Step is available, the label reads Resume.
export const Paused: Story = {
  args: { pacing: { ...running, paused: true, canStep: true, speed: "fast" } },
};

// Paused but nothing to step to (the viewer's turn): Step is unavailable.
export const PausedNoStep: Story = {
  args: { pacing: { ...running, paused: true } },
};
