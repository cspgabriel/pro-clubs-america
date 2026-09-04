import { apiError, type FunctionContext } from "../../../_lib/billing";
import { findClubById, publicRouteId, supabaseRest } from "../../../_lib/supabase";
import { nicknamePattern, normalizeNickname } from "../../../../src/lib/player-identity";

type ProfileContext = FunctionContext & { params: { id: string } };
interface PublicProfile { id: string; full_name: string | null; role: string; country_slug: string | null; avatar_url: string | null; club_id: string | null; player_id: string | null; nickname: string | null; gaming_platform: string | null; preferred_position: string | null; looking_for_club: boolean; }
interface PublicPlayer { gamertag: string; favorite_position: string; rating: number; games_played: number; goals: number; assists: number; tackles_made: number; win_rate: number; }
interface ShowcaseRow { overall: number | null; positions: string[] | null; archetypes: string[] | null; photo_urls: string[] | null; youtube_urls: string[] | null; }

export const onRequestGet = async ({ env, params }: ProfileContext) => {
  try {
    const id = normalizeNickname(params.id);
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);
    if (!uuid && !nicknamePattern.test(id)) return apiError("Perfil inválido.");
    const profile = (await supabaseRest<PublicProfile[]>(env, `profiles?${uuid ? "id" : "nickname"}=eq.${encodeURIComponent(id)}&select=id,full_name,role,country_slug,avatar_url,club_id,player_id,nickname,gaming_platform,preferred_position,looking_for_club&limit=1`))[0];
    if (!profile) return apiError("Perfil não encontrado.", 404);
    const club = profile.club_id ? await findClubById(env, profile.club_id) : null;
    const player = profile.player_id ? (await supabaseRest<PublicPlayer[]>(env, `players?id=eq.${encodeURIComponent(profile.player_id)}&select=gamertag,favorite_position,rating,games_played,goals,assists,tackles_made,win_rate&limit=1`))[0] : null;
    const showcase = (await supabaseRest<ShowcaseRow[]>(env, `profile_showcases?profile_id=eq.${encodeURIComponent(profile.id)}&select=overall,positions,archetypes,photo_urls,youtube_urls&limit=1`))[0];
    return Response.json({ id: profile.id, nickname: profile.nickname, gamingPlatform: profile.gaming_platform, preferredPosition: profile.preferred_position, lookingForClub: profile.looking_for_club, name: profile.full_name || "Jogador", role: profile.role, country: profile.country_slug || "brasil", avatarUrl: profile.avatar_url, club: club ? { id: publicRouteId(club), name: club.name } : null, player: player ? { id: player.gamertag, name: player.gamertag, position: player.favorite_position, overall: player.rating, matches: player.games_played, goals: player.goals, assists: player.assists, tackles: player.tackles_made, winRate: player.win_rate } : null, showcase: { overall: showcase?.overall ?? null, positions: showcase?.positions ?? [], archetypes: showcase?.archetypes ?? [], photoUrls: showcase?.photo_urls ?? [], youtubeUrls: showcase?.youtube_urls ?? [] } }, { headers: { "cache-control": "no-store" } });
  } catch { return apiError("Não foi possível carregar o perfil.", 500); }
};
