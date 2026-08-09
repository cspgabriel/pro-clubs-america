"use client";
import Link from "next/link";
import { Globe2, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { countries, regionalPreferenceKey, type LocaleId } from "@/lib/i18n";
const zones: Record<string, string> = { "America/Sao_Paulo": "brasil", "America/Fortaleza": "brasil", "America/Recife": "brasil", "America/Argentina/Buenos_Aires": "argentina", "America/Santiago": "chile", "America/Bogota": "colombia", "America/Lima": "peru", "America/Montevideo": "uruguai", "America/Asuncion": "paraguai", "America/La_Paz": "bolivia", "America/Guayaquil": "equador", "America/Caracas": "venezuela", "America/Guyana": "guiana", "America/Paramaribo": "suriname" };
export function CountryGateway() {
  const [preference, setPreference] = useState<{ country: string; locale: LocaleId } | null>(null);
  useEffect(() => { const timer = setTimeout(() => { try { const saved = JSON.parse(localStorage.getItem(regionalPreferenceKey) ?? "null"); if (saved) return setPreference(saved); } catch {} const language = navigator.language.toLowerCase(); const locale: LocaleId = language.startsWith("pt") ? "pt-br" : language.startsWith("es") ? "es" : "en"; const country = zones[Intl.DateTimeFormat().resolvedOptions().timeZone] ?? (locale === "pt-br" ? "brasil" : locale === "es" ? "argentina" : "guiana"); setPreference({ country, locale }); }, 0); return () => clearTimeout(timer); }, []);
  if (!preference) return null; const country = countries.find((item) => item.slug === preference.country) ?? countries[0];
  return <aside className="country-gateway"><div><MapPin /><span>COMUNIDADE SUGERIDA<strong>{country.flag} {country.name.pt}</strong></span></div><Link href={`/${preference.locale}/comunidade/${country.slug}`}>Abrir comunidade <Globe2 /></Link></aside>;
}
