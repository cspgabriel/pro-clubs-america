import { apiError, type FunctionContext } from "../../../_lib/billing";
import { findClubById, publicRouteId, supabaseRest } from "../../../_lib/supabase";

type ProfileContext = FunctionContext & { params: { id: string } };
interface PublicProfile { id: string; full_name: string | null; role: string; country_slug: string | null; avatar_url: string | null; club_id: string | null; player_id: string | null; }
interface PublicPlayer { gamertag: string; favorite_position: string; rating: number; games_played: number; goals: number; assists: number; tackles_made: number; win_rate: number; }

export const onRequestGet = async ({ env, params }: ProfileContext) => {
  try {
    const profile = (await supabaseRest<PublicProfile[]>(env, `profiles?id=eq.${encodeURIComponent(params.id)}&select=id,full_name,role,country_slug,avatar_url,club_id,player_id&limit=1`))[0];
    if (!profile) return apiError("Perfil não encontrado.", 404);
    const club = profile.club_id ? await findClubById(env, profile.club_id) : null;
    const player = profile.player_id ? (await supabaseRest<PublicPlayer[]>(env, `players?id=eq.${encodeURIComponent(profile.player_id)}&select=gamertag,favorite_position,rating,games_played,goals,assists,tackles_made,win_rate&limit=1`))[0] : null;
    return Response.json({ id: profile.id, name: profile.full_name || "Jogador", role: profile.role, country: profile.country_slug || "brasil", avatarUrl: profile.avatar_url, club: club ? { id: publicRouteId(club), name: club.name } : null, player: player ? { id: player.gamertag, name: player.gamertag, position: player.favorite_position, overall: player.rating, matches: player.games_played, goals: player.goals, assists: player.assists, tackles: player.tackles_made, winRate: player.win_rate } : null }, { headers: { "cache-control": "public, max-age=60" } });
  } catch { return apiError("Não foi possível carregar o perfil.", 500); }
};
