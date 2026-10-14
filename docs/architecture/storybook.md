# Storybook

A workshop for the UI components: look at one in isolation, in each locale, at narrow and wide widths. It is a development and portfolio surface, not a product feature. It is deployed separately at `storybook.mitchidice.com` and never changes what `mitchi-web` builds. Introduced in WO-0015.

## Running it

```bash
npm run storybook          # dev server on http://localhost:6006
npm run build-storybook    # static build into storybook-static/ (gitignored)
```

If a story fails to load with "Failed to fetch dynamically imported module", restart the dev server. A long-running one can hold stale dependency state after a story first uses something new, such as `next/image`.

## What is configured

Everything lives in `.storybook/`.

| File | What it does |
|---|---|
| `main.ts` | Framework `@storybook/nextjs-vite`, stories from `src/**/*.stories.@(ts\|tsx)`, `public/` as static files, telemetry off, no addons. |
| `preview.tsx` | The global decorator, the locale toolbar, the viewport list and the Next.js navigation flag. |
| `decorators.tsx` | Shared decorators for inverse stories. |
| `preview-head.html`, `manager-head.html` | The `noindex` meta tag. |

**Sidebar.** Stories are grouped by role, from primitives up to pages: Foundations (type and brand), Page blocks, Rules content, Site chrome, Home. The group order is `storySort` in `preview.tsx`, and stories inside a group are alphabetical. A story's title is `Group/ComponentName`. A new group must be added to the `order` list, or it sorts after the listed ones.

**Provider and locale toolbar.** Every story is wrapped in `NextIntlClientProvider`, given the messages for the locale chosen in the toolbar. The toolbar has one entry per `routing.locales`, titled by `Intl.DisplayNames`. The messages are static imports in a map typed `satisfies Record<Locale, unknown>`, so adding a locale to `routing` fails `tsc` until its file is imported in `preview.tsx`.

**Viewports.** Storybook's built-in `MINIMAL_VIEWPORTS`: Small mobile (320), Large mobile (414), Tablet (834), Desktop (1280). No custom presets. 320 is the strictest width for overflow checks. A story picks one with `globals: { viewport: { value: "mobile1", isRotated: false } }`.

**Fonts.** The site puts the four font `variable` classes on `<html>`. Storybook has no `<html>` of its own, so the decorator puts them on a wrapper div, together with `font-sans`. `globals.css` sets `body { font-family: var(--font-sans) }`, and a custom property resolves where it is declared, so without `font-sans` on the wrapper, text would inherit the fallback stack. The root 404 solves the same problem the same way. The wrapper also carries `lang` for the current locale.

In the Vite framework `next/font/google` is not self-hosted: the font files are fetched from Google's CDN at runtime. That applies to Storybook only. The site's fonts are still self-hosted at build, as `tech-stack.md` says.

## Navigation

`parameters.nextjs.appDirectory: true` is set globally. Stories that read the path set `parameters.nextjs.navigation.pathname`.

Stories use the real `createNavigation(routing)` from `@/i18n/navigation`. Do not alias or stub it. Storybook's mock of `next/navigation` and `next/link` reaches next-intl, so `Link` emits localised paths (`/es/reglas`, `/pl/zasady`) and `usePathname` works.

`pathname` is a static story parameter, so it cannot follow the locale toolbar. Stories use the English external path, `/rules`. In `es` and `pl`, next-intl finds no match for it and returns the path unchanged, which is the internal path. Current-page state and the language switcher's hrefs are therefore correct in every locale, and no per-locale story is needed.

**Known limitation.** Storybook's `Link` mock joins an object href's `hash` without adding the `#`. A `<term>` link, whose href is `{ pathname: "/rules", hash: "vocabulary" }`, therefore shows as `/es/reglasvocabulary` in the DOM. The real site renders `/es/reglas#vocabulary`. Only the displayed `href` is affected: the mock swallows the click either way. Check the pathname part of such links, not the fragment.

## Writing a story

One `*.stories.tsx` beside each component, with `meta` typed `satisfies Meta<typeof Component>`. A new component gets a story.

- **Copy comes from real message keys.** A story reads every visible string through `useTranslations`, never a hardcoded string. A key rename then fails `tsc` in the story that reads it. If a story seems to need a string that does not exist, ask: do not add a key to make a story work.
- **The toolbar switches locale, so there are no per-locale stories.** The only `Spanish` and `Polish` stories are on `LanguageSwitcher`, where they prove `globals: { locale }` works.
- **Hooks go in a named component.** A `render` property is not a component, so call `useTranslations` inside a function component the `render` returns.
- **Never import `next/link` or `next/navigation`.** Lint enforces it.
- **Hands are data, hand names are messages.** Pass an explicit hand id to `t()`. Do not build a key from two dice.
- **Inverse variants sit on a background-only surface.** Use `withInverseSurface` (the foreground colour) or `withRedSurface` (the hero's ground) from `.storybook/decorators.tsx`. A surface sets background and padding only, never a text colour: colour is inherited, so a surface that sets one hides whether the component sets its own. A component should carry a sensible default text and background colour where it needs one to look right (the language switcher does), rather than rely on its parent.
- **Full-bleed components** (header, footer, home sections) use `parameters: { layout: "fullscreen" }`.

Stories sit in the root `tsconfig.json`, so `tsc` and `next build` type-check them.

## What it does not cover

No Chromatic, visual regression, interaction tests or accessibility test runner. No addons, no MDX or autodocs pages (they need `addon-docs`), and no design token documentation. `npx storybook init` is not used: it adds docs, a11y, Vitest and Chromatic addons. Stories are for looking at components. The checks that gate the site stay as they are: `tsc`, lint, the build route table and `scripts/smoke.sh`.

`dice-hero-overlay` is unused and has no story. `container`, `heading`, `section-heading`, `prose` and `rule-body` are thin wrappers, covered by `typography.stories.tsx` and by the stories of the components that use them.

## Keeping it out of search

Both HTML shells (`index.html` and `iframe.html`) carry `<meta name="robots" content="noindex, nofollow">`, from `preview-head.html` and `manager-head.html`.

Not a `Disallow` in `robots.txt`: a crawler that is disallowed from a page never reads its `noindex`, and the URL can still be indexed from links. Not `vercel.json`: it would apply to the `mitchi-web` project too, since both projects build from the same repo.

## Deployment

A second Vercel project, `mitchi-storybook`, imports this same repository. The site's project is unaffected.

| Setting | Value |
|---|---|
| Production branch | `main` |
| Framework preset | Storybook if offered, otherwise Other |
| Root directory | repository root |
| Install command | default (`npm install`) |
| Build command | `npm run build-storybook` (not `npm run build`, which also runs the `prebuild` marker guard) |
| Output directory | `storybook-static` |
| Environment variables | none |
| Node version | 24, or at least what `storybook` requires |
| Domain | `storybook.mitchidice.com` |

**Ignored Build Step** (Settings, Git). Exit 0 skips the build, exit 1 builds. The paths are everything Storybook reads, including `next.config.ts`, because the Vite framework loads it:

```bash
git diff --quiet HEAD^ HEAD -- .storybook src messages public package.json package-lock.json next.config.ts postcss.config.mjs tsconfig.json global.d.ts
```

It compares only the last commit, so a push of several commits at once can skip a build it needed. Squash-merged pull requests, the repo's current pattern, are safe.

**Optional reverse rule on `mitchi-web`**, so a story-only commit does not redeploy the site:

```bash
git diff --quiet HEAD^ HEAD -- . ':(exclude).storybook' ':(exclude,glob)**/*.stories.tsx'
```

The same limit applies, and a wrong skip on the production site costs more than a spare build, so it is optional.
