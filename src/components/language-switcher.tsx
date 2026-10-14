"use client";

import { ComponentProps } from "react";
import { useLocale, useTranslations } from "next-intl";
import { routing } from "@/i18n/routing";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Locale = (typeof routing.locales)[number];

const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
  pl: "Polski",
};
const LOCALE_CODES: Record<Locale, string> = { en: "EN", es: "ES", pl: "PL" };

type LocaleItem = {
  locale: Locale;
  current: boolean;
  label: string;
  linkProps: Pick<
    ComponentProps<typeof Link>,
    "href" | "locale" | "hrefLang" | "lang" | "aria-label" | "aria-current"
  >;
};

type LanguageSwitcherProps = {
  variant?: "group" | "list";
  inverse?: boolean;
  className?: string;
};

export function LanguageSwitcher({
  variant = "group",
  inverse = false,
  className,
}: LanguageSwitcherProps) {
  const t = useTranslations("site");
  const pathname = usePathname();
  const currentLocale = useLocale();
  const compact = variant === "group";

  const items: LocaleItem[] = routing.locales.map((locale) => {
    const current = locale === currentLocale;
    return {
      locale,
      current,
      label: compact ? LOCALE_CODES[locale] : LOCALE_NAMES[locale],
      linkProps: {
        href: pathname,
        locale,
        hrefLang: locale,
        lang: locale,
        "aria-label": compact ? LOCALE_NAMES[locale] : undefined,
        "aria-current": current ? "page" : undefined,
      },
    };
  });

  const Presentation = compact ? LocaleGroup : LocaleList;

  return (
    <nav aria-label={t("language")} className={className}>
      <Presentation items={items} inverse={inverse} />
    </nav>
  );
}

function LocaleGroup({
  items,
  inverse,
}: {
  items: LocaleItem[];
  inverse: boolean;
}) {
  const ground = inverse ? "inverse" : "regular";

  const ulClasses = cn(
    "inline-flex rounded-md border font-mono text-xs overflow-hidden",
    inverse ? "border-white bg-black text-white" : "bg-white border-foreground",
  );

  const linkClassMap = {
    regular: {
      idle: "hover:bg-stone-100",
      current: "bg-foreground text-white",
    },
    inverse: {
      idle: "hover:bg-white/10",
      current: "bg-white text-foreground",
    },
  } as const;

  const linkClassesFor = (current: boolean) =>
    cn(
      "focus-ring block px-2.5 py-1 transition-colors",
      linkClassMap[ground][current ? "current" : "idle"],
    );

  return (
    <ul className={ulClasses}>
      {items.map((item) => (
        <li key={item.locale}>
          <Link {...item.linkProps} className={linkClassesFor(item.current)}>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function LocaleList({
  items,
  inverse,
}: {
  items: LocaleItem[];
  inverse: boolean;
}) {
  const ground = inverse ? "inverse" : "regular";

  const linkClassMap = {
    regular: {
      idle: "hover:text-blue-600",
      current: "font-medium",
    },
    inverse: {
      idle: "text-stone-500 hover:text-red-500",
      current: "text-white",
    },
  } as const;

  const linkClassesFor = (current: boolean) =>
    cn(
      "focus-ring font-mono text-xs transition-colors",
      linkClassMap[ground][current ? "current" : "idle"],
    );

  return (
    <ul className="flex gap-3.5">
      {items.map((item) => (
        <li key={item.locale}>
          <Link {...item.linkProps} className={linkClassesFor(item.current)}>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
