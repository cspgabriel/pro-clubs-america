import { apiError, assertSameOrigin, canonicalOrigin, formBody, stripeRequest, verifyFirebaseRequest, type FunctionContext } from "../../_lib/billing";

interface StripeList<T> { data: T[] }
interface StripeCustomer { id: string }
interface PortalSession { url: string }

export const onRequestPost = async ({ request, env }: FunctionContext) => {
  try {
    assertSameOrigin(request, env.SITE_URL);
    const user = await verifyFirebaseRequest(request, env);
    const query = new URLSearchParams({ query: `metadata['firebase_uid']:'${user.uid}'`, limit: "1" });
    const customers = await stripeRequest<StripeList<StripeCustomer>>(env, `/customers/search?${query}`);
    const customer = customers.data[0];
    if (!customer) return apiError("Nenhuma assinatura Stripe foi encontrada para esta conta.", 404);
    const session = await stripeRequest<PortalSession>(env, "/billing_portal/sessions", {
      method: "POST",
      body: formBody({ customer: customer.id, return_url: `${canonicalOrigin(request, env.SITE_URL)}/conta/` }),
    });
    return Response.json({ url: session.url }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PORTAL_FAILED";
    const status = message.startsWith("AUTH_") ? 401 : message === "ORIGIN_NOT_ALLOWED" ? 403 : 500;
    return apiError(status === 500 ? "Não foi possível abrir a gestão da assinatura." : message, status);
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
