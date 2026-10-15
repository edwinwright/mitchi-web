// Scaffolds messages/<locale>.json from messages/en.json, prefixing every
// string with "[XX] " so an untranslated string is visible rather than a
// silent fallback to English.
//
//   npm run i18n:new -- pl
//
// It refuses to write a file that already exists. There is no force flag:
// regenerating a locale means deleting its file yourself, deliberately.
// The script it replaced overwrote es.json on every run and came within one
// absent-minded command of destroying a translation pass.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const locale = process.argv[2];

if (!locale) {
  console.error("Usage: npm run i18n:new -- <locale>   e.g. pl, de, ja, pt-BR");
  process.exit(1);
}

if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(locale)) {
  console.error(
    `Not a locale code: "${locale}". Expected e.g. pl, de, ja, pt-BR.`,
  );
  process.exit(1);
}

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const enPath = path.join(rootDir, "messages", "en.json");
const outPath = path.join(rootDir, "messages", `${locale}.json`);

if (existsSync(outPath)) {
  console.error(
    `messages/${locale}.json already exists. Refusing to overwrite it.\n` +
      "To start that locale again, delete the file first.",
  );
  process.exit(1);
}

const marker = `[${locale.toUpperCase()}] `;

function scaffold(value) {
  if (typeof value === "string") {
    return marker + value;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [key, scaffold(v)]),
    );
  }
  throw new Error(`Unsupported message value: ${JSON.stringify(value)}`);
}

const en = JSON.parse(readFileSync(enPath, "utf8"));
writeFileSync(outPath, `${JSON.stringify(scaffold(en), null, 2)}\n`);

console.log(
  `Wrote messages/${locale}.json. Every string carries "${marker.trim()}" until translated.`,
);
