import { apiError, assertSameOrigin, verifyFirebaseRequest, type FunctionContext } from "../../../_lib/billing";
import { ensureProfile, findClubByEa, supabaseRest, type SupabaseClub } from "../../../_lib/supabase";

interface ClaimBody {
  responsibleName?: string;
  email?: string;
  clubName?: string;
  country?: string;
  eaUrl?: string;
  clubId?: string;
  platform?: string;
}

const allowedPlatforms = new Set(["common-gen5", "common-gen4", "nx"]);

export const onRequestPost = async ({ request, env }: FunctionContext) => {
  try {
    assertSameOrigin(request, env.SITE_URL);
    const identity = await verifyFirebaseRequest(request, env);
    const profile = await ensureProfile(env, identity, identity.name);
    const body = await request.json() as ClaimBody;
    const clubId = String(body.clubId || "").trim();
    const platform = String(body.platform || "").trim();
    const clubName = String(body.clubName || "").trim().slice(0, 120);
    const responsibleName = String(body.responsibleName || identity.name || "").trim().slice(0, 120);
    const contactEmail = String(body.email || identity.email || "").trim().slice(0, 240);
    const eaUrl = String(body.eaUrl || "").trim();
    const country = String(body.country || "brasil").trim().slice(0, 40);
    if (!/^\d+$/.test(clubId) || !allowedPlatforms.has(platform) || !clubName || !responsibleName || !contactEmail || !eaUrl.startsWith("https://www.ea.com/")) return apiError("Dados do clube inválidos.");
    if (profile.club_id) return apiError("Sua conta já possui um clube vinculado.", 409);

    let club = await findClubByEa(env, platform, clubId);
    if (!club) {
      const rows = await supabaseRest<SupabaseClub[]>(env, "clubs", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ ea_club_id: clubId, platform, name: clubName, ea_url: eaUrl, source_url: eaUrl, verified: false, country_code: null }),
      });
      club = rows[0];
    }
    if (!club) throw new Error("CLUB_CREATE_FAILED");

    const approved = await supabaseRest<Array<{ id: string }>>(env, `club_claims?club_id=eq.${encodeURIComponent(club.id)}&status=eq.approved&limit=1`);
    if (approved.length) return apiError("Este clube já está vinculado a outra conta.", 409);

    const now = new Date().toISOString();
    const claims = await supabaseRest<Array<{ id: string; status: string; created_at: string }>>(env, "club_claims?on_conflict=profile_id,club_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ club_id: club.id, profile_id: profile.id, firebase_uid: identity.uid, responsible_name: responsibleName, contact_email: contactEmail, country_slug: country, ea_url: eaUrl, status: "approved", reviewed_at: now, updated_at: now }),
    });
    const claim = claims[0];
    await supabaseRest(env, `profiles?id=eq.${encodeURIComponent(profile.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ club_id: club.id, role: "owner", country_slug: country, updated_at: now }),
    });
    return Response.json({ id: claim?.id, responsibleName, email: contactEmail, clubName: club.name, country, eaUrl, clubId, platform, submittedAt: claim?.created_at || now, status: "indexed" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CLAIM_FAILED";
    const status = message.startsWith("AUTH_") ? 401 : message === "ORIGIN_NOT_ALLOWED" ? 403 : 500;
    console.error(JSON.stringify({ event: "club_claim_failed", reason: message, status }));
    return apiError(status === 500 ? "Não foi possível vincular o clube." : message, status);
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
