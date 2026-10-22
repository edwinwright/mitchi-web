import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BotReason } from "../engine";
import { simulateGame } from "../testing";
import { PLAIN_PHRASES } from "./commentary-rows";

// Read with node:fs: a relative import of messages/*.json would climb out of the module.
const LOCALES = ["en", "es", "pl"] as const;
const messages = Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as unknown,
  ]),
);

function has(locale: string, path: string): boolean {
  let node = messages[locale];
  for (const part of path.split(".")) {
    if (typeof node !== "object" || node === null || !(part in node)) {
      return false;
    }
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string";
}

// `satisfies` makes tsc fail here when a reason is added to the engine.
const REASONS = {
  beatsWorstHandSoFar: true,
  goodEnough: true,
  keepingHighDie: true,
  rerollingBoth: true,
} satisfies Record<BotReason, true>;

/** The viewer's re-rolls show as results ("You roll"), so `you` has no rollAgain keys. */
const YOU_PHRASES = PLAIN_PHRASES.filter((p) => !p.startsWith("rollAgain"));

const NOTICE_KEYS = [
  "round",
  "rollLimit.one",
  "rollLimit.two",
  "rollLimit.three",
  "tieBreakAnticlockwise",
  "tieBreakClockwise",
  "potMitchi",
  "potDoubled",
  "draw",
  "gameOver",
];

describe("commentary messages", () => {
  const keys = [
    "commentary.you.turn",
    "commentary.you.takesPot",
    "commentary.player.takesPot",
    ...YOU_PHRASES.map((p) => `commentary.you.${p}`),
    ...PLAIN_PHRASES.map((p) => `commentary.player.${p}`),
    ...Object.keys(REASONS).map((r) => `commentary.reason.${r}`),
    ...NOTICE_KEYS.map((k) => `commentary.notice.${k}`),
  ];

  it.each(LOCALES)(
    "commentary keys exist in all three locales: %s",
    (locale) => {
      const missing = keys.filter((key) => !has(locale, `play.${key}`));
      expect(missing).toEqual([]);
    },
  );

  it("every emitted bot reason has a message key", () => {
    const emitted = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      simulateGame(seed).reasons.forEach((reason) => emitted.add(reason));
    }
    expect([...emitted].sort()).toEqual(Object.keys(REASONS).sort());
    for (const locale of LOCALES) {
      for (const reason of emitted) {
        expect(has(locale, `play.commentary.reason.${reason}`)).toBe(true);
      }
    }
  });
});

/** The approved FR-10 copy, verbatim, for the tray's other-player sentences. */
const OTHER_STANDING_EN = {
  beats: "Their hand beats it",
  ties: "Their hand ties it",
  worse: "Their hand is worse",
};

/** The approved FR-10 copy, verbatim. */
const STATUS_EN = {
  intro: "Each player rolls one die. The highest starts the first round.",
  youRollFirst: "You roll first",
  youRolledToStart: "You roll a {face}",
  playerRolledToStart: "Rolls a {face}",
  tied: "Tied on {face}. The tied players roll again.",
  rollsNext: "Rolls next",
  keeps: "Keeps the {face}",
  keepsInstead: "Keeps the {face} instead",
};

/**
 * The roll to start is a phrase, never a noun: the nouns each glossary
 * (glossary.es.md, glossary.pl.md) rules out.
 */
const ROLL_OFF_NOUNS: Record<(typeof LOCALES)[number], readonly string[]> = {
  en: [],
  es: ["tirada inicial", "desempate inicial"],
  pl: ["rzut początkowy", "dogrywka początkowa"],
};

function text(locale: string, path: string): string {
  let node = messages[locale];
  for (const part of path.split(".")) {
    node = (node as Record<string, unknown>)[part];
  }
  return node as string;
}

describe("status messages", () => {
  const keys = [
    ...Object.keys(STATUS_EN).map((key) => `play.status.${key}`),
    ...Object.keys(OTHER_STANDING_EN).map(
      (key) => `play.round.otherStanding.${key}`,
    ),
  ];

  it.each(LOCALES)(
    "status and round.otherStanding keys exist in en, es, pl: %s",
    (locale) => {
      expect(keys.filter((key) => !has(locale, key))).toEqual([]);
    },
  );

  it.each(LOCALES)(
    "round.otherStanding has all three keys in every locale: %s",
    (locale) => {
      for (const key of Object.keys(OTHER_STANDING_EN)) {
        expect(has(locale, `play.round.otherStanding.${key}`), key).toBe(true);
      }
    },
  );

  describe("en copy", () => {
    it("each new string equals the approved FR-10 text", () => {
      for (const [key, english] of Object.entries(STATUS_EN)) {
        expect(text("en", `play.status.${key}`), key).toBe(english);
      }
      for (const [key, english] of Object.entries(OTHER_STANDING_EN)) {
        expect(text("en", `play.round.otherStanding.${key}`), key).toBe(
          english,
        );
      }
    });
  });

  describe("new strings", () => {
    it('take no name argument and never contain "roll-off"', () => {
      for (const locale of LOCALES) {
        for (const key of keys) {
          const value = text(locale, key);
          // Faces only: a player's name is a cell, never an argument.
          const args = [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
          expect(
            args.every((arg) => arg === "face"),
            `${locale} ${key}`,
          ).toBe(true);
          for (const term of ["roll-off", ...ROLL_OFF_NOUNS[locale]]) {
            expect(value.toLowerCase(), `${locale} ${key}`).not.toContain(term);
          }
        }
      }
    });
  });
});
