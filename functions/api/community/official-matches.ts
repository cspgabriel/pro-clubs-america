import { apiError, type FunctionContext } from "../../_lib/billing";
import { publicRouteId, supabaseRest, type SupabaseClub } from "../../_lib/supabase";
import { repairPublicText } from "../../_lib/text";

interface SnapshotRow { id: string; mode: "leagueMatch" | "friendlyMatch" | "playoffMatch"; played_at: string; home_ea_club_id: string; home_club_id: string | null; home_club_name: string; away_ea_club_id: string; away_club_id: string | null; away_club_name: string; home_score: number; away_score: number; competition: string; source_url: string; players: unknown[]; platform: string; }

export const onRequestGet = async ({ request, env }: FunctionContext) => {
  try {
    const url = new URL(request.url); const id = url.searchParams.get("id");
    const path = id ? `ea_match_snapshots?id=eq.${encodeURIComponent(id)}&limit=1` : "ea_match_snapshots?order=played_at.desc&limit=100";
    const rows = await supabaseRest<SnapshotRow[]>(env, path);
    const clubIds = [...new Set(rows.flatMap((row) => [row.home_club_id, row.away_club_id]).filter(Boolean))] as string[];
    const clubs = clubIds.length ? await supabaseRest<SupabaseClub[]>(env, `clubs?id=in.(${clubIds.join(",")})`) : [];
    const byId = new Map(clubs.map((club) => [club.id, club]));
    const payload = rows.map((row) => ({ id: row.id, mode: row.mode, playedAt: row.played_at, homeClubId: row.home_club_id && byId.get(row.home_club_id) ? publicRouteId(byId.get(row.home_club_id)!) : row.home_ea_club_id, homeClubName: repairPublicText(row.home_club_name), awayClubId: row.away_club_id && byId.get(row.away_club_id) ? publicRouteId(byId.get(row.away_club_id)!) : row.away_ea_club_id, awayClubName: repairPublicText(row.away_club_name), homeScore: row.home_score, awayScore: row.away_score, competition: repairPublicText(row.competition), sourceUrl: row.source_url, players: Array.isArray(row.players) ? row.players : [] }));
    if (id && !payload[0]) return apiError("Partida oficial não encontrada.", 404);
    return Response.json(id ? payload[0] : payload, { headers: { "cache-control": "public, max-age=30" } });
  } catch { return apiError("Não foi possível carregar o histórico oficial.", 500); }
};

export const onRequest = () => apiError("Método não permitido.", 405);
