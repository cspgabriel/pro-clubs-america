import { apiError, assertSameOrigin, verifyFirebaseRequest, type FunctionContext } from "../../_lib/billing";
import { ensureProfile, supabaseRest } from "../../_lib/supabase";

interface MarketRow {
  id: string; creator_id: string; listing_type: "club_seeking_player" | "player_seeking_club"; title: string | null; owner_name: string | null; position_needed: string; min_ovr: number | null; platform: string | null; availability: string | null; contact: string | null; created_at: string;
}

const payload = (row: MarketRow) => ({ id: row.id, type: row.listing_type === "club_seeking_player" ? "club_vacancy" : "player_search", title: row.title || "Oportunidade", owner: row.owner_name || "Comunidade", position: row.position_needed, minimumOvr: row.min_ovr || undefined, platform: row.platform || "common-gen5", availability: row.availability || "A combinar", contact: row.contact || "", authorUid: row.creator_id, plan: "free", createdAt: row.created_at });

export const onRequestGet = async ({ env }: FunctionContext) => {
  try {
    const rows = await supabaseRest<MarketRow[]>(env, "market_listings?is_active=eq.true&order=created_at.desc&limit=100");
    return Response.json(rows.map(payload), { headers: { "cache-control": "no-store" } });
  } catch { return apiError("Não foi possível carregar o mercado.", 500); }
};

export const onRequestPost = async ({ request, env }: FunctionContext) => {
  try {
    assertSameOrigin(request, env.SITE_URL);
    const identity = await verifyFirebaseRequest(request, env);
    const profile = await ensureProfile(env, identity, identity.name);
    const body = await request.json() as { type?: "club_vacancy" | "player_search"; title?: string; owner?: string; position?: string; minimumOvr?: number; platform?: string; availability?: string; contact?: string };
    const position = String(body.position || "").trim().slice(0, 40);
    if (!position) return apiError("Informe a posição.");
    const rows = await supabaseRest<MarketRow[]>(env, "market_listings", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ creator_id: profile.id, club_id: profile.club_id, listing_type: body.type === "club_vacancy" ? "club_seeking_player" : "player_seeking_club", title: String(body.title || "Oportunidade").slice(0, 160), owner_name: String(body.owner || profile.full_name || "Comunidade").slice(0, 120), position_needed: position, min_ovr: Number(body.minimumOvr) || 0, platform: String(body.platform || "common-gen5").slice(0, 30), availability: String(body.availability || "A combinar").slice(0, 160), contact: String(body.contact || "").slice(0, 240), country_code: "BR", description: String(body.title || "").slice(0, 500), is_active: true, updated_at: new Date().toISOString() }) });
    return Response.json(payload(rows[0]), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MARKET_CREATE_FAILED";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível publicar o anúncio.", message.startsWith("AUTH_") ? 401 : 500);
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
