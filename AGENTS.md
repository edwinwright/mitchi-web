# Mitchi site

A statically generated Next.js site publishing the rules of Mitchi, a two-dice game, in several languages. English and Spanish now, Polish, German and Japanese later.

## Read before changing anything

| File                                    | What it governs                                                                                                                                                |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/architecture/tech-stack.md`       | What may be used, and what may not. No new dependency without a line in it.                                                                                    |
| `docs/architecture/i18n-conventions.md` | How messages are keyed, typed and rendered.                                                                                                                    |
| `docs/domain/glossary.md`               | The game's vocabulary. Binding on copy in every language.                                                                                                      |
| `docs/product/voice.md`                 | How the site is written.                                                                                                                                       |
| `docs/product/site-map.md`              | The routes, and what the site deliberately does not have.                                                                                                      |
| `docs/architecture/storybook.md`        | Storybook: how to run it, how to write a story, what it does not cover.                                                                                        |
| `.work/`                                | Local, ephemeral work-order notes, not committed. One subdirectory per work order, check for one in progress before starting; naming and file layout may vary. |

Read the plan for the current work item and do one slice at a time. Stop at the end of a slice and show the diff.

## Things that are invisible in the code and expensive to get wrong

- Import `Link`, `usePathname`, `useRouter` and `redirect` from `@/i18n/navigation`, never from `next/link` or `next/navigation`. The plain versions compile, type-check and emit the wrong URLs on non-English pages.
- Hands are data, hand names are messages. Never compose a name from two number words.
- No arrays in message files. `t()` throws on them.
- No markup inside message strings. Inline rich text tags only, via `t.rich` and `tags` from `@/i18n/rich-text`. `Prose` is the typography wrapper, not the tag map. See `docs/architecture/i18n-conventions.md`.
- `[locale]/not-found.tsx` is the 404 users hit. `src/app/not-found.tsx` is the no-locale shell: hardcoded English, `<a href="/">`, its own `globals.css` import. Do not call `useTranslations` there.
- Section anchor IDs stay in English in every locale.
- Copy changes come from the work item's source copy, not from improvisation. If a string is missing, ask.

## Commands

```bash
npm run dev           # local
npx tsc --noEmit      # types, including message keys
npm run lint
npm run format
npm run build         # read the route table
npm run storybook     # component workshop on :6006
npm run build-storybook
```

`npm run build` prints a route table. Every route must show `●`, prerendered with both locale paths listed, and a `proxy` entry must be present. A route showing `ƒ` means something is reading request state at render time: fix it before committing, do not ship it.

A new component gets a story, beside it as `*.stories.tsx`. Stories read every visible string from real message keys through `useTranslations`: no hardcoded copy, no per-locale stories (the toolbar switches locale). See `docs/architecture/storybook.md`.

## Skills

- Use the code review skill before committing a slice.
- Use the decision record skill only for a contested choice that is costly to reverse. Records go in `docs/architecture/decisions/`. A stack preference is a line in `tech-stack.md`, not a record.

## Not in this repo

Drafting notes, phase plans and rules working drafts live in the author's vault, not here. `docs/` holds durable facts and the work item in progress. Do not add project management, status or planning files beyond the current work item.

`.work/` is not committed. Never add a link or reference to a specific file or folder inside it (e.g. `.work/WO-0014/PLAN.md`) from a committed doc: the path won't exist for anyone else reading the repo once that work order's local folder is gone. A bare citation of a work order number as a ticket-style label (e.g. "fixed in WO-0014") is fine, the same as citing an issue or epic number from an external tracker.
