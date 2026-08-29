export const SITE_NAME = "Pro Clubs America";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://proclubsamerica.com";

export const canonical = (path: string) => new URL(path.endsWith("/") ? path : `${path}/`, SITE_URL).toString();

export function jsonLd(data: Record<string, unknown>) {
  return { __html: JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\u003c") };
}

export function breadcrumb(trail: Array<{ name: string; path: string }>) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((entry, index) => ({ "@type": "ListItem", position: index + 1, name: entry.name, item: canonical(entry.path) })),
  };
}
