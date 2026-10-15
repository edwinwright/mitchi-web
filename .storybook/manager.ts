import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";
// Relative: the manager bundle is esbuild and does not resolve the `@/` alias.
import { SITE_ORIGIN } from "../src/lib/config";

// Capped at 150×100. The wordmark still reads; the full lockup shrinks the dice.
addons.setConfig({
  theme: create({
    base: "light",
    brandTitle: "Mitchi",
    brandUrl: SITE_ORIGIN,
    brandImage: "/brand/mitchi-wordmark.svg",
    brandTarget: "_self",
  }),
});
