import { apiError, assertSameOrigin, verifyFirebaseRequest, type FunctionContext } from "../../_lib/billing";
import { matchPayload, resolveClubRoute, type MatchRow } from "../../_lib/community";
import { ensureProfile, findClubById, supabaseRest } from "../../_lib/supabase";
import { sendPushToProfiles } from "../../_lib/push";

export const onRequestGet = async ({ env }: FunctionContext) => {
  try {
    const rows = await supabaseRest<MatchRow[]>(env, "matches?match_type=eq.Friendly&order=created_at.desc&limit=100");
    return Response.json(await Promise.all(rows.map((row) => matchPayload(env, row))), { headers: { "cache-control": "no-store" } });
  } catch {
    return apiError("Não foi possível carregar as partidas.", 500);
  }
};

export const onRequestPost = async ({ request, env, waitUntil }: FunctionContext) => {
  try {
    assertSameOrigin(request, env.SITE_URL);
    const identity = await verifyFirebaseRequest(request, env);
    const profile = await ensureProfile(env, identity, identity.name);
    const body = await request.json() as { hostClubId?: string; mode?: "open" | "invite"; date?: string; time?: string; region?: string; invitedClubId?: string };
    if (!profile.club_id) return apiError("Cadastre ou vincule seu clube em /cadastro antes de publicar um desafio.", 403);
    if (!['owner', 'captain', 'admin'].includes(profile.role)) return apiError("Somente dono ou capitão do clube pode publicar um desafio.", 403);
    const home = await findClubById(env, profile.club_id);
    if (!home) return apiError("Clube vinculado não encontrado no catálogo.", 404);
    const requestedHost = body.hostClubId ? await resolveClubRoute(env, String(body.hostClubId)) : home;
    if (requestedHost && requestedHost.id !== home.id && !["owner", "captain", "admin"].includes(profile.role)) {
      return apiError("Você só pode criar desafios em nome do seu clube vinculado.", 403);
    }
    const mode = body.mode === "invite" ? "invite" : "open";
    const invited = mode === "invite" ? await resolveClubRoute(env, String(body.invitedClubId || "")) : null;
    if (mode === "invite" && !invited) return apiError("Clube convidado inválido.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.date)) || !/^\d{2}:\d{2}$/.test(String(body.time))) return apiError("Data ou horário inválido.");
    const rows = await supabaseRest<MatchRow[]>(env, "matches", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ home_club_id: home.id, invited_club_id: invited?.id || null, creator_profile_id: profile.id, match_type: "Friendly", status: "open_challenge", challenge_mode: mode, scheduled_date: body.date, scheduled_time: body.time, region: String(body.region || "Brasil").slice(0, 80), featured: profile.plan !== "free", scheduled_at: `${body.date}T${body.time}:00-03:00`, updated_at: new Date().toISOString() }),
    });
    if (invited) {
      const recipients = await supabaseRest<Array<{ id: string }>>(env, `profiles?club_id=eq.${encodeURIComponent(invited.id)}&role=in.(owner,captain)&select=id`);
      waitUntil(sendPushToProfiles(env, recipients.map((item) => item.id), { title: "Novo desafio recebido", body: `${home.name} convidou seu clube para um amistoso.`, url: `/partida/${rows[0].id}/`, tag: `match-${rows[0].id}` }));
    }
    return Response.json(await matchPayload(env, rows[0]), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MATCH_CREATE_FAILED";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível criar o desafio.", message.startsWith("AUTH_") ? 401 : 500);
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
