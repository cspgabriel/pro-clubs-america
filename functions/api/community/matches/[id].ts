import { apiError, assertSameOrigin, verifyFirebaseRequest, type FunctionContext } from "../../../_lib/billing";
import { matchPayload, type MatchRow } from "../../../_lib/community";
import { ensureProfile, supabaseRest } from "../../../_lib/supabase";

type MatchContext = FunctionContext & { params: { id: string } };

export const onRequestGet = async ({ env, params }: MatchContext) => {
  try {
    const rows = await supabaseRest<MatchRow[]>(env, `matches?id=eq.${encodeURIComponent(params.id)}&limit=1`);
    return rows[0] ? Response.json(await matchPayload(env, rows[0])) : apiError("Partida não encontrada.", 404);
  } catch { return apiError("Não foi possível carregar a partida.", 500); }
};

export const onRequestPatch = async ({ request, env, params }: MatchContext) => {
  try {
    assertSameOrigin(request, env.SITE_URL);
    const identity = await verifyFirebaseRequest(request, env);
    const profile = await ensureProfile(env, identity, identity.name);
    if (!profile.club_id || !["owner", "captain"].includes(profile.role)) return apiError("CLUB_PERMISSION_REQUIRED", 403);
    const current = (await supabaseRest<MatchRow[]>(env, `matches?id=eq.${encodeURIComponent(params.id)}&limit=1`))[0];
    if (!current) return apiError("Partida não encontrada.", 404);
    const body = await request.json() as { action?: "accept" | "played" };
    let update: Record<string, unknown>;
    if (body.action === "accept") {
      if (current.status !== "open_challenge" || current.home_club_id === profile.club_id || (current.challenge_mode === "invite" && current.invited_club_id !== profile.club_id)) return apiError("Este desafio não pode ser aceito por seu clube.", 409);
      update = { away_club_id: profile.club_id, accepted_by_profile_id: profile.id, status: "accepted", updated_at: new Date().toISOString() };
    } else if (body.action === "played") {
      if (current.status !== "accepted" || ![current.home_club_id, current.away_club_id].includes(profile.club_id)) return apiError("CLUB_PERMISSION_REQUIRED", 403);
      update = { status: "waiting_ea_verification", played_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    } else return apiError("Ação inválida.");
    const rows = await supabaseRest<MatchRow[]>(env, `matches?id=eq.${encodeURIComponent(params.id)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(update) });
    if (body.action === "played") {
      const clubIds = [current.home_club_id, current.away_club_id].filter(Boolean);
      await Promise.all(clubIds.map((clubId) => supabaseRest(env, "ea_crawl_queue?on_conflict=club_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ club_id: clubId, priority: 90, status: "queued", next_run_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }) })));
    }
    return Response.json(await matchPayload(env, rows[0]));
  } catch (error) {
    const message = error instanceof Error ? error.message : "MATCH_UPDATE_FAILED";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível atualizar a partida.", message.startsWith("AUTH_") ? 401 : 500);
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
