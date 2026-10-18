import Image from "next/image";
import { useTranslations } from "next-intl";
import { Container } from "@/components/container";
import { CtaLink } from "@/components/cta-link";
import { tags } from "@/i18n/rich-text";
import { Heading } from "./heading";

export function HomeHero() {
  const t = useTranslations("home");

  return (
    <section>
      <div className="bg-red-600 text-white relative overflow-hidden">
        <Container className="relative z-2 min-h-0 md:min-h-150 py-9 md:py-18">
          <div className="w-full md:w-1/2 md:pr-8 flex flex-col justify-between gap-11">
            <header className="flex flex-col gap-6">
              <Heading level={1} className="text-5xl md:text-7xl">
                {t("title")}
              </Heading>
              <div className="font-serif text-lg md:text-xl leading-normal text-white/85 max-w-[75ch]">
                <p className="border-b border-white/50 pb-4 mb-4">
                  {t("tagline")}
                </p>
                <p className="mb-4">{t.rich("keyIdea", tags)}</p>
                <p>{t.rich("scoring", tags)}</p>
              </div>
            </header>
            <footer className="flex flex-col gap-4">
              <nav className="flex flex-col gap-2.5 md:flex-row md:gap-3 w-full md:w-auto">
                <CtaLink
                  className="w-full md:w-auto"
                  href="/rules"
                  variant="primary"
                  inverse
                >
                  {t("links.rules")}
                </CtaLink>
                <CtaLink
                  className="w-full md:w-auto"
                  href="/reference"
                  variant="secondary"
                  inverse
                >
                  {t("links.reference")}
                </CtaLink>
              </nav>
              <p className="font-mono text-sm leading-normal max-w-[45ch] text-white/85 hidden md:block mt-2">
                {t.rich("youNeed", tags)}
              </p>
            </footer>
          </div>
        </Container>
        <div className="relative mt-14 h-52 bg-red-800 md:absolute md:inset-y-0 md:left-1/2 md:right-0 md:mt-0 md:h-auto">
          <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
            <Image
              src="/img/home-hero.jpg"
              alt=""
              fill
              priority
              sizes="(min-width: 768px) 47vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
      <div className="md:hidden bg-foreground text-white">
        <Container className="py-5">
          <div className="font-mono text-sm leading-normal text-white/85">
            {t.rich("youNeed", tags)}
          </div>
        </Container>
      </div>
    </section>
  );
}
