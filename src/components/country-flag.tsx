import { countries } from "@/lib/i18n";

export function CountryFlag({ country, showName = false }: { country?: string | null; showName?: boolean }) {
  const normalized = country?.toLowerCase();
  const item = countries.find((candidate) => candidate.slug === normalized || candidate.code.toLowerCase() === normalized);
  if (!item) return null;
  return <span className="country-flag-label" title={item.name.pt}><span role="img" aria-label={`Bandeira do ${item.name.pt}`}>{item.flag}</span>{showName && <small>{item.name.pt}</small>}</span>;
}
