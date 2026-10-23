# Site map

English has no locale prefix. Spanish is `/es` and Polish is `/pl`, each plus a localised slug.

| English      | Spanish          | Polish          | Purpose                                                                                          |
| ------------ | ---------------- | --------------- | ------------------------------------------------------------------------------------------------ |
| `/`          | `/es`            | `/pl`           | What the game is, the one key idea, and where to read on.                                        |
| `/rules`     | `/es/reglas`     | `/pl/zasady`    | The full rules, from setup to the end of the game, then the game vocabulary.                     |
| `/reference` | `/es/referencia` | `/pl/sciagawka` | Hand ranking and scoring on one screen, for use mid-game.                                        |
| `/about`     | `/es/acerca-de`  | `/pl/o-grze`    | How the author learnt the game, why the rules are written down, related games.                   |
| `/play`      | `/es/jugar`      | `/pl/zagraj`    | A short practice game against three other players. Linked from Home and Rules, not the main nav. |

Retired pages answer with a permanent redirect (`redirects()` in `next.config.ts`, checked by `scripts/smoke.sh`):

| From        | To              |
| ----------- | --------------- |
| `/speak`    | `/about`        |
| `/es/speak` | `/es/acerca-de` |

Discovery files are unprefixed and skip the locale proxy (dotted paths):

| Path           | Purpose                                             |
| -------------- | --------------------------------------------------- |
| `/sitemap.xml` | Every real page × locale, with language alternates. |
| `/robots.txt`  | Allows `/`; points at the sitemap on `SITE_ORIGIN`. |

Unknown paths are not a nav route. Two files handle them:

| File                             | When                                                                                                                     | Copy                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `src/app/[locale]/not-found.tsx` | A bogus path the proxy has already given a locale (`/references`, `/es/references`). Site header and footer are present. | `notFound.*` in the message files. Links to Rules and Reference. |
| `src/app/not-found.tsx`          | A request that never entered a locale. No chrome. English only.                                                          | Hardcoded. Points at `/`.                                        |

Dotted paths that skip the proxy matcher (for example `/references.txt`) can still miss both. That is accepted; do not call `notFound()` from the locale layout to chase them.

## Deliberately not built

Score tracker, hand comparison tool, search, scroll spy, breadcrumbs, a configurable game (player count, point limit, difficulty), dark-mode toggle, print stylesheet, strategy page.

## Canonical source

Once the site is live it is the canonical rules. The vault rules note is the working draft. Changes go note → `en.json` → the other locales.
