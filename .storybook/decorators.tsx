import type { Decorator } from "@storybook/nextjs-vite";

/**
 * Dark grounds for inverse variants. Background and padding only: never set a
 * text colour here. It is inherited, and would hide a component that should
 * carry its own.
 */
export const withInverseSurface: Decorator = (Story) => (
  <div className="bg-foreground p-6">
    <Story />
  </div>
);

/** For components whose real inverse ground is the brand red, as in the hero. */
export const withRedSurface: Decorator = (Story) => (
  <div className="bg-red-600 p-6">
    <Story />
  </div>
);
