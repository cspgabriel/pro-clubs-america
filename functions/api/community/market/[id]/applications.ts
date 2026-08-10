import { apiError, assertSameOrigin, verifyFirebaseRequest, type FunctionContext } from "../../../../_lib/billing";
import { ensureProfile, findClubById, supabaseRest } from "../../../../_lib/supabase";
import { sendPushToProfiles } from "../../../../_lib/push";

interface ListingRow { id: string; creator_id: string; is_active: boolean; }
interface ApplicationRow { id: string; applicant_profile_id: string; message: string | null; contact: string | null; status: string; created_at: string; }
interface ApplicantRow { id: string; full_name: string | null; email: string; role: string; club_id: string | null; player_id: string | null; }

async function contextData(context: FunctionContext) {
  const identity = await verifyFirebaseRequest(context.request, context.env);
  const profile = await ensureProfile(context.env, identity, identity.name);
  const id = decodeURIComponent(new URL(context.request.url).pathname.split("/").at(-2) || "");
  const listing = (await supabaseRest<ListingRow[]>(context.env, `market_listings?id=eq.${encodeURIComponent(id)}&limit=1`))[0];
  if (!listing) throw new Error("LISTING_NOT_FOUND");
  return { identity, profile, listing };
}

export const onRequestPost = async (context: FunctionContext) => {
  try {
    assertSameOrigin(context.request, context.env.SITE_URL);
    const { profile, listing } = await contextData(context);
    if (!listing.is_active) return apiError("Esta oportunidade foi encerrada.", 409);
    if (listing.creator_id === profile.id) return apiError("Você não pode se candidatar ao próprio anúncio.", 409);
    const body = await context.request.json().catch(() => ({})) as { message?: string; contact?: string };
    const rows = await supabaseRest<ApplicationRow[]>(context.env, "market_applications?on_conflict=listing_id,applicant_profile_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ listing_id: listing.id, applicant_profile_id: profile.id, message: String(body.message || "Tenho interesse nesta oportunidade.").slice(0, 500), contact: String(body.contact || profile.email).slice(0, 240), status: "pending", updated_at: new Date().toISOString() }) });
    context.waitUntil(sendPushToProfiles(context.env, [listing.creator_id], { title: "Nova candidatura", body: `${profile.full_name || "Um jogador"} se candidatou ao seu anúncio.`, url: "/mercado/", tag: `market-${listing.id}` }));
    return Response.json({ id: rows[0]?.id, status: "pending" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "APPLICATION_FAILED";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível enviar a candidatura.", message.startsWith("AUTH_") ? 401 : message === "LISTING_NOT_FOUND" ? 404 : 500);
  }
};

export const onRequestGet = async (context: FunctionContext) => {
  try {
    const { profile, listing } = await contextData(context);
    if (listing.creator_id !== profile.id) return apiError("Somente quem publicou pode ver os candidatos.", 403);
    const applications = await supabaseRest<ApplicationRow[]>(context.env, `market_applications?listing_id=eq.${encodeURIComponent(listing.id)}&order=created_at.desc`);
    const result = await Promise.all(applications.map(async (application) => {
      const applicant = (await supabaseRest<ApplicantRow[]>(context.env, `profiles?id=eq.${encodeURIComponent(application.applicant_profile_id)}&limit=1`))[0];
      const club = applicant?.club_id ? await findClubById(context.env, applicant.club_id) : null;
      const player = applicant?.player_id ? (await supabaseRest<Array<{ gamertag: string }>>(context.env, `players?id=eq.${encodeURIComponent(applicant.player_id)}&select=gamertag&limit=1`))[0] : null;
      return applicant ? { id: application.id, profileId: applicant.id, playerId: player?.gamertag, name: applicant.full_name || "Jogador", email: applicant.email, role: applicant.role, clubName: club?.name, message: application.message, contact: application.contact, status: application.status, createdAt: application.created_at } : null;
    }));
    return Response.json(result.filter(Boolean), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "APPLICATIONS_FAILED";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : message === "LISTING_NOT_FOUND" ? "Anúncio não encontrado." : "Não foi possível carregar os candidatos.", message.startsWith("AUTH_") ? 401 : message === "LISTING_NOT_FOUND" ? 404 : 500);
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
