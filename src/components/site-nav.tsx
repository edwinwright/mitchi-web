"use client";

import { useTranslations } from "next-intl";
import { ComponentProps } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type en from "../../messages/en.json";

type NavHref = ComponentProps<typeof Link>["href"];
type NavKey = keyof typeof en.nav;

const NAV_ITEMS: { key: NavKey; href: NavHref }[] = [
  { key: "rules", href: "/rules" },
  { key: "reference", href: "/reference" },
  { key: "about", href: "/about" },
];

type SiteNavProps = {
  layout?: "row" | "stack" | "grid";
  inverse?: boolean;
  className?: string;
};

/**
 * A client leaf so the layout stays static: usePathname is the only thing here
 * that reads the route, and reading it on the server turns the locale layout
 * dynamic. usePathname returns the internal path, so /es/reglas compares equal
 * to /rules.
 */
export function SiteNav({
  layout = "row",
  inverse = false,
  className,
}: SiteNavProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const ground = inverse ? "inverse" : "regular";

  const ulClasses = {
    row: "flex items-center gap-7",
    stack: "flex flex-col gap-4",
    grid: "grid grid-cols-2 gap-x-4 gap-y-3.5",
  }[layout];

  const linkClassMap = {
    regular: {
      idle: "border-transparent hover:text-blue-600 hover:border-blue-600",
      current: "border-red-600",
    },
    inverse: {
      idle: "text-white border-transparent hover:text-red-500",
      current: "text-white border-red-500",
    },
  } as const;

  const linkClassesFor = (current: boolean) =>
    cn(
      "focus-ring border-b-2 pb-0.5 text-base font-medium transition-colors",
      linkClassMap[ground][current ? "current" : "idle"],
    );

  return (
    <nav className={className}>
      <ul className={ulClasses}>
        {NAV_ITEMS.map(({ key, href }) => {
          const current = pathname === href;
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={linkClassesFor(current)}
              >
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
