import { apiError, assertSameOrigin, verifyFirebaseRequest, type FunctionContext } from "../../_lib/billing";
import { ensureProfile, findClubByEa, publicRouteId, supabaseRest, type SupabaseProfile } from "../../_lib/supabase";

interface PlayerRow { id: string; gamertag: string; club_id: string; games_played: number; goals: number; assists: number; tackles_made: number; }

function parseEaUrl(value: string) {
  try {
    const url = new URL(value);
    const validHost = ["ea.com", "www.ea.com"].includes(url.hostname);
    const validPath = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?games\/ea-sports-fc\/clubs\/(?:overview|member-list)$/.test(url.pathname);
    const clubId = url.searchParams.get("clubId") || "";
    const platform = url.searchParams.get("platform") || "";
    return validHost && validPath && /^\d+$/.test(clubId) && platform ? { clubId, platform } : null;
  } catch { return null; }
}

export const onRequestPost = async ({ request, env }: FunctionContext) => {
  try {
    assertSameOrigin(request, env.SITE_URL);
    const identity = await verifyFirebaseRequest(request, env);
    const profile = await ensureProfile(env, identity, identity.name);
    const body = await request.json() as { eaUrl?: string; gamertag?: string };
    const parsed = parseEaUrl(String(body.eaUrl || ""));
    const gamertag = String(body.gamertag || "").trim();
    if (!parsed || !gamertag) return apiError("Informe o link oficial do elenco EA e o nome exato do jogador.");
    const club = await findClubByEa(env, parsed.platform, parsed.clubId);
    if (!club) return apiError("Este clube ainda não está indexado na comunidade.", 404);
    const player = (await supabaseRest<PlayerRow[]>(env, `players?club_id=eq.${encodeURIComponent(club.id)}&gamertag=ilike.${encodeURIComponent(gamertag)}&select=id,gamertag,club_id,games_played,goals,assists,tackles_made&limit=1`))[0];
    if (!player) return apiError("Jogador não encontrado no elenco oficial indexado.", 404);
    const linked = await supabaseRest<Array<{ id: string }>>(env, `profiles?player_id=eq.${encodeURIComponent(player.id)}&id=neq.${encodeURIComponent(profile.id)}&select=id&limit=1`);
    if (linked.length) return apiError("Este jogador já está vinculado a outra conta.", 409);
    await supabaseRest<SupabaseProfile[]>(env, `profiles?id=eq.${encodeURIComponent(profile.id)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ player_id: player.id, club_id: profile.club_id || club.id, role: profile.role === "visitor" ? "player" : profile.role, updated_at: new Date().toISOString() }) });
    return Response.json({ playerId: player.gamertag, playerName: player.gamertag, clubId: publicRouteId(club), clubName: club.name, matches: player.games_played, goals: player.goals, assists: player.assists, tackles: player.tackles_made });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PLAYER_LINK_FAILED";
    const status = message.startsWith("AUTH_") ? 401 : message === "ORIGIN_NOT_ALLOWED" ? 403 : 500;
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível vincular o jogador.", status);
  }
};
