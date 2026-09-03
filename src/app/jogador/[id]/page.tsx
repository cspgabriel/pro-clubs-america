import type { Metadata } from "next";
import { notFound } from "next/navigation";
import clubData from "@/data/club.json";
import { buildDashboard } from "@/lib/stats";
import { LiveClubDashboard } from "@/components/live-club-dashboard";
import type { ClubDataset } from "@/types/domain";
import { findPublicPlayer, indexablePlayers } from "@/lib/public-data";
import { SITE_NAME, breadcrumb, canonical, jsonLd } from "@/lib/seo";

const dataset = clubData as ClubDataset;
const dashboard = buildDashboard(dataset);

export function generateStaticParams() {
  const ids = new Set([...dashboard.rankings.map((player) => player.id), ...indexablePlayers.map((player) => player.id)]);
  return [...ids].map((id) => ({ id }));
}

function findPlayer(id: string) {
  const decoded = decodeURIComponent(id);
  return dashboard.rankings.find((player) => player.id.toLocaleLowerCase("pt-BR") === decoded.toLocaleLowerCase("pt-BR")) ?? findPublicPlayer(decoded);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const player = findPlayer(id);
  const url = canonical(`/jogador/${id}`);
  if (!player) return { title: `Jogador nao encontrado | ${SITE_NAME}`, robots: { index: false, follow: true } };
  const club = "clubName" in player && player.clubName ? ` do ${player.clubName}` : "";
  const description = `Estatísticas sincronizadas de ${player.name}${club} no EA SPORTS FC Clubs: desempenho, gols, assistências e partidas armazenadas.`;
  return {
    title: `${player.name} — estatisticas de Pro Clubs | ${SITE_NAME}`,
    description,
    alternates: { canonical: url },
    openGraph: { type: "profile", url, siteName: SITE_NAME, title: `${player.name} — Pro Clubs`, description },
    twitter: { card: "summary", title: `${player.name} — Pro Clubs`, description },
  };
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = findPlayer(id);
  if (!player) notFound();

  const isLocal = dashboard.rankings.some((item) => item.id === player.id);
  const publicPlayer = isLocal ? null : findPublicPlayer(player.id);

  const clubName = isLocal ? dataset.club.name : publicPlayer!.clubName;
  const structured = jsonLd({
    "@graph": [
      {
        "@type": "Person", name: player.name, url: canonical(`/jogador/${id}`), jobTitle: player.position,
        affiliation: { "@type": "SportsTeam", name: clubName, url: publicPlayer ? canonical(`/club/${publicPlayer.clubId}`) : canonical("/"), sport: "Esports — EA SPORTS FC Clubs" },
      },
      breadcrumb([{ name: "Inicio", path: "/" }, { name: "Jogadores", path: "/jogadores" }, { name: player.name, path: `/jogador/${id}` }]),
    ],
  });
  return <><script type="application/ld+json" dangerouslySetInnerHTML={structured} /><LiveClubDashboard id={isLocal ? dataset.club.id : publicPlayer!.clubId} playerName={player.name} /></>;
}
