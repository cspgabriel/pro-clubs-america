export interface BillingEnv {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_PLAYER_PRO_MONTHLY: string;
  STRIPE_PRICE_PLAYER_PRO_ANNUAL: string;
  STRIPE_PRICE_CLUB_PRO_MONTHLY: string;
  FIREBASE_PROJECT_ID: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  EA_INGEST_SECRET?: string;
  SITE_URL?: string;
  VAPID_SUBJECT?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
}

export interface FunctionContext {
  request: Request;
  env: BillingEnv;
  waitUntil(promise: Promise<unknown>): void;
}

export interface FirebaseIdentity {
  uid: string;
  email?: string;
  name?: string;
}

export type PaidEntitlement = "player_pro" | "club_pro";

const stripeBaseUrl = "https://api.stripe.com/v1";
type FirebaseJsonWebKey = JsonWebKey & { kid?: string };
let cachedFirebaseKeys: { keys: FirebaseJsonWebKey[]; expiresAt: number } | null = null;

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" },
  });
}

export function apiError(message: string, status = 400) {
  return json({ error: message }, status);
}

export function assertSameOrigin(request: Request, siteUrl?: string) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const allowed = new Set([new URL(request.url).origin]);
  if (siteUrl) allowed.add(new URL(siteUrl).origin);
  if (!allowed.has(origin)) throw new Error("ORIGIN_NOT_ALLOWED");
}

export function canonicalOrigin(request: Request, configured?: string) {
  return configured ? new URL(configured).origin : new URL(request.url).origin;
}

export async function verifyFirebaseRequest(request: Request, env: BillingEnv): Promise<FirebaseIdentity> {
  const authorization = request.headers.get("authorization") ?? "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!idToken) throw new Error("AUTH_REQUIRED");
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("AUTH_INVALID");
  const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0]))) as { alg?: string; kid?: string };
  const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1]))) as {
    aud?: string; email?: string; exp?: number; iat?: number; iss?: string; name?: string; sub?: string;
  };
  const projectId = env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("AUTH_PROJECT_MISSING");
  const now = Math.floor(Date.now() / 1000);
  if (header.alg !== "RS256" || !header.kid || payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}` || !payload.sub || payload.sub.length > 128 || !payload.exp || payload.exp < now || !payload.iat || payload.iat > now + 60) throw new Error("AUTH_INVALID");

  if (!cachedFirebaseKeys || cachedFirebaseKeys.expiresAt < Date.now()) {
    const response = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
    if (!response.ok) throw new Error("AUTH_KEYS_UNAVAILABLE");
    const keySet = await response.json() as { keys?: FirebaseJsonWebKey[] };
    cachedFirebaseKeys = { keys: keySet.keys ?? [], expiresAt: Date.now() + 60 * 60 * 1000 };
  }
  const jwk = cachedFirebaseKeys.keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("AUTH_INVALID");
  const publicKey = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, decodeBase64Url(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!valid) throw new Error("AUTH_INVALID");
  return { uid: payload.sub, email: payload.email, name: payload.name };
}

export async function stripeRequest<T>(env: BillingEnv, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${stripeBaseUrl}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(init.body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? `STRIPE_${response.status}`);
  return payload;
}

export function formBody(values: Record<string, string | boolean | undefined>) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined) form.set(key, String(value));
  return form.toString();
}

export function resolvePrice(env: BillingEnv, entitlement: PaidEntitlement, cadence: "monthly" | "annual") {
  if (entitlement === "player_pro" && cadence === "monthly") return env.STRIPE_PRICE_PLAYER_PRO_MONTHLY;
  if (entitlement === "player_pro" && cadence === "annual") return env.STRIPE_PRICE_PLAYER_PRO_ANNUAL;
  if (entitlement === "club_pro" && cadence === "monthly") return env.STRIPE_PRICE_CLUB_PRO_MONTHLY;
  throw new Error("PLAN_NOT_AVAILABLE");
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function verifyStripeWebhook(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader || !secret) return false;
  const values = signatureHeader.split(",").map((part) => part.trim().split("=", 2));
  const timestamp = values.find(([key]) => key === "t")?.[1];
  const signatures = values.filter(([key]) => key === "v1").map(([, value]) => value);
  const timestampNumber = Number(timestamp);
  if (!timestamp || !Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`)));
  return signatures.some((signature) => constantTimeEqual(expected, signature));
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function updateSupabaseEntitlement(env: BillingEnv, input: {
  uid: string;
  plan: "free" | PaidEntitlement;
  customerId?: string;
  subscriptionId?: string;
  status: string;
}) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(input.uid)) throw new Error("INVALID_FIREBASE_UID");
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/profiles?firebase_uid=eq.${encodeURIComponent(input.uid)}`, {
    method: "PATCH",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      plan: input.plan,
      subscription_status: input.status,
      stripe_customer_id: input.customerId ?? null,
      stripe_subscription_id: input.subscriptionId ?? null,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`SUPABASE_ENTITLEMENT_${response.status}`);
}

export function entitlement(value: unknown): PaidEntitlement | null {
  return value === "player_pro" || value === "club_pro" ? value : null;
}
