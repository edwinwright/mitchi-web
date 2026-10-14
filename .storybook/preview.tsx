import type { Preview } from "@storybook/nextjs-vite";
import { MINIMAL_VIEWPORTS } from "storybook/viewport";
import { archivo, jetbrainsMono, lato, sourceSerif } from "@/app/fonts";
import "@/app/globals.css";
import { cn } from "@/lib/utils";

const preview: Preview = {
  decorators: [
    // The site puts the font variable classes on <html>. Here they sit on a
    // wrapper inside <body>, so `font-sans` goes on the wrapper too: body's
    // `font-family: var(--font-sans)` would resolve at :root and miss them.
    (Story) => (
      <div
        className={cn(
          "font-sans",
          archivo.variable,
          sourceSerif.variable,
          jetbrainsMono.variable,
          lato.variable,
        )}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    viewport: { options: MINIMAL_VIEWPORTS },
  },
};

export default preview;
