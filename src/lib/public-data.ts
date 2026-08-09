import rankingsJson from "../../data/pro_clubs_rankings_all_time.json";
import rostersJson from "../../data/pro_clubs_top_teams_players.json";
import type { PlayerRanking } from "@/types/domain";

interface RawClub {
  rank: number;
  skillRating: string;
  wins: string;
  ties: string;
  losses: string;
  gamesPlayed: string;
  goals: string;
  goalsAgainst: string;
  cleanSheets: string;
  goalsPerGame: string;
  clubName: string;
  clubId: string;
  currentDivision: string;
  bestDivision: string;
  platform: string;
  clubInfo?: { customKit?: { crestAssetId?: string; stadName?: string } };
}

interface RawRoster {
  platform: string;
  platform_name: string;
  club_id: string;
  club_name: string;
  rank: number;
  players: { members: Array<{ name: string; gamesPlayed: string; goals: string; assists: string; manOfTheMatch: string; ratingAve: string; favoritePosition: string }> };
}

const rankings = rankingsJson as unknown as Record<string, RawClub[]>;
const rosters = rostersJson as unknown as Record<string, RawRoster>;
const crestBase = "https://eafc24.content.easports.com/fifa/fltOnlineAssets/24B23FDE-7835-41C2-87A2-F453DFDB2E82/2024/fcweb/crests/256x256";
const numeric = (value: string | number | undefined) => Number(value ?? 0);
const slug = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "jogador";

export interface PublicClub {
  id: string;
  name: string;
  platform: string;
  rank: number;
  skillRating: number;
  wins: number;
  draws: number;
  losses: number;
  matches: number;
  goals: number;
  goalsAgainst: number;
  cleanSheets: number;
  goalsPerGame: number;
  winRate: number;
  currentDivision: number;
  bestDivision: number;
  crestUrl: string;
  stadium?: string;
  sourceUrl: string;
}

export interface PublicPlayer extends PlayerRanking {
  clubId: string;
  clubName: string;
  platform: string;
  manOfTheMatch: number;
  sourceUrl: string;
}

export const publicClubs: PublicClub[] = (rankings["common-gen5"] ?? []).map((club) => {
  const matches = numeric(club.gamesPlayed);
  const crestAssetId = club.clubInfo?.customKit?.crestAssetId;
  return { id: String(club.clubId), name: club.clubName, platform: club.platform, rank: numeric(club.rank), skillRating: numeric(club.skillRating), wins: numeric(club.wins), draws: numeric(club.ties), losses: numeric(club.losses), matches, goals: numeric(club.goals), goalsAgainst: numeric(club.goalsAgainst), cleanSheets: numeric(club.cleanSheets), goalsPerGame: numeric(club.goalsPerGame), winRate: matches ? Math.round(numeric(club.wins) / matches * 1000) / 10 : 0, currentDivision: numeric(club.currentDivision), bestDivision: numeric(club.bestDivision), crestUrl: crestAssetId ? `${crestBase}/l${crestAssetId}.png` : "/icon.svg", stadium: club.clubInfo?.customKit?.stadName, sourceUrl: `https://www.ea.com/pt-br/games/ea-sports-fc/clubs/overview?clubId=${club.clubId}&platform=${club.platform}` };
});

export const publicPlayers: PublicPlayer[] = Object.values(rosters).filter((club) => club.platform === "common-gen5").flatMap((club) => club.players.members.filter((member) => member.name.trim()).map((member, index) => ({ id: `ea-${club.platform}-${club.club_id}-${slug(member.name)}-${index}`, name: member.name, position: member.favoritePosition || "—", matches: numeric(member.gamesPlayed), goals: numeric(member.goals), assists: numeric(member.assists), goalContributions: numeric(member.goals) + numeric(member.assists), averageRating: numeric(member.ratingAve) || null, cleanSheets: 0, overallRating: null, passesMade: null, passSuccessRate: null, tacklesMade: null, tackleSuccessRate: null, winRate: null, clubId: club.club_id, clubName: club.club_name, platform: club.platform, manOfTheMatch: numeric(member.manOfTheMatch), sourceUrl: `https://www.ea.com/pt-br/games/ea-sports-fc/clubs/member-list?clubId=${club.club_id}&platform=${club.platform}` })));

export const publicClubRosterTotals = new Map(Object.values(rosters).filter((club) => club.platform === "common-gen5").map((club) => [club.club_id, { assists: club.players.members.reduce((total, player) => total + numeric(player.assists), 0) }]));

export function findPublicClub(id: string) { return publicClubs.find((club) => club.id === id); }
export function findPublicPlayer(id: string) { return publicPlayers.find((player) => player.id === id); }
