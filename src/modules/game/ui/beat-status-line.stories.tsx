import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  beatBotKeepSwap,
  beatBotRollToStart,
  beatGameStart,
  beatNoRollsLeft,
  beatRollOffTie,
  beatRollOffWinner,
  beatStopMitchi,
  beatTieBreakOpens,
  beatTieBreakRolled,
  beatViewerRollToStart,
  beatViewerRolls,
  beatViewerStops,
  botKept,
  botMidTurn,
  fixtureSession,
  gameOverDraw,
  notStarted,
  roundSummary,
  starterLimitSet,
  viewerKeptOne,
  viewerToRoll,
  type Fixture,
} from "../testing";
import { BeatAnnouncer, BeatStatus } from "./beat-status-line";
import { sliceSession } from "./board-slices";

function Showcase({
  fixture,
  announcer = false,
}: {
  fixture: Fixture;
  /** Show what the hidden live region holds, outlined. */
  announcer?: boolean;
}) {
  const session = fixtureSession(fixture);
  const { status } = sliceSession(session);
  const { viewerSeat } = session.view;
  return (
    <div className="max-w-[420px] rounded-xl bg-stone-100 pb-3">
      {announcer ? (
        <div className="p-3 outline outline-dashed outline-stone-400 [&_[role=status]]:not-sr-only">
          <BeatAnnouncer status={status} viewerSeat={viewerSeat} />
        </div>
      ) : (
        <BeatStatus status={status} viewerSeat={viewerSeat} />
      )}
    </div>
  );
}

const meta = {
  title: "Practice game/Status line",
  component: Showcase,
  args: { fixture: notStarted },
} satisfies Meta<typeof Showcase>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Before Start: the line keeps its space, empty. */
export const NothingYet: Story = {};
export const Intro: Story = { args: { fixture: beatGameStart } };
export const ViewerRollsToStart: Story = {
  args: { fixture: beatViewerRollToStart },
};
export const BotRollsToStart: Story = { args: { fixture: beatBotRollToStart } };
export const Tied: Story = { args: { fixture: beatRollOffTie } };
export const RoundStart: Story = { args: { fixture: beatRollOffWinner } };
export const HandoverToViewer: Story = { args: { fixture: viewerToRoll } };
export const HandoverToBot: Story = { args: { fixture: starterLimitSet } };
export const ViewerRolls: Story = { args: { fixture: beatViewerRolls } };
export const BotRolls: Story = { args: { fixture: botMidTurn } };
export const BotKeeps: Story = { args: { fixture: botKept } };
export const BotKeepSwap: Story = { args: { fixture: beatBotKeepSwap } };
export const ViewerStopsWithLimit: Story = {
  args: { fixture: beatViewerStops },
};
export const StopWithMitchi: Story = { args: { fixture: beatStopMitchi } };
export const NoRollsLeft: Story = { args: { fixture: beatNoRollsLeft } };
export const TieBreakOpens: Story = { args: { fixture: beatTieBreakOpens } };
export const TieBreakRolled: Story = { args: { fixture: beatTieBreakRolled } };
export const PotTaken: Story = { args: { fixture: roundSummary } };
export const GameOverDraw: Story = { args: { fixture: gameOverDraw } };
/** The viewer's keep is silent: the line still reads "You roll". */
export const ViewerKeepIsSilent: Story = { args: { fixture: viewerKeptOne } };

// What the announcer holds, made visible.
export const AnnouncerHandover: Story = {
  args: { fixture: starterLimitSet, announcer: true },
};
export const AnnouncerStopWithRiders: Story = {
  args: { fixture: beatStopMitchi, announcer: true },
};
export const AnnouncerTieBreakOpens: Story = {
  args: { fixture: beatTieBreakOpens, announcer: true },
};
