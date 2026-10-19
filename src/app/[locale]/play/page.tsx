import { Metadata } from "next";
import { useTranslations } from "next-intl";
import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { pageMetadata } from "@/i18n/metadata";
import { PlayIsland } from "@/modules/game";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "play");
}

export default function PlayPage() {
  const t = useTranslations("play");

  return (
    <>
      <PageHeader title={t("title")} standfirst={t("intro")} />
      <Container className="py-8 md:py-11">
        <PlayIsland />
      </Container>
    </>
  );
}
