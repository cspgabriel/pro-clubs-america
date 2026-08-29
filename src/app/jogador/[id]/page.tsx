import type { Metadata } from "next";
import { notFound } from "next/navigation";
import clubData from "@/data/club.json";
import { buildDashboard } from "@/lib/stats";
import { PlayerProfile, type PlayerRecentMatch } from "@/components/player-profile";
import type { ClubDataset } from "@/types/domain";
import { findPublicClub, findPublicPlayer, indexablePlayers } from "@/lib/public-data";
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
  const rating = player.averageRating ? `, nota media ${player.averageRating}` : "";
  const description = `Estatisticas de ${player.name}${club} no EA SPORTS FC Clubs: ${player.matches} partidas, ${player.goals} gols, ${player.assists} assistencias${rating}. Posicao ${player.position}.`;
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
  const publicClub = publicPlayer ? findPublicClub(publicPlayer.clubId) : null;

  const recentMatches: PlayerRecentMatch[] = isLocal ? dataset.matches.flatMap((match) => {
    const stats = match.players.find((item) => item.playerId.toLocaleLowerCase("pt-BR") === player.id.toLocaleLowerCase("pt-BR"));
    if (!stats) return [];
    const isHome = match.homeClubId === dataset.club.id;
    const ownScore = isHome ? match.homeScore : match.awayScore;
    const opponentScore = isHome ? match.awayScore : match.homeScore;
    return [{
      id: match.id,
      label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(match.playedAt)),
      opponent: isHome ? match.awayClubName : match.homeClubName,
      score: `${ownScore} × ${opponentScore}`,
      result: ownScore > opponentScore ? "V" as const : ownScore === opponentScore ? "E" as const : "D" as const,
      goals: stats.goals,
      assists: stats.assists,
      rating: stats.rating ?? null,
      passes: stats.passesMade ?? null,
      tackles: stats.tacklesMade ?? null,
    }];
  }) : [];

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
  return <><script type="application/ld+json" dangerouslySetInnerHTML={structured} /><PlayerProfile player={player} club={isLocal ? dataset.club : { id: publicPlayer!.clubId, name: publicPlayer!.clubName, crestUrl: publicClub?.crestUrl, sourceUrl: publicPlayer!.sourceUrl }} recentMatches={recentMatches} limitedData={!isLocal} /></>;
}
