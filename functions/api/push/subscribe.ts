import { apiError, assertSameOrigin, verifyFirebaseRequest, type FunctionContext } from "../../_lib/billing";
import { ensureProfile, supabaseRest } from "../../_lib/supabase";

export const onRequestPost = async ({ request, env }: FunctionContext) => {
  try {
    assertSameOrigin(request, env.SITE_URL);
    const identity = await verifyFirebaseRequest(request, env);
    const profile = await ensureProfile(env, identity, identity.name);
    const body = await request.json() as { endpoint?: string; expirationTime?: number | null; keys?: { p256dh?: string; auth?: string } };
    if (!body.endpoint?.startsWith("https://") || !body.keys?.p256dh || !body.keys.auth) return apiError("Assinatura de notificação inválida.");
    await supabaseRest(env, "push_subscriptions?on_conflict=endpoint", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ profile_id: profile.id, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth, expiration_time: body.expirationTime ? new Date(body.expirationTime).toISOString() : null, user_agent: request.headers.get("user-agent")?.slice(0, 500), updated_at: new Date().toISOString() }),
    });
    return Response.json({ subscribed: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PUSH_SUBSCRIBE_FAILED";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível ativar as notificações.", message.startsWith("AUTH_") ? 401 : 500);
  }
};

export const onRequestDelete = async ({ request, env }: FunctionContext) => {
  try {
    assertSameOrigin(request, env.SITE_URL);
    const identity = await verifyFirebaseRequest(request, env);
    const profile = await ensureProfile(env, identity, identity.name);
    const body = await request.json() as { endpoint?: string };
    if (body.endpoint) await supabaseRest(env, `push_subscriptions?profile_id=eq.${profile.id}&endpoint=eq.${encodeURIComponent(body.endpoint)}`, { method: "DELETE" });
    return Response.json({ subscribed: false });
  } catch { return apiError("Não foi possível desativar as notificações.", 500); }
};
