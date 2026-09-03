import { apiError, type FunctionContext } from "../../_lib/billing";
import { publicRouteId, supabaseRest, type SupabaseClub } from "../../_lib/supabase";

export const onRequestGet = async ({ request, env }: FunctionContext) => {
  const url = new URL(request.url);
  const platform = url.searchParams.get("platform") || "common-gen5";
  if (!["common-gen5", "common-gen4", "nx"].includes(platform)) return apiError("Plataforma inválida.");
  // PostgREST filter syntax must never come from user input.
  const query = (url.searchParams.get("q") || "").slice(0, 80).replace(/[^\p{L}\p{N}\s-]/gu, " ").trim();
  const params = new URLSearchParams({ select: "ea_club_id,platform,name,country_code", platform: `eq.${platform}`, order: "name.asc,ea_club_id.asc", limit: "20" });
  if (query) {
    if (/^\d+$/.test(query)) params.set("ea_club_id", `eq.${query}`);
    else params.set("name", `ilike.*${query}*`);
  }
  try {
    const rows = await supabaseRest<SupabaseClub[]>(env, `clubs?${params}`);
    return Response.json(rows.map((club) => ({ id: publicRouteId(club), name: club.name, platform: club.platform, countryCode: club.country_code })), { headers: { "cache-control": "public, max-age=30" } });
  } catch {
    return apiError("Não foi possível buscar os times. Tente novamente.", 503);
  }
};
