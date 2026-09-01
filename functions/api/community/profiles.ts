import { apiError, type FunctionContext } from "../../_lib/billing";
import { findClubById, publicRouteId, supabaseRest } from "../../_lib/supabase";

interface ProfileRow { id: string; full_name: string | null; role: string; country_slug: string | null; avatar_url: string | null; club_id: string | null; player_id: string | null; }
interface PlayerRow { id: string; gamertag: string; favorite_position: string; rating: number; }

export const onRequestGet = async (context: FunctionContext) => {
  try {
    const profiles = await supabaseRest<ProfileRow[]>(context.env, "profiles?select=id,full_name,role,country_slug,avatar_url,club_id,player_id&order=created_at.desc&limit=100");
    const members = await Promise.all(profiles.map(async (profile) => {
      const club = profile.club_id ? await findClubById(context.env, profile.club_id) : null;
      const player = profile.player_id ? (await supabaseRest<PlayerRow[]>(context.env, `players?id=eq.${encodeURIComponent(profile.player_id)}&select=id,gamertag,favorite_position,rating&limit=1`))[0] : null;
      return {
        id: profile.id,
        name: profile.full_name || "Jogador",
        role: profile.role,
        country: profile.country_slug || "brasil",
        avatarUrl: profile.avatar_url || undefined,
        club: club ? { id: publicRouteId(club), name: club.name } : undefined,
        player: player ? { name: player.gamertag, position: player.favorite_position, overall: player.rating } : undefined,
      };
    }));
    const clubCounts = new Map<string, number>();
    for (const profile of profiles) if (profile.club_id) clubCounts.set(profile.club_id, (clubCounts.get(profile.club_id) || 0) + 1);
    const clubs = (await Promise.all([...clubCounts.entries()].map(async ([clubId, memberCount]) => {
      const club = await findClubById(context.env, clubId);
      return club ? { id: publicRouteId(club), name: club.name, memberCount } : null;
    }))).filter((club): club is { id: string; name: string; memberCount: number } => Boolean(club));
    return Response.json({ members, clubs }, { headers: { "cache-control": "public, max-age=60" } });
  } catch { return apiError("Não foi possível carregar os perfis da comunidade.", 500); }
};

export const onRequest = () => apiError("Método não permitido.", 405);
