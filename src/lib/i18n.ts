export type LocaleId = "pt-br" | "es" | "en";
export const regionalPreferenceKey = "proclubs-america-region";
export const locales: Array<{ id: LocaleId; label: string }> = [{ id: "pt-br", label: "Português (Brasil)" }, { id: "es", label: "Español" }, { id: "en", label: "English" }];
export const countries = [
  { code: "BR", slug: "brasil", flag: "🇧🇷", name: { pt: "Brasil", es: "Brasil", en: "Brazil" } },
  { code: "AR", slug: "argentina", flag: "🇦🇷", name: { pt: "Argentina", es: "Argentina", en: "Argentina" } },
  { code: "BO", slug: "bolivia", flag: "🇧🇴", name: { pt: "Bolívia", es: "Bolivia", en: "Bolivia" } },
  { code: "CL", slug: "chile", flag: "🇨🇱", name: { pt: "Chile", es: "Chile", en: "Chile" } },
  { code: "CO", slug: "colombia", flag: "🇨🇴", name: { pt: "Colômbia", es: "Colombia", en: "Colombia" } },
  { code: "EC", slug: "equador", flag: "🇪🇨", name: { pt: "Equador", es: "Ecuador", en: "Ecuador" } },
  { code: "GY", slug: "guiana", flag: "🇬🇾", name: { pt: "Guiana", es: "Guyana", en: "Guyana" } },
  { code: "PY", slug: "paraguai", flag: "🇵🇾", name: { pt: "Paraguai", es: "Paraguay", en: "Paraguay" } },
  { code: "PE", slug: "peru", flag: "🇵🇪", name: { pt: "Peru", es: "Perú", en: "Peru" } },
  { code: "SR", slug: "suriname", flag: "🇸🇷", name: { pt: "Suriname", es: "Surinam", en: "Suriname" } },
  { code: "UY", slug: "uruguai", flag: "🇺🇾", name: { pt: "Uruguai", es: "Uruguay", en: "Uruguay" } },
  { code: "VE", slug: "venezuela", flag: "🇻🇪", name: { pt: "Venezuela", es: "Venezuela", en: "Venezuela" } },
] as const;
export const translations = {
  "pt-br": { eyebrow: "COMUNIDADE SUL-AMERICANA", title: "Pro Clubs em", intro: "Encontre clubes, jogadores, amistosos e oportunidades perto da sua comunidade.", clubs: "Explorar clubes", friendly: "Marcar amistoso", ranking: "Ver rankings", market: "Mercado", forming: "Comunidade regional em formação", note: "Cadastre seu time para aparecer nesta home após a validação pública da EA." },
  es: { eyebrow: "COMUNIDAD SUDAMERICANA", title: "Pro Clubs en", intro: "Encuentra clubes, jugadores, amistosos y oportunidades cerca de tu comunidad.", clubs: "Explorar clubes", friendly: "Programar amistoso", ranking: "Ver rankings", market: "Mercado", forming: "Comunidad regional en formación", note: "Registra tu club para aparecer aquí después de la validación pública de EA." },
  en: { eyebrow: "SOUTH AMERICAN COMMUNITY", title: "Pro Clubs in", intro: "Find clubs, players, friendlies and opportunities across your local community.", clubs: "Explore clubs", friendly: "Schedule friendly", ranking: "View rankings", market: "Transfer market", forming: "Regional community is growing", note: "Register your team to appear here after public EA validation." },
} satisfies Record<LocaleId, Record<string, string>>;
