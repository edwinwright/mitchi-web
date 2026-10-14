import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
  }
]);

export default eslintConfig;
