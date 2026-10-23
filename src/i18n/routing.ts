import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Ship order from the project note. Add de, ja one at a time in phase 6.
  locales: ["en", "es", "pl"],

  defaultLocale: "en",

  // English at /rules, Spanish at /es/reglas, Polish at /pl/zasady.
  // Settled in the hosting decision record. Expensive to change after launch.
  localePrefix: "as-needed",

  // The internal-to-external path dictionary.
  // Keys are internal route paths. Values are per-locale external paths.
  // Polish slugs strip diacritics by convention: /sciagawka, not /ściągawka.
  pathnames: {
    "/": "/",
    "/about": {
      en: "/about",
      es: "/acerca-de",
      pl: "/o-grze",
    },
    "/reference": {
      en: "/reference",
      es: "/referencia",
      pl: "/sciagawka",
    },
    "/play": {
      en: "/play",
      es: "/jugar",
      pl: "/zagraj",
    },
    "/rules": {
      en: "/rules",
      es: "/reglas",
      pl: "/zasady",
    },
  },
});
