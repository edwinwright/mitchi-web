import { type Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPathname } from "./navigation";
import { routing } from "./routing";

export const PAGES = {
  home: "/",
  rules: "/rules",
  reference: "/reference",
  play: "/play",
  about: "/about",
} as const;

export type MetaPage = keyof typeof PAGES;

const OG_IMAGE = {
  url: "/meta/og-default.jpg",
  width: 1200,
  height: 634,
  alt: "Dice being rolled on a table",
};

export async function pageMetadata(
  locale: string,
  page: MetaPage,
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "meta" });
  const title = t(`${page}.title`);
  // An empty message means "not written yet", and no tag is better than an empty one.
  const description = t(`${page}.description`) || undefined;

  const href = PAGES[page];
  const canonical = getPathname({ locale, href });
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = getPathname({ locale: loc, href });
  }
  languages["x-default"] = getPathname({ locale: "en", href });

  return {
    title,
    description,
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [OG_IMAGE],
    },
    alternates: {
      canonical,
      languages,
    },
  };
}
