import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { LoggedEvent } from "../engine";
import {
  notStarted,
  secondTieBreak,
  simulateGame,
  viewerRolledKeepable,
} from "../testing";
import { CommentaryPanel } from "./commentary-panel";
import { commentaryRows } from "./commentary-rows";

const VIEWER = 0;

/** A whole bot game's events, enough to need scrolling. */
function longLog(): LoggedEvent[] {
  const log: LoggedEvent[] = [];
  simulateGame(3, {
    onStep: ({ result }) => {
      if (result.ok) {
        for (const event of result.events) {
          // One beat per event: the rows do not read the beat stamp.
          log.push({ ...event, seq: log.length + 1, beat: log.length + 1 });
        }
      }
    },
  });
  return log;
}

function Showcase({ events }: { events: readonly LoggedEvent[] }) {
  return (
    <div className="max-w-xl">
      <CommentaryPanel
        rows={commentaryRows(events, VIEWER)}
        viewerSeat={VIEWER}
      />
    </div>
  );
}

const meta = {
  title: "Practice game/Commentary panel",
  component: Showcase,
  args: { events: viewerRolledKeepable.events },
} satisfies Meta<typeof Showcase>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Below 1280px: collapsed to the latest row; press the heading to open. */
export const Default: Story = {};
export const Empty: Story = { args: { events: notStarted.events } };
export const SecondTieBreak: Story = {
  args: { events: secondTieBreak.events },
};
// Focus the log and scroll up to read: nothing should jump.
export const ManyRows: Story = { args: { events: longLog() } };

/** From 1280px: always open, no heading button. */
export const Desktop: Story = {
  args: { events: longLog() },
  globals: { viewport: { value: "desktop", isRotated: false } },
};
