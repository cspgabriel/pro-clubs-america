import { apiError, assertSameOrigin, verifyFirebaseRequest, type FunctionContext } from "../../_lib/billing";
import { ensureProfile, supabaseRest } from "../../_lib/supabase";

interface DeletionRequestRow {
  id: string;
  status: "requested" | "processing" | "completed" | "cancelled";
  requested_at: string;
}

export const onRequestPost = async (context: FunctionContext) => {
  try {
    assertSameOrigin(context.request, context.env.SITE_URL);
    const identity = await verifyFirebaseRequest(context.request, context.env);
    const body = await context.request.json() as { confirm?: unknown };
    if (body.confirm !== true) return apiError("Confirme a solicitação de exclusão para continuar.");

    const profile = await ensureProfile(context.env, identity, identity.name);
    if (profile.stripe_subscription_id && ["active", "trialing", "past_due", "unpaid"].includes(profile.subscription_status || "")) {
      return apiError("Cancele sua assinatura em Minha conta antes de solicitar a exclusão.", 409);
    }
    const existing = (await supabaseRest<DeletionRequestRow[]>(context.env,
      `account_deletion_requests?firebase_uid=eq.${encodeURIComponent(identity.uid)}&status=in.(requested,processing)&order=requested_at.desc&limit=1`,
    ))[0];
    if (existing) return Response.json({ requested: true, requestId: existing.id, requestedAt: existing.requested_at, alreadyPending: true });

    const rows = await supabaseRest<DeletionRequestRow[]>(context.env, "account_deletion_requests", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ profile_id: profile.id, firebase_uid: identity.uid, email: profile.email }),
    });
    if (!rows[0]) throw new Error("ACCOUNT_DELETION_REQUEST_EMPTY");
    return Response.json({ requested: true, requestId: rows[0].id, requestedAt: rows[0].requested_at });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ACCOUNT_DELETION_REQUEST_FAILED";
    if (message.includes("account_deletion_requests_open_uid_key")) return Response.json({ requested: true, alreadyPending: true });
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível registrar sua solicitação de exclusão.", message.startsWith("AUTH_") ? 401 : message === "ORIGIN_NOT_ALLOWED" ? 403 : 500);
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
