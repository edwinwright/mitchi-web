import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SeatLabel } from "./seat-label";

const meta = {
  title: "Practice game/SeatLabel",
  component: SeatLabel,
  args: { seat: 1, viewerSeat: 0 },
} satisfies Meta<typeof SeatLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Other: Story = {};

export const Viewer: Story = { args: { seat: 0, viewerSeat: 0 } };

// The viewer is not always seat 0: seat 2 reads "You" and seat 0 reads as a player.
export const ViewerInSeatTwo: Story = {
  render: (args) => (
    <ul>
      {[0, 1, 2, 3].map((seat) => (
        <li key={seat}>
          <SeatLabel {...args} seat={seat} viewerSeat={2} />
        </li>
      ))}
    </ul>
  ),
};
