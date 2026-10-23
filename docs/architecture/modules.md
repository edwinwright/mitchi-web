# Modules

Where feature code lives, and what may import what. Introduced in WO-0016 with the game module, which is the first.

## The convention

1. **A module is a feature.** It lives in `src/modules/<name>/`, named for the domain in a single lower-case word or kebab-case (`game`). Code shared by several pages stays where it is: `src/components`, `src/i18n`, `src/data`, `src/lib`. A module may import shared code. Shared code never imports a module.
2. **A module's public API is its `index.ts`.** Code outside the module imports `@/modules/game`, never `@/modules/game/<anything>`. The game module's index exports one thing, `PlayIsland`.
3. **A module may have sub-modules.** Each sub-module's public API is its own `index.ts`. Siblings import each other through the index (`../engine`), never a file inside it (`../engine/apply`). Files inside a sub-module import each other freely.
4. **Tests and stories sit beside the file they cover.**
5. **Existing code is not moved.** `src/components` has page-specific components (`home-*`, `rule-*`) that could become modules later. That is a separate piece of work if wanted.

## How it is enforced

dependency-cruiser, configured in `.dependency-cruiser.cjs` and run by `npm run depcruise` and in CI. The config is the rule list: each rule has a name and a comment, and a module's own rules sit beside the general ones. ESLint does not check imports between modules; it checks only what an import rule cannot see, such as `Math.random` and timers (`eslint.config.mjs`).

## The game module

```
src/modules/game/
  index.ts            export { PlayIsland } from "./play-island"
  play-island.tsx     "use client": <GameBoard session={useLocalSession()} />
  engine/             pure rules engine and the GameSession contract
  local/              LocalSession: store, hook, dice, pacing. Browser-only.
  ui/                 presentational panels, GameBoard, commentary rows
  testing/            fixtures, fixtureSession, seeded simulation. Tests and stories only.
```

Its rules, and why `local/` exists, are in `game-engine.md`.

## Adding a module

Create `src/modules/<name>/` with an `index.ts` that exports only what the app needs. The general rules cover it at once. Add rules of its own to `.dependency-cruiser.cjs` only if it has sub-modules with a direction to protect.
