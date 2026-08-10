import { apiError, type FunctionContext } from "../../_lib/billing";
import { publicRouteId, supabaseRest, type SupabaseClub } from "../../_lib/supabase";

interface ClaimRow { id: string; responsible_name: string; country_slug: string; ea_url: string; status: string; created_at: string; club_id: string }

export const onRequestGet = async ({ env }: FunctionContext) => {
  try {
    const rows = await supabaseRest<ClaimRow[]>(env, "club_claims?status=eq.pending_review&order=created_at.desc&limit=100");
    const result = await Promise.all(rows.map(async (claim) => {
      const club = (await supabaseRest<SupabaseClub[]>(env, `clubs?id=eq.${encodeURIComponent(claim.club_id)}&limit=1`))[0];
      return club ? { id: claim.id, responsibleName: claim.responsible_name, email: "", clubName: club.name, country: claim.country_slug, eaUrl: claim.ea_url, clubId: publicRouteId(club), platform: club.platform, submittedAt: claim.created_at, status: claim.status } : null;
    }));
    return Response.json(result.filter(Boolean), { headers: { "cache-control": "no-store" } });
  } catch {
    return apiError("Não foi possível carregar as solicitações.", 500);
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
