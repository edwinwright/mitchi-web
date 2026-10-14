# Mitchi

Mitchi is a dice game for two or more players. You need two dice and a way to
keep score. This repository builds the site that publishes its rules, currently
in English, Spanish and Polish, with German and Japanese planned.

- [English](https://www.mitchidice.com)
- [Español](https://www.mitchidice.com/es)
- [Polski](https://www.mitchidice.com/pl)

## Playing

Everything you need is on the site: how a round works, the ranking of hands,
worked examples, and the words players use at the table. No account, no
install, and no tracking beyond anonymous page counts.

## How it is built

A statically generated Next.js site on the App Router, with next-intl, Tailwind
and no UI kit. Every page is prerendered for every locale, with a request-time
proxy handling locale detection and rewrites.

The part worth reading is not the game, it is how the content is arranged so
that adding a language is a config change and a message file rather than an
audit of every page. German and Japanese are next, and are the real test of
that claim.

| Where                                    | What it covers                                                      |
| ---------------------------------------- | ------------------------------------------------------------------- |
| `docs/architecture/tech-stack.md`        | What the project uses, what it deliberately does not, and why       |
| `docs/architecture/i18n-conventions.md`  | How message content is keyed, typed and rendered                    |
| `docs/architecture/storybook.md`         | The component workshop: running it, writing a story, deployment     |
| `docs/domain/glossary.md`                | The game's vocabulary, binding on copy in every language            |
| `docs/domain/translation-rationale.*.md` | Per-language reasoning, and the alternatives set aside              |
| `docs/product/voice.md`                  | How the site is written                                             |
| `docs/product/site-map.md`               | The routes, and what the site deliberately does not have            |
| `AGENTS.md`                              | The constraints anyone working in this repo follows, human or agent |

Source lives under `src`: routes in `src/app/[locale]`, components in
`src/components`, hand data in `src/data`, i18n configuration in `src/i18n`.
Copy lives in `messages/<locale>.json`, one file per language.

## Running it

```bash
npm install
npm run dev
npm run storybook    # component workshop on http://localhost:6006
```

## Checks

```bash
npm run typecheck
npm run build
npm run i18n:check
npm run build-storybook
./scripts/smoke.sh                 # production
./scripts/smoke.sh http://localhost:3000
```

`npm run build` must show `●` on every real route, for both locale paths, plus
a `proxy` entry. A route showing `ƒ`, other than `/[locale]/[...rest]`, means
something is reading request state at render time.

`npm run i18n:check` compares every locale against English for missing keys,
mismatched rich-text tags and mismatched ICU parameters. Untranslated strings
are committed as visible `[ES] ` / `[PL] ` markers, and production builds fail
on any marker, so an untranslated string cannot ship.

## Translations

Corrections are welcome, particularly from native speakers. The Polish is the
newest and has had only an initial check; see
`docs/domain/translation-rationale.pl.md` for what is still open. Anything you
send is covered by the contributions terms in [LICENCE.md](LICENCE.md), so read
those first.

Open an issue rather than a pull request for wording. Terminology is governed
by the glossary in `docs/domain`, so a change to one sentence usually means a
change there first, and it is worth agreeing the term before anyone edits five
files.

## Licence

Source-available, not open source. You can read the code, clone it and run it
locally, but you can't deploy it or republish its content elsewhere. See
[LICENCE.md](LICENCE.md).
