import { apiError, entitlement, formBody, stripeRequest, updateSupabaseEntitlement, verifyStripeWebhook, type FunctionContext } from "../../_lib/billing";

interface StripeEvent { type: string; data: { object: StripeObject } }
interface StripeObject {
  id: string;
  status?: string;
  customer?: string;
  subscription?: string;
  client_reference_id?: string;
  metadata?: Record<string, string>;
}

const accessStatuses = new Set(["active", "trialing", "past_due"]);

export const onRequestPost = async ({ request, env }: FunctionContext) => {
  const rawBody = await request.text();
  if (!await verifyStripeWebhook(rawBody, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET)) return apiError("Assinatura de webhook inválida.", 400);

  try {
    const event = JSON.parse(rawBody) as StripeEvent;
    const object = event.data.object;
    let uid = object.metadata?.firebase_uid;
    let paidPlan = entitlement(object.metadata?.entitlement);
    const customerId = object.customer;
    let subscriptionId: string | undefined = object.id;
    let status = object.status ?? "active";

    if (event.type === "checkout.session.completed") {
      uid = object.client_reference_id ?? object.metadata?.firebase_uid;
      paidPlan = entitlement(object.metadata?.entitlement);
      subscriptionId = object.subscription;
      status = "active";
      if (uid && customerId) {
        await stripeRequest(env, `/customers/${encodeURIComponent(customerId)}`, {
          method: "POST",
          body: formBody({ "metadata[firebase_uid]": uid }),
        });
      }
    } else if (!event.type.startsWith("customer.subscription.")) {
      return Response.json({ received: true, ignored: true });
    }

    if (!uid || !paidPlan) return Response.json({ received: true, ignored: true });
    const hasAccess = accessStatuses.has(status) && event.type !== "customer.subscription.deleted";
    await updateSupabaseEntitlement(env, {
      uid,
      plan: hasAccess ? paidPlan : "free",
      customerId,
      subscriptionId,
      status,
    });
    return Response.json({ received: true });
  } catch {
    return apiError("Falha ao processar o evento.", 500);
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
