# Tech stack

What this project uses, and what it deliberately does not. No versions: those live in `package.json` and the lockfile.

**No new runtime dependency without a line in this file.** If something looks like it needs one, stop and ask. Most of what a package would do here is a component, a helper, or twenty lines.

## Rendering and routing

Next.js App Router, statically generated, with a request-time proxy in front for locale detection and rewrites.

Not a static export. It removes the routing layer this project exists to practise, and the reasons are recorded in the hosting decision.

## Language and types

TypeScript, strict. Data that drives rendering lives in typed modules under `src/data`, not in message files.

## Internationalisation

next-intl, with the routing, navigation and request configuration under `src/i18n`. Message structure is governed by `docs/architecture/i18n-conventions.md`.

Not i18next, Paraglide or Intlayer. Not a second i18n or content library alongside it.

## Styling

Tailwind, with theme tokens declared in `globals.css` via `@theme`. Long-form copy uses the Tailwind Typography plugin (`prose` on `Prose`). Class merging through a local `cn()` helper built on `clsx` and `tailwind-merge`. Fonts via `next/font google`, self-hosted at build.

Not CSS-in-JS, not Sass, not a CSS framework alongside Tailwind. Not a CDN `<link>` for fonts, and not a font package.

## Components

Semantic HTML, written here. Tables are tables, definition lists are `dl`, supplementary blocks are `aside`.

The first interactive feature, the practice game, landed in WO-0016 with plain buttons; the shadcn/ui position below is unchanged.

No UI kit. shadcn/ui was considered and rejected: the site is a dozen semantic elements and never reaches the dialogs, popovers and forms where the kit earns its keep. It stays a live option if an interactive feature ever lands, because it is copy-paste source rather than a framework. No Radix, no headless component library, no icon package.

## Content

Copy lives in `messages/<locale>.json`. Long-form content in Markdown or MDX was considered for `/rules` and rejected: it splits one page's copy across two homes and loses the compile-time completeness check. If a genuinely long-form route ever appears, revisit it then, for that route.

## Graphics

Inline SVG, written here. No icon or illustration package for a site whose only graphic is a pair of dice.

`public/` is organised by purpose, not file type: `brand/` for logo marks and favicons, `img/` for in-page photography, `meta/` for assets that exist only for `<head>`/metadata and are never rendered in a page.

## Testing

Vitest, in the node environment, for the game engine, the local store and pure UI helpers. Testing Library and jsdom are for the `useLocalSession` hook and the focus handoff only, and are installed with the slice that writes those tests. Dev dependencies only. `@types/node` follows the Node major in use (24).

Not Jest, Playwright or Cypress. The existing checks stay: the build route table, a keyboard pass, and `./scripts/smoke.sh` (request-time locale routing and HTML canonical / hreflang).

## Game engine

Pure TypeScript in `src/modules/game/engine`. No state library, no new runtime dependency, and nothing written to the device, so the position under Analytics holds. Design and rules of the module are in `docs/architecture/game-engine.md`.

## CI

GitHub Actions on pull requests: lint, import rules, types, tests, message parity and build. Vercel deploys; it does not test.

## Code layout

Feature code lives in `src/modules/<name>`, entered through the module's index. See `docs/architecture/modules.md`.

dependency-cruiser checks what may import what, as a dev dependency. Chosen over `no-restricted-imports` because its rules are independent `from`/`to` pairs: ESLint flat config replaces a rule's options block by block, so a later block can silently drop an earlier ban. Not `eslint-plugin-boundaries`.

## Discovery

App Router `src/app/sitemap.ts` and `src/app/robots.ts`. No sitemap or robots package. Absolute URLs use `SITE_ORIGIN` from `src/lib/config.ts` (same value as `metadataBase`). Not `VERCEL_URL`.

Open Graph and Twitter card images are a single static file, `public/meta/og-default.jpg`, wired into `openGraph.images`/`twitter.images` in `pageMetadata()` (`src/i18n/metadata.ts`). One shared image for every route and locale; no dynamic `opengraph-image.tsx`/`ImageResponse` route, no dependency, no per-page image yet.

## Component workshop

Storybook (`storybook`), with the `@storybook/nextjs-vite` framework and `vite`, which the framework needs as a peer. Dev dependencies only: nothing here reaches the site bundle. No addons. Setup, conventions and deployment are in `docs/architecture/storybook.md`.

Not Chromatic or any visual regression service, not interaction or accessibility test runners, and not `addon-docs` (MDX and autodocs pages). Not `npx storybook init`, which adds those. Not `@tailwindcss/vite`: Tailwind already runs through PostCSS and works unchanged.

## Analytics

Vercel Web Analytics, via `@vercel/analytics`, mounted once in the locale layout. It sets no cookie, reads and writes nothing on the device, and identifies visitors by a hash of the incoming request that is discarded after 24 hours. It therefore needs no consent banner, and the site must stay that way: anything that later writes to the device changes that answer.

Google Analytics was considered and rejected. Consent under PECR reg 6 is triggered by touching the device, not by what is measured, so page views and country are collectable without a banner. GA4 cannot do it without one and still be useful: cookieless pings give unreliable user and session counts, and behavioural modelling needs traffic thresholds this site will not reach. The alternative, a real consent banner, is a feature in its own right and costs banner and privacy copy in every locale.

No environment variables and no dev/prod split. Endpoints come from build-time config injected by Vercel, and the package detects `NODE_ENV`, so local development logs to the console and transmits nothing.

No custom events: they are Pro-only, and the brief is page views.

## Tooling and deployment

npm, with the lockfile committed. ESLint via `eslint-config-next`. Prettier formats the repo; `eslint-config-prettier` is last in the ESLint flat config so lint rules do not fight the formatter. Both are dev dependencies. Vercel builds and deploys from `main`; checks run in CI (see above), not on Vercel. Storybook is a second Vercel project built from the same repository, at `storybook.mitchidice.com`; it is still Vercel deploying from `main`, not a pipeline.
