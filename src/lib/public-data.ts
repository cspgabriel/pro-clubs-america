import detailedJson from "../../data/pro_clubs_all_teams_detailed.json";
import type { PlayerRanking } from "@/types/domain";

interface RawClubInfo { customKit?: { crestAssetId?: string; stadName?: string } }
interface RawClub {
  rank?: number | string; skillRating?: string; wins?: string; ties?: string; losses?: string; gamesPlayed?: string; goals?: string; goalsAgainst?: string; cleanSheets?: string; goalsPerGame?: string; clubName?: string; clubId?: string; currentDivision?: string; bestDivision?: string; platform?: string; clubInfo?: RawClubInfo;
}
interface RawMember { name: string; gamesPlayed?: string; goals?: string; assists?: string; manOfTheMatch?: string; ratingAve?: string; favoritePosition?: string; }
interface DetailedClub {
  metadata: { platform: string; clubId: string; clubName: string; all_time_rank?: number; seasonal_rank?: number; all_time_raw?: RawClub; seasonal_raw?: RawClub };
  club_info?: Record<string, { customKit?: RawClubInfo["customKit"] }>;
  player_stats?: { members?: RawMember[] };
}

const detailed = detailedJson as unknown as Record<string, DetailedClub>;
const crestBase = "https://eafc24.content.easports.com/fifa/fltOnlineAssets/24B23FDE-7835-41C2-87A2-F453DFDB2E82/2024/fcweb/crests/256x256";
const numeric = (value: string | number | undefined) => Number(value ?? 0);
const cleanText = (value: string | undefined) => {
  if (!value) return "";
  if (!/[ÃÂ]|â€|ðŸ/.test(value)) return value;
  try { return new TextDecoder().decode(Uint8Array.from([...value].map((character) => character.charCodeAt(0)))); } catch { return value; }
};
const slug = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "jogador";
const routeClubId = (platform: string, clubId: string) => platform === "common-gen5" ? clubId : `${platform}-${clubId}`;

export interface PublicClub {
  id: string; rawClubId: string; name: string; platform: string; rank: number; skillRating: number; wins: number; draws: number; losses: number; matches: number; goals: number; goalsAgainst: number; cleanSheets: number; goalsPerGame: number; winRate: number; currentDivision: number; bestDivision: number; crestUrl: string; stadium?: string; sourceUrl: string;
}
export interface PublicPlayer extends PlayerRanking { clubId: string; clubName: string; platform: string; manOfTheMatch: number; sourceUrl: string; statsReliable: boolean; }

export const publicClubs: PublicClub[] = Object.values(detailed).map((entry) => {
  const raw = entry.metadata.all_time_raw ?? entry.metadata.seasonal_raw ?? {};
  const platform = entry.metadata.platform;
  const rawClubId = entry.metadata.clubId;
  const matches = numeric(raw.gamesPlayed);
  const info = raw.clubInfo ?? entry.club_info?.[rawClubId];
  const crestAssetId = info?.customKit?.crestAssetId;
  return {
    id: routeClubId(platform, rawClubId), rawClubId, name: cleanText(entry.metadata.clubName || raw.clubName) || `Clube ${rawClubId}`, platform,
    rank: numeric(entry.metadata.all_time_rank ?? entry.metadata.seasonal_rank ?? raw.rank), skillRating: numeric(raw.skillRating), wins: numeric(raw.wins), draws: numeric(raw.ties), losses: numeric(raw.losses), matches, goals: numeric(raw.goals), goalsAgainst: numeric(raw.goalsAgainst), cleanSheets: numeric(raw.cleanSheets), goalsPerGame: numeric(raw.goalsPerGame), winRate: matches ? Math.round(numeric(raw.wins) / matches * 1000) / 10 : 0, currentDivision: numeric(raw.currentDivision), bestDivision: numeric(raw.bestDivision), crestUrl: crestAssetId ? `${crestBase}/l${crestAssetId}.png` : "/icon.svg", stadium: cleanText(info?.customKit?.stadName), sourceUrl: `https://www.ea.com/pt-br/games/ea-sports-fc/clubs/overview?clubId=${rawClubId}&platform=${platform}`,
  };
}).sort((a, b) => a.platform.localeCompare(b.platform) || a.rank - b.rank);

export const publicPlayers: PublicPlayer[] = Object.values(detailed).flatMap((entry) => {
  const platform = entry.metadata.platform;
  const rawClubId = entry.metadata.clubId;
  const clubId = routeClubId(platform, rawClubId);
  return (entry.player_stats?.members ?? []).filter((member) => member.name?.trim()).map((member, index) => {
    const name = cleanText(member.name);
    const matches = numeric(member.gamesPlayed);
    const goals = numeric(member.goals);
    const assists = numeric(member.assists);
    return {
      id: `ea-${platform}-${rawClubId}-${slug(name)}-${index}`, name, position: cleanText(member.favoritePosition) || "—", matches, goals, assists, goalContributions: goals + assists, averageRating: numeric(member.ratingAve) || null, cleanSheets: 0, overallRating: null, passesMade: null, passSuccessRate: null, tacklesMade: null, tackleSuccessRate: null, winRate: null, clubId, clubName: cleanText(entry.metadata.clubName), platform, manOfTheMatch: numeric(member.manOfTheMatch), statsReliable: matches === 0 ? goals === 0 : goals <= matches * 5 && assists <= matches * 5, sourceUrl: `https://www.ea.com/pt-br/games/ea-sports-fc/clubs/member-list?clubId=${rawClubId}&platform=${platform}`,
    };
  });
});

export const publicClubRosterTotals = new Map(Object.values(detailed).map((entry) => [routeClubId(entry.metadata.platform, entry.metadata.clubId), { assists: (entry.player_stats?.members ?? []).reduce((total, player) => total + numeric(player.assists), 0) }]));
export function findPublicClub(id: string) { return publicClubs.find((club) => club.id === id); }
export function findPublicPlayer(id: string) { return publicPlayers.find((player) => player.id === id); }
