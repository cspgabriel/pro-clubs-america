import clubData from "@/data/club.json";
import { catalogClubs } from "@/data/catalog";
import { publicClubs, publicPlayers } from "@/lib/public-data";
import type { ClubDataset } from "@/types/domain";

export interface CommunityMatchClub {
  id: string;
  name: string;
  platform: string;
  crestUrl: string;
  skillRating: number | null;
  winRate: number | null;
  matches: number | null;
  goals: number | null;
  roster: Array<{ name: string; position: string }>;
}

export function getCommunityMatchClubs(): CommunityMatchClub[] {
  const local = clubData as ClubDataset;
  const localOverview = local.club.overview;
  const localMatches = localOverview?.totalMatches ?? null;
  const localClub: CommunityMatchClub = {
    id: local.club.id,
    name: local.club.name,
    platform: local.club.platform,
    crestUrl: local.club.crestUrl ?? "/icon.svg",
    skillRating: localOverview?.skillRating ?? null,
    winRate: localMatches ? Math.round((localOverview?.wins ?? 0) / localMatches * 1000) / 10 : null,
    matches: localMatches,
    goals: localOverview?.goalsFor ?? null,
    roster: local.players.map((player) => ({ name: player.name, position: player.position ?? "—" })),
  };

  const indexed = publicClubs.map((club) => ({
    id: club.id,
    name: club.name,
    platform: club.platform,
    crestUrl: club.crestUrl,
    skillRating: club.skillRating,
    winRate: club.winRate,
    matches: club.matches,
    goals: club.goals,
    roster: publicPlayers.filter((player) => player.clubId === club.id).map((player) => ({ name: player.name, position: player.position })),
  }));
  const extras = catalogClubs.map((club) => ({ id: club.id, name: club.name, platform: club.platform, crestUrl: club.crestUrl, skillRating: club.skillRating ?? null, winRate: null, matches: null, goals: null, roster: [] }));
  return [localClub, ...indexed, ...extras].filter((club, index, all) => all.findIndex((item) => item.id === club.id) === index);
}
