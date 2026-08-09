"use client";
import Link from "next/link";
import { BarChart3, BriefcaseBusiness, Globe2, Shield, Swords, Users } from "lucide-react";
import { countries, locales, translations, type LocaleId } from "@/lib/i18n";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";
import { useRouter } from "next/navigation";

export function CountryCommunityHome({ locale, countrySlug, indexedClubs, indexedPlayers }: { locale: LocaleId; countrySlug: string; indexedClubs: number; indexedPlayers: number }) {
  const router = useRouter(); const country = countries.find((item) => item.slug === countrySlug)!; const copy = translations[locale]; const langKey = locale === "pt-br" ? "pt" : locale;
  return <main className="app-shell country-page"><PlatformHeader /><section className="country-hero"><div className="country-flag">{country.flag}</div><div><small>{copy.eyebrow}</small><h1>{copy.title} {country.name[langKey]}</h1><p>{copy.intro}</p><nav><Link href="/clubes"><Shield />{copy.clubs}</Link><Link href="/partidas/amistosos"><Swords />{copy.friendly}</Link><Link href="/rankings/jogadores/artilharia"><BarChart3 />{copy.ranking}</Link><Link href="/mercado"><BriefcaseBusiness />{copy.market}</Link></nav></div></section><section className="country-content"><header><div><small>{country.code} · EAFC 26</small><h2>{copy.forming}</h2><p>{copy.note}</p></div><Link href="/cadastro">Cadastrar / Registrar club</Link></header><div className="country-stats"><article><Shield /><strong>{indexedClubs}</strong><span>clubes indexados globalmente</span></article><article><Users /><strong>{indexedPlayers.toLocaleString("pt-BR")}</strong><span>jogadores na base</span></article><article><Globe2 /><strong>12</strong><span>países sul-americanos</span></article></div><div className="country-switchers"><label>País<select value={country.slug} onChange={(event) => router.push(`/${locale}/comunidade/${event.target.value}`)}>{countries.map((item) => <option value={item.slug} key={item.code}>{item.flag} {item.name[langKey]}</option>)}</select></label><label>Idioma<select value={locale} onChange={(event) => router.push(`/${event.target.value}/comunidade/${country.slug}`)}>{locales.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label></div></section><MobileNav /></main>;
}
