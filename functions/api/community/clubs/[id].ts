import { apiError, type FunctionContext } from "../../../_lib/billing";
import { findClubByPublicRouteId, publicRouteId, supabaseRest } from "../../../_lib/supabase";

type ClubContext = FunctionContext & { params: { id: string } };

interface ClubMemberRow {
  id: string;
  full_name: string | null;
  role: string;
  country_slug: string | null;
  avatar_url: string | null;
  player_id: string | null;
}

interface PlayerRow {
  id: string;
  gamertag: string;
  favorite_position: string;
  rating: number;
}

export const onRequestGet = async ({ env, params }: ClubContext) => {
  try {
    const club = await findClubByPublicRouteId(env, params.id);
    if (!club) return apiError("Clube não encontrado.", 404);

    const profiles = await supabaseRest<ClubMemberRow[]>(env, `profiles?club_id=eq.${encodeURIComponent(club.id)}&select=id,full_name,role,country_slug,avatar_url,player_id&order=created_at.asc&limit=100`);
    const members = await Promise.all(profiles.map(async (profile) => {
      const player = profile.player_id
        ? (await supabaseRest<PlayerRow[]>(env, `players?id=eq.${encodeURIComponent(profile.player_id)}&select=id,gamertag,favorite_position,rating&limit=1`))[0]
        : null;
      return {
        id: profile.id,
        name: profile.full_name || "Jogador",
        role: profile.role,
        country: profile.country_slug || "brasil",
        avatarUrl: profile.avatar_url || undefined,
        player: player ? { id: player.id, name: player.gamertag, position: player.favorite_position, overall: player.rating } : undefined,
      };
    }));

    return Response.json({
      id: publicRouteId(club),
      name: club.name,
      platform: club.platform,
      verified: club.verified,
      members,
    }, { headers: { "cache-control": "public, max-age=60" } });
  } catch {
    return apiError("Não foi possível carregar o clube.", 500);
  }
};
