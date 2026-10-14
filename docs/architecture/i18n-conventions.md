# i18n conventions

How message content is structured and authored. The routing decisions (`localePrefix`, `pathnames`, the proxy) live in `src/i18n/routing.ts` and the hosting decision record.

## Where things live

| Thing | Home |
|---|---|
| Message content | `messages/<locale>.json`, one file per locale, dynamically imported per locale in `src/i18n/request.ts` |
| Hand data, group order | `src/data/hands.ts` |
| Section anchor IDs | The components that render the sections |
| Routing and slugs | `src/i18n/routing.ts` |
| Rich text tag map | `src/i18n/rich-text.tsx` (`tags`) |
| Page metadata | `src/i18n/metadata.ts` (`pageMetadata`, `PAGES`) — titles and descriptions from `meta.*` |
| Production origin | `src/lib/config.ts` (`SITE_ORIGIN`) — `metadataBase`, sitemap, robots |
| Sitemap and robots | `src/app/sitemap.ts`, `src/app/robots.ts` (App Router built-ins; outside `[locale]`) |

Namespaces, and no fourteenth without a reason: `meta`, `site`, `nav`, `nextPage`, `home`, `rules`, `reference`, `about`, `notFound`, `handGroups`, `hands`, `potTable`, `vocabulary`.

**`meta.*` is titles and descriptions only.** Wired through `generateMetadata` via `pageMetadata`. Each real page has `meta.<page>.title` and `meta.<page>.description` in every locale. Do not add message keys without asking; see Changing copy. Canonicals and hreflang are built with `getPathname` from the same `PAGES` map; never list `/en/...` as a 200 URL. The Open Graph/Twitter share image is locale-independent, so it is not a message key: its path and alt text are a constant in `src/i18n/metadata.ts`, not `messages/<locale>.json`.

## Key rules

**One key per independently translatable unit.** A heading, a paragraph, a list item, a button label. Named for its job, `rules.round.rollLimit`, not `rules.round.p3`. Never one key per sentence: a sentence is not a translatable unit, and splitting it into prefix/suffix fragments stops translators from reordering. Never a whole section in one string: headings, paragraphs and lists are document structure, and they belong in the component.

**No arrays.** `t()` throws on an array value and `t.raw()` gives up type safety. Use one key per item.

**Keys name content, not layout.** `home.keyIdea`, not `home.twist`; `rules.setup.whoStarts`, not `rules.setup.step2`. Numbered keys only where the items have no individual meaning. Keys that stay generic: `title`, `heading`, `intro`, `summary`, `label`, `example`. Numbers that a table renders (pot values, tie-break operators) are data in the component, not messages.

**No markup inside strings.** Translators should never have to preserve asterisks, HTML, attributes or URLs. Inline emphasis and in-text actions use next-intl rich text tags (`t.rich`), listed below. Mapped in one place, `tags` in `src/i18n/rich-text.tsx`. No component maps its own tags. Do not use `defaultTranslationValues`, it is deprecated.

**Fixed values are flat strings; only runtime values are ICU arguments.** Two questions, in order:

1. Does the value change at runtime? No: write the whole string. Stop here. The `/rules` example strips broke this rule until WO-0014: `{hand} in {count, select, …}`, `needs {hand} or better`, `Player {n}`, `Tie-break {n}` were templates whose every value was fixed in the component. English and Spanish survived because their nouns do not inflect; Polish exposed it, since the host sentence dictates the case of the slot and the slot can supply only one form. Each template is now one whole string per note (`rules.round.everyoneElse.example1Strip.player3Note`), and a translator inflects in place.
2. If it does change at runtime, is the value grammar-opaque: a number, an identifier, an indeclinable name? Yes: an ICU argument, with `plural` or `select` where the language needs it. No, it is a translated phrase: redesign the string, because the host sentence will demand a case the value cannot supply.

At present no message file contains an ICU argument. `i18n:check` still compares parameters across locales for the day one is needed.

**Strip keys name content, not layout.** `rules.round.rollLimit.exampleStrip` and `rules.round.everyoneElse.example1Strip` sit beside the prose example they decorate, and each note inside is a complete phrase (`player1Rolled`, `player1Limit`, `player2Note`). Separator glyphs (`→`, `·`) are rendered by the component, never part of the string.

**Hands are data, names are messages.** The visible name of a hand comes from ``t(`hands.${hand.id}`)``. Never compose a hand name from two number words at runtime: "six-five" is not "six" plus "five" in Polish or Japanese, and "double-six" is not "six-six" in any language. Twenty-one whole strings per locale is the cheap option, not the expensive one. Group names and descriptions work the same way, under `handGroups.<group>.name` and `.description`.

**Anchor IDs stay English in every locale.** `#hands`, `#round`, `#scoring`, `#tie-breaks`, `#winning`, `#vocabulary`. Visible headings translate, IDs do not. A URL fragment is never sent to the server, so no routing layer can rewrite it the way `pathnames` rewrites a slug. Localised IDs would break every shared link on a locale switch and add a per-locale fragment map to the language switcher.

## Changing copy

Two locale files, and a check that catches a missing key but not a stale translation. A wording change that lands in `en.json` and stops there ships an English sentence on a Spanish page, and nothing fails: the key is present, the types pass, the build is green. The order below is what prevents it.

**1. Glossary first.** If the change needs a term the site does not have, or moves running copy away from `docs/domain/glossary.md`, update the glossary before the message files. A synonym that reads better in one sentence is a new word in five languages.

**2. `messages/en.json` is the translation brief.** English changes first, and it is what every other locale is translated from. Nothing else is the source.

**3. Every other locale file in the same change, marked until translated.** Add the same keys, in the same commit. A changed or new value goes in as `[ES] ` + the English until the translation is written and signed off; a value whose meaning did not change keeps its existing translation. Translation is its own pass, at the end of the work item. Markers may sit in the working tree and on preview deploys. They must never reach production: `npm run i18n:check` lists them as warnings, and `prebuild` runs `node scripts/check-messages.mjs --no-markers` when `VERCEL_ENV` is `production`, which fails the build on any marker.

**4. Rich text tags and ICU parameter names survive untouched.** Word order around them may change; `<term>`, `<about>` and `{a}` do not. Renaming or dropping one fails at render, on a page nobody is looking at.

**5. Run `npm run i18n:check` before committing.** Key parity, tags and parameters, every locale against English.

**6. Do not paraphrase in code, and do not add keys unasked.** A string is changed in the message files or not at all. New keys come from the current work item's source copy, with English and every other locale written at the same time. If a string is missing, ask.

## Rich text

Messages own linguistic structure. Components own document structure: `<p>`, `<h1>`, `<ul>`, `<table>`, `<section>`. A tag in a message is a semantic marker, not HTML. `t.rich` maps it to an element; attributes, hrefs and class names never appear in locale files.

**Inline only.** The vocabulary is emphasis plus actions. There is no `<p>`, `<div>`, `<h2>` or `<ul>` in a message. Wrapping `t.rich` in `<p>` is the page's job, and it is safe only because messages cannot contain a `<p>` of their own.

**No generic `<link>`.** A tag that can point anywhere forces the URL into the component as a prop, and two `<link>`s in one string cannot carry two destinations. Each in-text action is its own tag, baked to one target in `tags`.

| Tag | Action |
|---|---|
| `<em>` | Emphasis |
| `<strong>` | Strong emphasis |
| `<term>` | Vocabulary reference. Jumps to `/rules#vocabulary`. |
| `<tieBreaks>` | Jumps to `/rules#tie-breaks`. |
| `<about>` | Opens `/about`. |
| `<rules>` | Opens `/rules`. |
| `<reference>` | Opens `/reference`. |

Names are identifiers: letters only, so they are valid ICU tags and unquoted keys in the `tags` map. Not `<tie-breaks>`, `<link-to-about>` or `<a>`. A `Link` suffix would show translators that the span is a link; at this size the table above is the legend. If the site grows a large set of in-text actions, revisit.

Add a tag to this table and to `tags` when a message needs a new action. Do not invent a tag on a page.

`t.rich`'s second argument is one object: tag mappers (functions) and ICU values (strings, numbers). A tag name and a variable cannot share a key.

Body copy rendered in a `<p>` (or other inline-rich block) always goes through `t.rich(key, tags)`, even when the current English string has no tags, so a later locale can add them. Titles, headings, nav labels and CTA labels stay on `t()`: they are `string`s, and `t.rich` returns a `ReactNode`.

## Type safety

`en.json` is the schema. Augment the next-intl config so every key is checked:

```ts
import messages from './messages/en.json';

declare module 'next-intl' {
  interface AppConfig {
    Messages: typeof messages;
  }
}
```

A missing or misspelled key is then a compile error rather than a runtime fallback, and locale files that drift from English fail the build instead of shipping.

## Navigation

Import `Link`, `usePathname`, `useRouter` and `redirect` from `@/i18n/navigation`, never from `next/link` or `next/navigation`. The plain versions know nothing about `pathnames` and emit English paths on non-English pages. It compiles and type-checks, and nothing warns you.

The root `src/app/not-found.tsx` is outside the locale tree and has no provider. It uses a plain `<a href="/">` to the English home. Do not import `next/link` there. `@next/next/no-html-link-for-pages` is disabled on that line.

Unknown paths that the proxy has already placed in `[locale]` are caught by `src/app/[locale]/[...rest]/page.tsx`, which calls `notFound()` so `[locale]/not-found.tsx` can render inside the site chrome. That page uses `notFound.*` from the message files.

## Adding a locale

Decisions first, then scaffolding, then translation. Doing it in that order is what stops one concept acquiring three words in the same locale. Spanish and Polish are the worked examples; German and Japanese repeat this sequence.

**1. Settle the vocabulary and the slugs.** Before a word of copy is written, agree that locale's form for every term in `docs/domain/glossary.md`, the hand and group naming pattern, and the localised pathnames. Where a choice is contested, decide it once and write down why. Terms run through every page, so translating them in flow guarantees inconsistency. Slugs are expensive once indexed and shared: settle them before implementing `pathnames`.

Binding from the Spanish pass, and from the glossary translation rules:

- **Mitchi** stays untranslated and uninflected in every language.
- Hand names keep higher-die-first order. Translate the number words, not the structure. Never compose a name at runtime.
- Anchor IDs stay English in every locale (`#vocabulary`, `#hands`, …). Visible headings translate; fragments do not.

**2. Write `docs/domain/glossary.<locale>.md`.** Term forms and the reasoning behind contested choices. Not definitions: those live in the message file, and repeating them here gives the site two sources of truth for the same sentence. The file opens with a **Status** line saying what review the locale has had and what it has not (a B1 reader, a native speaker, nobody). A green build is not a review, and the status line is the only committed record of the difference. For an inflected language, list every form of a term that occurs in the copy, not just the headword, so a later edit can check a form rather than guess it.

**3. Scaffold the message file.**

```bash
npm run i18n:new -- <locale>
```

Copies `en.json` with `[XX] ` on every string, so an untranslated string is visible rather than a silent fallback to English. It refuses to overwrite an existing file and has no force flag: regenerating a locale means deleting its file yourself.

There is no mirror script. Key parity is maintained by hand and enforced by `i18n:check` (step 10).

**4. Add the locale to `src/i18n/routing.ts`.** Append it to `locales`. In `pathnames`:

- Paths that are the same in every language stay plain strings (`/`).
- Paths whose slug differs become per-locale objects, e.g. `/rules`: `{ en: "/rules", es: "/reglas", … }`.

Update `docs/product/site-map.md` when the new slugs are real in routing, not later: the site map describes what the site does. Sitemap entries follow `routing.locales` and `PAGES` in `src/i18n/metadata.ts` — no hand-edited URL list.

`src/proxy.ts` needs no edit: it is `createMiddleware(routing)`, so the new locale is negotiated, redirected and cookie-persisted as soon as it is in `locales`. The same goes for `hreflang` alternates, canonicals and the sitemap, which all loop over `routing.locales`. Adding Polish touched none of those files.

Add the locale's messages to the `messages` map in `.storybook/preview.tsx` (one `import` and one entry). `tsc` fails until you do. The Storybook locale toolbar picks the locale up from `routing.locales`.

**5. Check the font subsets.** `src/app/fonts.ts` names the Google Fonts subsets each face loads. `latin` covers Spanish (its accented letters are Latin-1) but not Polish: ą ć ę ł ń ś ź ż are Latin Extended-A, and without `latin-ext` every one of them renders in the fallback font on every page of that locale, with nothing failing. Add the subset a language needs and confirm it in the built CSS (a preloaded `@font-face` per family with the right `unicode-range`) and then in a browser on real text, a heading, a body paragraph and a mono label. Japanese is a separate font decision, not a subset.

**6. Translate,** deleting the `[XX] ` marker from each string as you go. The markers are the only progress bar this work has, and once they are gone a silent fallback looks exactly like a correct page. Rich text tags and ICU parameter names survive untouched; word order around them may change.

`nav.*` holds the main-nav link labels only. Chrome (skip link, footer, on-this-page label) is `site.*`; the next-page block is `nextPage.*`. Do not put autonyms (English, Español, …) in the message files.

**7. Add the language to the switcher.** `src/components/language-switcher.tsx` is a client leaf: it needs `usePathname()` from `@/i18n/navigation`, and reading the path on the server would turn the locale layout dynamic. Add the locale to `LOCALE_NAMES` with the language named in its own language. Keep it a nav of links with `locale`, `hreflang`, `lang` and `aria-current` — not a `<select>`.

Passing `locale` to `Link` emits a prefix even for the default locale (`/en/rules`). That is deliberate: the prefix updates `NEXT_LOCALE` before navigation; the proxy then redirects to the unprefixed English path under `localePrefix: "as-needed"`.

**8. Prove the locale.** Switching must keep the same page (including localised slugs). `/es/reglas#vocabulary` (and the equivalent for the new locale) must land on the Game vocabulary section. `lang` on `<html>` comes from the locale layout.

**9. Build.** `npm run build`: every real route shows `●` with both (all) locale paths listed, and a `proxy` entry is present. Exactly one `ƒ` is expected: `/[locale]/[...rest]`, the 404 catch-all. It cannot get `generateStaticParams` for arbitrary paths. Do not try to make it static.

The build route table lists **internal** App Router paths (e.g. `/es/rules`). External localised URLs are what `Link` and the proxy emit; confirm those with smoke and prerendered HTML if needed.

**10. Run the checks before committing.**

```bash
npm run i18n:check
./scripts/smoke.sh http://localhost:3000   # or production, no args
```

`i18n:check` compares every locale file to `en.json` for key parity and for matching rich text tags and ICU parameters. A string that drops `<term>` or renames a parameter fails at render, on a page nobody is looking at. It also lists every remaining `[XX] ` marker, which is the progress bar for step 6; the batch is done when the count drops by exactly the number of strings in it and no more.

`scripts/smoke.sh` is the request-time half the build cannot cover: Accept-Language negotiation, `NEXT_LOCALE` precedence, a localised slug (`/es/reglas`, `/pl/zasady`), the English switcher prefix strip (`/en/reference` → `/reference`), cookie rewrite of an English path to the localised slug, and HTML `rel="canonical"` / `hreflang` on `/rules`, `/es/reglas` and `/pl/zasady` (absolute hrefs use `SITE_ORIGIN`, not the smoke base URL). It grows with every locale, in two steps: the four routing checks (speaker redirected to the prefix, localised rules slug serves, cookie rewrite, unlocalised slug redirects) as soon as the locale is in routing, and the canonical/hreflang block for its rules page, plus an `hreflang` line for it on every existing block, once the page carries real metadata. Run it against a preview deploy as well as `localhost`; the only expected difference off production is the apex redirect, which the script skips.

Locale message files are separate chunks, so an added locale does not grow any other locale's bundle.
