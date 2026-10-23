import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  staticDirs: ["../public"],
  addons: ["@storybook/addon-a11y"],
  core: { disableTelemetry: true },
};

export default config;
