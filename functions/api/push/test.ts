import { apiError, assertSameOrigin, verifyFirebaseRequest, type FunctionContext } from "../../_lib/billing";
import { sendPushToProfiles } from "../../_lib/push";
import { ensureProfile } from "../../_lib/supabase";

export const onRequestPost = async ({ request, env, waitUntil }: FunctionContext) => {
  try {
    assertSameOrigin(request, env.SITE_URL);
    const identity = await verifyFirebaseRequest(request, env);
    const profile = await ensureProfile(env, identity, identity.name);
    waitUntil(sendPushToProfiles(env, [profile.id], { title: "Pro Clubs America", body: "Notificações ativadas. Você receberá novidades de partidas e do seu clube.", url: "/inicio/", tag: "push-enabled" }));
    return Response.json({ sent: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PUSH_TEST_FAILED";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível enviar a notificação.", message.startsWith("AUTH_") ? 401 : 500);
  }
};
