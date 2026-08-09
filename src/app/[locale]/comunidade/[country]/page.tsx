import { notFound } from "next/navigation";
import { CountryCommunityHome } from "@/components/country-community-home";
import { countries, locales, type LocaleId } from "@/lib/i18n";
import { publicClubs, publicPlayers } from "@/lib/public-data";
export function generateStaticParams() { return locales.flatMap((locale) => countries.map((country) => ({ locale: locale.id, country: country.slug }))); }
export default async function Page({ params }: { params: Promise<{ locale: string; country: string }> }) { const { locale, country } = await params; if (!locales.some((item) => item.id === locale) || !countries.some((item) => item.slug === country)) notFound(); return <CountryCommunityHome locale={locale as LocaleId} countrySlug={country} indexedClubs={publicClubs.length} indexedPlayers={publicPlayers.length} />; }
