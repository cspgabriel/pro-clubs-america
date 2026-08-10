export interface SupabaseEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export interface SupabaseProfile {
  id: string;
  firebase_uid: string;
  email: string;
  full_name: string | null;
  country_slug: string | null;
  locale: string | null;
  role: "visitor" | "player" | "captain" | "owner" | "admin";
  plan: "free" | "pro" | "vip" | "player_pro" | "club_pro" | "club_premium";
  reliability: number;
  elo: number;
  club_id: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
}

export interface SupabaseClub {
  id: string;
  ea_club_id: string;
  platform: string;
  name: string;
  ea_url: string;
  country_code: string | null;
  verified: boolean;
  skill_rating: number;
}

function baseUrl(env: SupabaseEnv) {
  return env.SUPABASE_URL.replace(/\/$/, "");
}

export async function supabaseRest<T>(env: SupabaseEnv, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl(env)}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`SUPABASE_${response.status}:${payload?.message ?? text}`);
  return payload as T;
}

export async function findProfile(env: SupabaseEnv, firebaseUid: string) {
  const rows = await supabaseRest<SupabaseProfile[]>(env, `profiles?firebase_uid=eq.${encodeURIComponent(firebaseUid)}&limit=1`);
  return rows[0] ?? null;
}

export async function ensureProfile(env: SupabaseEnv, identity: { uid: string; email?: string }, displayName?: string) {
  const existing = await findProfile(env, identity.uid);
  if (existing) return existing;
  const rows = await supabaseRest<SupabaseProfile[]>(env, "profiles", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      firebase_uid: identity.uid,
      email: identity.email || `${identity.uid}@firebase.local`,
      full_name: displayName || identity.email?.split("@")[0] || "Jogador",
      country_code: "BR",
      country_slug: "brasil",
      locale: "pt-br",
      role: "visitor",
      plan: "free",
      reliability: 100,
      elo: 1000,
    }),
  });
  if (!rows[0]) throw new Error("SUPABASE_PROFILE_CREATE_FAILED");
  return rows[0];
}

export async function findClubById(env: SupabaseEnv, clubId: string) {
  const rows = await supabaseRest<SupabaseClub[]>(env, `clubs?id=eq.${encodeURIComponent(clubId)}&limit=1`);
  return rows[0] ?? null;
}

export async function findClubByEa(env: SupabaseEnv, platform: string, eaClubId: string) {
  const rows = await supabaseRest<SupabaseClub[]>(env, `clubs?platform=eq.${encodeURIComponent(platform)}&ea_club_id=eq.${encodeURIComponent(eaClubId)}&limit=1`);
  return rows[0] ?? null;
}

export function publicRouteId(club: SupabaseClub) {
  return club.platform === "common-gen5" ? club.ea_club_id : `${club.platform}-${club.ea_club_id}`;
}
