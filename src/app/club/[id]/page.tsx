import type { Metadata } from "next";
import Image from "next/image";
import clubData from "@/data/club.json";
import { catalogClubs } from "@/data/catalog";
import { buildDashboard } from "@/lib/stats";
import { ClubDashboard } from "@/components/club-dashboard";
import { PlatformHeader } from "@/components/platform-header";
import { MobileNav } from "@/components/mobile-nav";
import type { ClubDataset } from "@/types/domain";
import { findPublicClub, publicClubs, publicPlayers } from "@/lib/public-data";
import { PublicClubProfile } from "@/components/public-club-profile";
import { SITE_NAME, breadcrumb, canonical, jsonLd } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const club = findPublicClub(id);
  const url = canonical(`/club/${id}`);
  if (!club) return { title: `Clube ${id} | ${SITE_NAME}`, description: `Estatisticas do clube ${id} no EA SPORTS FC Clubs.`, alternates: { canonical: url }, robots: { index: false, follow: true } };
  const record = `${club.wins}V ${club.draws}E ${club.losses}D`;
  const description = `${club.name} no EA SPORTS FC Clubs: ${club.matches} partidas, ${record}, ${club.goals} gols e ${club.winRate}% de aproveitamento. Skill rating ${club.skillRating}, divisao ${club.currentDivision}.`;
  return {
    title: `${club.name} — estatisticas e elenco | ${SITE_NAME}`,
    description,
    alternates: { canonical: url },
    openGraph: { type: "profile", url, siteName: SITE_NAME, title: `${club.name} — Pro Clubs`, description, images: club.crestUrl.startsWith("http") ? [{ url: club.crestUrl }] : undefined },
    twitter: { card: "summary", title: `${club.name} — Pro Clubs`, description },
  };
}

export function generateStaticParams() {
  return [{ id: "171630" }, ...publicClubs.map((club) => ({ id: club.id }))];
}

export default async function ClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "171630") return <><ClubDashboard data={buildDashboard(clubData as ClubDataset)} /><MobileNav /></>;
  const publicClub = findPublicClub(id);
  if (publicClub) {
    const structured = jsonLd({
      "@graph": [
        {
          "@type": "SportsTeam", name: publicClub.name, sport: "Esports — EA SPORTS FC Clubs", url: canonical(`/club/${id}`),
          logo: publicClub.crestUrl.startsWith("http") ? publicClub.crestUrl : undefined,
          identifier: publicClub.rawClubId, sameAs: publicClub.sourceUrl,
          memberOf: { "@type": "SportsOrganization", name: SITE_NAME, url: canonical("/") },
        },
        breadcrumb([{ name: "Inicio", path: "/" }, { name: "Clubes", path: "/clubes" }, { name: publicClub.name, path: `/club/${id}` }]),
      ],
    });
    return <><script type="application/ld+json" dangerouslySetInnerHTML={structured} /><PublicClubProfile club={publicClub} players={publicPlayers.filter((player) => player.clubId === id)} /></>;
  }
  const club = catalogClubs.find((item) => item.id === id);
  const name = club?.name ?? `Clube ID ${id}`;
  const crest = club?.crestUrl ?? "/icon.svg";
  return <main className="app-shell"><PlatformHeader /><section className="lite-profile"><Image src={crest} alt={`Escudo ${name}`} width={140} height={140} unoptimized /><small>{club ? "CLUBE ENCONTRADO NO HISTÓRICO" : "AGUARDANDO PRIMEIRA COLETA"}</small><h1>{name}</h1><p>ID {id} · common-gen5</p><a href={`https://www.ea.com/pt-br/games/ea-sports-fc/clubs/overview?clubId=${id}&platform=common-gen5`} target="_blank" rel="noreferrer">Abrir página pública</a></section><MobileNav /></main>;
}
