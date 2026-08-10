import { apiError, verifyFirebaseRequest, type BillingEnv, type FunctionContext } from "../../_lib/billing";
import { ensureProfile, findClubById, publicRouteId, supabaseRest, type SupabaseProfile } from "../../_lib/supabase";

interface ClaimRow { id: string; status: string; club_id: string; created_at: string }

async function profilePayload(env: BillingEnv, profile: SupabaseProfile) {
  const club = profile.club_id ? await findClubById(env, profile.club_id) : null;
  const claims = await supabaseRest<ClaimRow[]>(env, `club_claims?profile_id=eq.${encodeURIComponent(profile.id)}&order=created_at.desc&limit=1`);
  const pending = claims[0]?.status === "pending_review" ? await findClubById(env, claims[0].club_id) : null;
  return {
    uid: profile.firebase_uid,
    displayName: profile.full_name || profile.email.split("@")[0],
    email: profile.email,
    country: profile.country_slug || "brasil",
    locale: profile.locale || "pt-br",
    role: profile.role,
    plan: profile.plan,
    reliability: profile.reliability,
    elo: profile.elo,
    clubId: club ? publicRouteId(club) : undefined,
    clubName: club?.name,
    pendingClubId: pending ? publicRouteId(pending) : undefined,
    pendingClubName: pending?.name,
    pendingClaimId: claims[0]?.status === "pending_review" ? claims[0].id : undefined,
  };
}

async function authenticated(context: FunctionContext) {
  const identity = await verifyFirebaseRequest(context.request, context.env);
  const profile = await ensureProfile(context.env, identity, identity.name);
  return { identity, profile };
}

export const onRequestGet = async (context: FunctionContext) => {
  try {
    const { profile } = await authenticated(context);
    return Response.json(await profilePayload(context.env, profile), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PROFILE_FAILED";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível carregar o perfil.", message.startsWith("AUTH_") ? 401 : 500);
  }
};

export const onRequestPost = onRequestGet;

export const onRequestPatch = async (context: FunctionContext) => {
  try {
    const { profile } = await authenticated(context);
    const body = await context.request.json() as { country?: string; locale?: string };
    const country = String(body.country || "brasil").slice(0, 40);
    const locale = ["pt-br", "es", "en"].includes(String(body.locale)) ? String(body.locale) : "pt-br";
    const rows = await supabaseRest<SupabaseProfile[]>(context.env, `profiles?id=eq.${encodeURIComponent(profile.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ country_slug: country, locale, updated_at: new Date().toISOString() }),
    });
    return Response.json(await profilePayload(context.env, rows[0] ?? profile));
  } catch (error) {
    const message = error instanceof Error ? error.message : "PROFILE_UPDATE_FAILED";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível salvar o perfil.", message.startsWith("AUTH_") ? 401 : 500);
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
