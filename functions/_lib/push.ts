import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";
import type { BillingEnv } from "./billing";
import { supabaseRest } from "./supabase";

interface StoredSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export function pushConfigured(env: BillingEnv) {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
}

export async function sendPushToProfiles(env: BillingEnv, profileIds: string[], notification: { title: string; body: string; url: string; tag?: string }) {
  if (!pushConfigured(env) || !profileIds.length) return;
  const unique = [...new Set(profileIds)];
  const subscriptions = await supabaseRest<StoredSubscription[]>(env, `push_subscriptions?profile_id=in.(${unique.map(encodeURIComponent).join(",")})&select=id,endpoint,p256dh,auth`);
  await Promise.allSettled(subscriptions.map(async (item) => {
    const subscription: PushSubscription = { endpoint: item.endpoint, expirationTime: null, keys: { p256dh: item.p256dh, auth: item.auth } };
    const payload = await buildPushPayload({ data: JSON.stringify(notification), options: { ttl: 3600 } }, subscription, {
      subject: env.VAPID_SUBJECT!, publicKey: env.VAPID_PUBLIC_KEY!, privateKey: env.VAPID_PRIVATE_KEY!,
    });
    const body = new Uint8Array(payload.body.byteLength);
    body.set(payload.body);
    const response = await fetch(item.endpoint, { ...payload, body: body.buffer });
    if (response.status === 404 || response.status === 410) {
      await supabaseRest(env, `push_subscriptions?id=eq.${encodeURIComponent(item.id)}`, { method: "DELETE" });
    }
  }));
}
