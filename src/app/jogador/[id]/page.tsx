import type { Metadata } from "next";
import { notFound } from "next/navigation";
import clubData from "@/data/club.json";
import { buildDashboard } from "@/lib/stats";
import { PlayerProfile, type PlayerRecentMatch } from "@/components/player-profile";
import type { ClubDataset } from "@/types/domain";
import { findPublicClub, findPublicPlayer, publicPlayers } from "@/lib/public-data";

const dataset = clubData as ClubDataset;
const dashboard = buildDashboard(dataset);

export function generateStaticParams() {
  const ids = new Set([...dashboard.rankings.map((player) => player.id), ...publicPlayers.slice(0, 500).map((player) => player.id)]);
  return [...ids].map((id) => ({ id }));
}

function findPlayer(id: string) {
  const decoded = decodeURIComponent(id);
  return dashboard.rankings.find((player) => player.id.toLocaleLowerCase("pt-BR") === decoded.toLocaleLowerCase("pt-BR")) ?? findPublicPlayer(decoded);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const player = findPlayer(id);
  return { title: player ? `${player.name} | Clubs Brasil` : "Jogador não encontrado | Clubs Brasil" };
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

  return <PlayerProfile player={player} club={isLocal ? dataset.club : { id: publicPlayer!.clubId, name: publicPlayer!.clubName, crestUrl: publicClub?.crestUrl, sourceUrl: publicPlayer!.sourceUrl }} recentMatches={recentMatches} limitedData={!isLocal} />;
}
