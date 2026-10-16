import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// What may import what is checked by dependency-cruiser (.dependency-cruiser.cjs).
// ESLint checks what an import rule cannot see: globals and properties.

const noMathRandom = {
  object: "Math",
  property: "random",
  message: "Randomness is injected: dice arrive in the action (ENG-2).",
};

// ENG-1. globalThis, window and self are listed so globalThis.setTimeout(...)
// cannot get round the list.
const engineGlobals = [
  "window",
  "self",
  "globalThis",
  "document",
  "navigator",
  "location",
  "localStorage",
  "sessionStorage",
  "fetch",
  "crypto",
  "performance",
  "Date",
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "queueMicrotask",
].map((name) => ({
  name,
  message: "Not available in the engine (ENG-1): it is pure and isomorphic.",
}));

// SES-2. Pacing is the session's job (local/), not a component's.
const uiGlobals = [
  "setTimeout",
  "setInterval",
  "clearTimeout",
  "clearInterval",
  "globalThis",
  "window",
].map((name) => ({
  name,
  message: "Pacing is the session's job (local/), not a component's.",
}));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "storybook-static/**",
  ]),
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/link",
              message:
                "Import Link from @/i18n/navigation so locale pathnames are applied.",
            },
            {
              name: "next/navigation",
              importNames: [
                "redirect",
                "permanentRedirect",
                "usePathname",
                "useRouter",
              ],
              message:
                "Import redirect, usePathname and useRouter from @/i18n/navigation.",
            },
          ],
        },
      ],
    },
  },
  {
    name: "game/engine-purity",
    files: [
      "src/modules/game/engine/**/*.ts",
      "src/modules/game/testing/**/*.ts",
    ],
    rules: {
      "no-restricted-globals": ["error", ...engineGlobals],
      "no-restricted-properties": ["error", noMathRandom],
    },
  },
  {
    name: "game/ui-no-pacing",
    files: ["src/modules/game/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": ["error", ...uiGlobals],
      "no-restricted-properties": ["error", noMathRandom],
    },
  },
  eslintConfigPrettier,
]);

export default eslintConfig;
