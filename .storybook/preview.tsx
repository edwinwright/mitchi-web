import type { Preview } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { MINIMAL_VIEWPORTS } from "storybook/viewport";
import { archivo, jetbrainsMono, lato, sourceSerif } from "@/app/fonts";
import "@/app/globals.css";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import en from "../messages/en.json";
import es from "../messages/es.json";
import pl from "../messages/pl.json";

type Locale = (typeof routing.locales)[number];

// Adding a locale to `routing` fails tsc here until its messages are imported.
const messages = { en, es, pl } satisfies Record<Locale, unknown>;

const preview: Preview = {
  initialGlobals: { locale: routing.defaultLocale },
  globalTypes: {
    locale: {
      description: "Locale",
      toolbar: {
        title: "Locale",
        icon: "globe",
        dynamicTitle: true,
        items: routing.locales.map((locale) => ({
          value: locale,
          title: new Intl.DisplayNames([locale], { type: "language" }).of(
            locale,
          ),
        })),
      },
    },
  },
  decorators: [
    (Story, { globals }) => {
      const locale = globals.locale as Locale;
      return (
        // The site puts the font variable classes on <html>. Here they sit on
        // a wrapper inside <body>, so `font-sans` goes on the wrapper too:
        // body's `font-family: var(--font-sans)` would resolve at :root and
        // miss them.
        <div
          lang={locale}
          className={cn(
            "font-sans",
            archivo.variable,
            sourceSerif.variable,
            jetbrainsMono.variable,
            lato.variable,
          )}
        >
          <NextIntlClientProvider locale={locale} messages={messages[locale]}>
            <Story />
          </NextIntlClientProvider>
        </div>
      );
    },
  ],
  parameters: {
    nextjs: { appDirectory: true },
    // Groups run from primitives up to pages; stories inside a group are
    // alphabetical. Only the groups are ordered, by name.
    // A new group must be added here, or it sorts after the listed ones.
    options: {
      storySort: {
        method: "alphabetical",
        order: [
          "Foundations",
          "Page blocks",
          "Rules content",
          "Site chrome",
          "Home",
        ],
      },
    },
    viewport: { options: MINIMAL_VIEWPORTS },
  },
};

export default preview;
