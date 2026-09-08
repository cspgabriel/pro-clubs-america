import { apiError, assertSameOrigin, verifyFirebaseRequest, type FunctionContext } from "../../_lib/billing";
import { ensureProfile, supabaseRest } from "../../_lib/supabase";

type SafetyAction = "report" | "block";
type SafetyReason = "abuse" | "offensive_content" | "spam" | "other";

interface ProfileRow { id: string; }

export const onRequestPost = async ({ request, env }: FunctionContext) => {
  try {
    assertSameOrigin(request, env.SITE_URL);
    const identity = await verifyFirebaseRequest(request, env);
    const profile = await ensureProfile(env, identity, identity.name);
    const body = await request.json() as { action?: SafetyAction; targetProfileId?: string; reason?: SafetyReason };
    const action = body.action;
    const targetProfileId = String(body.targetProfileId || "");
    if (!action || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetProfileId)) return apiError("Perfil inválido.", 400);
    if (targetProfileId === profile.id) return apiError("Você não pode executar esta ação no próprio perfil.", 400);
    const target = (await supabaseRest<ProfileRow[]>(env, `profiles?id=eq.${encodeURIComponent(targetProfileId)}&select=id&limit=1`))[0];
    if (!target) return apiError("Perfil não encontrado.", 404);

    if (action === "report") {
      const reason = body.reason;
      if (!reason || !["abuse", "offensive_content", "spam", "other"].includes(reason)) return apiError("Selecione o motivo da denúncia.", 400);
      await supabaseRest(env, "community_safety_reports", {
        method: "POST",
        body: JSON.stringify({ reporter_profile_id: profile.id, target_profile_id: targetProfileId, reason }),
      });
      return Response.json({ reported: true }, { status: 201 });
    }

    if (action === "block") {
      await supabaseRest(env, "community_profile_blocks?on_conflict=blocker_profile_id,blocked_profile_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ blocker_profile_id: profile.id, blocked_profile_id: targetProfileId }),
      });
      await supabaseRest(env, `friendships?or=(and(user_id.eq.${encodeURIComponent(profile.id)},friend_id.eq.${encodeURIComponent(targetProfileId)}),and(user_id.eq.${encodeURIComponent(targetProfileId)},friend_id.eq.${encodeURIComponent(profile.id)}))`, { method: "DELETE" });
      return Response.json({ blocked: true });
    }

    return apiError("Ação inválida.", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "SAFETY_ACTION_FAILED";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível concluir a ação de segurança.", message.startsWith("AUTH_") ? 401 : 500);
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
