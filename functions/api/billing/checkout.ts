import { apiError, assertSameOrigin, canonicalOrigin, formBody, resolvePrice, stripeRequest, verifyFirebaseRequest, type FunctionContext, type PaidEntitlement } from "../../_lib/billing";

interface CheckoutBody { entitlement?: PaidEntitlement; cadence?: "monthly" | "annual" }
interface CheckoutSession { id: string; url: string | null }

export const onRequestPost = async ({ request, env }: FunctionContext) => {
  try {
    assertSameOrigin(request, env.SITE_URL);
    const user = await verifyFirebaseRequest(request, env);
    const body = await request.json() as CheckoutBody;
    if (!body.entitlement || !body.cadence) return apiError("Plano inválido.");
    const price = resolvePrice(env, body.entitlement, body.cadence);
    const origin = canonicalOrigin(request, env.SITE_URL);
    const session = await stripeRequest<CheckoutSession>(env, "/checkout/sessions", {
      method: "POST",
      body: formBody({
        mode: "subscription",
        "line_items[0][price]": price,
        "line_items[0][quantity]": "1",
        customer_email: user.email || undefined,
        client_reference_id: user.uid,
        "metadata[firebase_uid]": user.uid,
        "metadata[entitlement]": body.entitlement,
        "subscription_data[metadata][firebase_uid]": user.uid,
        "subscription_data[metadata][entitlement]": body.entitlement,
        allow_promotion_codes: true,
        billing_address_collection: "auto",
        success_url: `${origin}/conta/?checkout=sucesso&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/planos/?checkout=cancelado`,
      }),
    });
    if (!session.url) return apiError("O Stripe não retornou a URL de pagamento.", 502);
    return Response.json({ url: session.url }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CHECKOUT_FAILED";
    const status = message.startsWith("AUTH_") ? 401 : message === "ORIGIN_NOT_ALLOWED" ? 403 : 500;
    console.error(JSON.stringify({ event: "billing_checkout_failed", reason: message, status }));
    return apiError(status === 500 ? "Não foi possível iniciar o pagamento." : message, status);
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
