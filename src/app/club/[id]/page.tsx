import type { Metadata } from "next";
import { findPublicClub, publicClubs } from "@/lib/public-data";
import { LiveClubDashboard } from "@/components/live-club-dashboard";
import { SITE_NAME, breadcrumb, canonical, jsonLd } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const club = findPublicClub(id);
  const title = `${club?.name || `Clube ${id}`} — estatísticas | ${SITE_NAME}`;
  const description = "Estatísticas sincronizadas, elenco, desempenho e partidas armazenadas do clube no EA SPORTS FC Clubs.";
  return { title, description, alternates: { canonical: canonical(`/club/${id}`) }, openGraph: { title, description, url: canonical(`/club/${id}`) } };
}

export function generateStaticParams() {
  return [...new Set(["171630", ...publicClubs.map((club) => club.id)])].map((id) => ({ id }));
}

export default async function ClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const club = findPublicClub(id);
  const structured = club ? jsonLd({ "@graph": [
    { "@type": "SportsTeam", name: club.name, sport: "Esports — EA SPORTS FC Clubs", url: canonical(`/club/${id}`), identifier: club.rawClubId, sameAs: club.sourceUrl },
    breadcrumb([{ name: "Início", path: "/" }, { name: "Clubes", path: "/clubes" }, { name: club.name, path: `/club/${id}` }]),
  ] }) : null;
  return <>{structured && <script type="application/ld+json" dangerouslySetInnerHTML={structured} />}<LiveClubDashboard id={id} /></>;
}
