/**
 * dependency-cruiser: what may import what. See docs/architecture/modules.md.
 * Rules about globals (Math.random, timers, Date) are not imports; ESLint
 * checks those, in eslint.config.mjs.
 */
const TESTS = "\\.(test|stories)\\.tsx?$";

module.exports = {
  forbidden: [
    {
      name: "shared-not-modules",
      comment: "Shared code never imports a module.",
      severity: "error",
      from: { path: "^src/(components|i18n|data|lib)/" },
      to: { path: "^src/modules/" },
    },
    {
      name: "module-via-index",
      comment: "Outside a module, import its index.ts only.",
      severity: "error",
      from: { pathNot: "^src/modules/" },
      to: {
        path: "^src/modules/[^/]+/",
        pathNot: "^src/modules/[^/]+/index\\.ts$",
      },
    },
    {
      name: "sub-module-via-index",
      comment:
        "A sibling sub-module is entered through its index.ts. Files in the same sub-module import each other freely.",
      severity: "error",
      from: { path: "^src/modules/([^/]+)/([^/]+)/" },
      to: {
        path: "^src/modules/$1/[^/]+/",
        pathNot: "^src/modules/$1/($2/|[^/]+/index\\.ts$)",
      },
    },
    {
      name: "module-root-via-index",
      comment:
        "Files at a module's root enter its sub-modules through index.ts.",
      severity: "error",
      from: { path: "^src/modules/([^/]+)/[^/]+$" },
      to: {
        path: "^src/modules/$1/[^/]+/",
        pathNot: "^src/modules/$1/[^/]+/index\\.ts$",
      },
    },
    {
      name: "game-engine-is-pure",
      comment:
        "ENG-1: the engine imports only its own files and @/data/hands. Engine tests may add the testing helpers and vitest.",
      severity: "error",
      from: { path: "^src/modules/game/engine/", pathNot: TESTS },
      to: { pathNot: "^src/(modules/game/engine/|data/hands\\.ts$)" },
    },
    {
      name: "game-engine-tests",
      severity: "error",
      from: { path: `^src/modules/game/engine/.*${TESTS}` },
      to: {
        pathNot:
          "^(src/modules/game/(engine|testing)/|src/data/hands\\.ts$|node_modules/(vitest|@vitest)/)",
      },
    },
    {
      name: "game-testing-is-pure",
      comment: "Fixtures and the simulation use the engine and nothing else.",
      severity: "error",
      from: { path: "^src/modules/game/testing/" },
      to: {
        pathNot:
          "^(src/modules/game/(engine|testing)/|src/data/hands\\.ts$|node_modules/(vitest|@vitest)/)",
      },
    },
    {
      name: "game-testing-only-in-tests",
      comment: "Production code never loads fixtures or the simulation.",
      severity: "error",
      from: {
        path: "^src/",
        pathNot: `(${TESTS}|^src/modules/game/testing/)`,
      },
      to: { path: "^src/modules/game/testing/" },
    },
    {
      name: "game-ui-not-local",
      comment:
        "SES-2: UI receives a GameSession; it never imports the session runtime.",
      severity: "error",
      from: { path: "^src/modules/game/ui/" },
      to: { path: "^src/modules/game/local/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
  },
};
