import { apiError, type FunctionContext } from "../../_lib/billing";
import { findClubByPublicRouteId, publicRouteId, supabaseRest, type SupabaseClub } from "../../_lib/supabase";
import type { ClubDataset, MatchRecord, PlayerMatchStats } from "../../../src/types/domain";

interface ClubRow extends SupabaseClub {
  games_played: number | null; wins: number | null; ties: number | null; losses: number | null;
  goals: number | null; goals_against: number | null; reputation_level: string | null;
  current_division: number | null; last_synced_at: string | null; source_payload: Record<string, unknown> | null;
}
interface PlayerRow {
  gamertag: string; favorite_position: string | null; games_played: number | null; rating: number | null;
  goals: number | null; assists: number | null; passes_made: number | null; pass_success_rate: number | null;
  tackles_made: number | null; tackle_success_rate: number | null; clean_sheets_def: number | null;
  clean_sheets_gk: number | null; man_of_the_match: number | null; win_rate: number | null;
  source_payload: { member?: Record<string, unknown>; observedAt?: string } | null;
}
interface SnapshotRow {
  id: string; source_match_id: string | null; mode: MatchRecord["mode"]; played_at: string;
  home_ea_club_id: string; away_ea_club_id: string; home_club_name: string; away_club_name: string;
  home_score: number; away_score: number; competition: string; source_url: string; players: PlayerMatchStats[];
}
const value = (input: unknown) => input == null || input === "" || !Number.isFinite(Number(input)) ? undefined : Number(input);
const record = (input: unknown): Record<string, unknown> => input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
const position = (input: unknown) => ({ goalkeeper: "Goleiro", defender: "Defensor", midfielder: "Meio-campo", forward: "Atacante" }[String(input).toLowerCase()] || String(input || "—"));

export const onRequestGet = async ({ request, env }: FunctionContext) => {
  const id = new URL(request.url).searchParams.get("clubId") || "";
  if (!/^(?:(?:common-gen4|nx)-)?\d{1,12}$/.test(id)) return apiError("Clube inválido.");
  try {
    const club = await findClubByPublicRouteId(env, id) as ClubRow | null;
    if (!club) return apiError("Clube não encontrado na base.", 404);
    const [players, snapshots] = await Promise.all([
      supabaseRest<PlayerRow[]>(env, `players?club_id=eq.${encodeURIComponent(club.id)}&order=games_played.desc&limit=100`),
      supabaseRest<SnapshotRow[]>(env, `ea_match_snapshots?platform=eq.${encodeURIComponent(club.platform)}&or=(home_club_id.eq.${club.id},away_club_id.eq.${club.id})&order=played_at.desc,observed_at.desc&limit=150`),
    ]);
    const source = club.source_payload || {};
    const stats = record(source.overallStats);
    const memberNames = Array.isArray(source.memberNames) ? new Set(source.memberNames.map(String)) : null;
    const roster = memberNames ? players.filter((player) => memberNames.has(player.gamertag)) : players;
    const info = record(record(source.info)[club.ea_club_id]);
    const custom = record(info.customKit);
    const badge = String(custom.crestAssetId || "");
    const routeId = (eaId: string) => club.platform === "common-gen5" ? eaId : `${club.platform}-${eaId}`;
    const seen = new Set<string>();
    const matches: MatchRecord[] = [];
    for (const row of snapshots) {
      const teams = [`${row.home_ea_club_id}:${row.home_score}`, `${row.away_ea_club_id}:${row.away_score}`].sort().join("|");
      const key = `${row.mode}:${row.played_at}:${teams}`;
      const sourceKey = row.source_match_id ? `${row.mode}:${row.source_match_id}` : key;
      if (seen.has(key) || seen.has(sourceKey)) continue;
      seen.add(key);
      seen.add(sourceKey);
      matches.push({
        id: row.id, mode: row.mode, playedAt: row.played_at, homeClubId: routeId(row.home_ea_club_id), awayClubId: routeId(row.away_ea_club_id),
        homeClubName: row.home_club_name, awayClubName: row.away_club_name, homeScore: row.home_score, awayScore: row.away_score,
        competition: row.competition, sourceUrl: row.source_url,
        players: (Array.isArray(row.players) ? row.players : []).filter((player) => player.clubId ? player.clubId === club.ea_club_id : roster.some((member) => member.gamertag === player.playerName)).map((player) => ({ ...player, clubId: id })),
      });
    }
    const data: ClubDataset = {
      club: {
        id: publicRouteId(club), name: club.name, platform: club.platform, sourceUrl: club.ea_url,
        crestUrl: /^\d+$/.test(badge) ? `https://eafc24.content.easports.com/fifa/fltOnlineAssets/24B23FDE-7835-41C2-87A2-F453DFDB2E82/2024/fcweb/crests/256x256/l${badge}.png` : undefined,
        overview: club.games_played == null ? undefined : {
          skillRating: club.skill_rating, reputation: club.reputation_level || "", wins: club.wins ?? 0, draws: club.ties ?? 0,
          losses: club.losses ?? 0, totalMatches: club.games_played, goalsFor: club.goals ?? 0, goalsAgainst: club.goals_against ?? 0,
          leagueAppearances: value(stats.leagueAppearances) ?? 0, playoffAppearances: value(stats.playoffAppearances) ?? 0,
          members: roster.length, midfielders: 0, forwards: 0, defenders: 0, goalkeepers: 0,
          currentDivision: club.current_division ?? undefined, promotions: value(stats.promotions), relegations: value(stats.relegations),
        },
      },
      source: { state: club.last_synced_at ? "partial" : "pending", fetchedAt: club.last_synced_at, note: `Base sincronizada com a EA. ${matches.length} partidas detalhadas armazenadas neste recorte; não representam todo o histórico de carreira.` },
      players: roster.map((player) => {
        const member = player.source_payload?.member || {};
        const overall = value(member.proOverall ?? member.proOverallStr);
        return {
          id: player.gamertag, name: player.gamertag, position: position(player.favorite_position),
          gamesPlayed: value(player.games_played), goals: value(player.goals), assists: value(player.assists),
          averageRating: value(player.rating), overallRating: overall != null && overall >= 20 && overall <= 99 ? overall : undefined,
          passesMade: value(player.passes_made), passSuccessRate: value(player.pass_success_rate),
          tacklesMade: value(player.tackles_made), tackleSuccessRate: value(player.tackle_success_rate),
          cleanSheets: (player.clean_sheets_def ?? 0) + (player.clean_sheets_gk ?? 0), winRate: value(member.winRate),
          manOfTheMatch: value(player.man_of_the_match), redCards: value(member.redCards), shotSuccessRate: value(member.shotSuccessRate),
        };
      }),
      matches,
    };
    return Response.json(data, { headers: { "cache-control": "public, max-age=30" } });
  } catch {
    return apiError("As estatísticas estão indisponíveis agora. Tente novamente.", 503);
  }
};
