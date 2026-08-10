import { apiError, assertSameOrigin, verifyFirebaseRequest, type FunctionContext } from "../../../../_lib/billing";
import { type MatchRow } from "../../../../_lib/community";
import { ensureProfile, findClubById, supabaseRest } from "../../../../_lib/supabase";

type MatchContext = FunctionContext & { params: { id: string } };
interface SubmissionRow { id: string; ea_url: string; status: string; created_at: string; }

function parseEaUrl(value: unknown) {
  const url = new URL(String(value || ""));
  const allowedPath = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?games\/ea-sports-fc\/clubs\/(?:overview|member-list|match-history)$/;
  const clubId = url.searchParams.get("clubId") || "";
  const platform = url.searchParams.get("platform") || "";
  if (url.protocol !== "https:" || url.hostname !== "www.ea.com" || !allowedPath.test(url.pathname) || !/^\d{1,12}$/.test(clubId) || !["common-gen5", "common-gen4", "nx"].includes(platform)) throw new Error("INVALID_EA_URL");
  url.pathname = "/pt-br/games/ea-sports-fc/clubs/match-history";
  url.search = new URLSearchParams({ clubId, platform }).toString();
  return { url: url.toString(), clubId, platform };
}

async function participant(context: MatchContext) {
  const identity = await verifyFirebaseRequest(context.request, context.env);
  const profile = await ensureProfile(context.env, identity, identity.name);
  const match = (await supabaseRest<MatchRow[]>(context.env, `matches?id=eq.${encodeURIComponent(context.params.id)}&limit=1`))[0];
  if (!match) throw new Error("MATCH_NOT_FOUND");
  if (!profile.club_id || !["owner", "captain", "admin"].includes(profile.role) || ![match.home_club_id, match.away_club_id].includes(profile.club_id)) throw new Error("CLUB_PERMISSION_REQUIRED");
  return { profile, match };
}

export const onRequestPost = async (context: MatchContext) => {
  try {
    assertSameOrigin(context.request, context.env.SITE_URL);
    const { profile, match } = await participant(context);
    if (!match.away_club_id || !["accepted", "waiting_ea_verification"].includes(match.status)) return apiError("A partida ainda não está pronta para validação.", 409);
    const body = await context.request.json().catch(() => ({})) as { url?: string };
    const parsed = parseEaUrl(body.url);
    const [home, away] = await Promise.all([findClubById(context.env, match.home_club_id), findClubById(context.env, match.away_club_id)]);
    const submittedClub = [home, away].find((club) => club?.ea_club_id === parsed.clubId && club.platform === parsed.platform);
    if (!submittedClub) return apiError("A URL precisa pertencer a um dos dois clubes desta partida.", 422);
    const rows = await supabaseRest<SubmissionRow[]>(context.env, "ea_source_submissions?on_conflict=match_id,ea_url", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ match_id: match.id, submitted_by_profile_id: profile.id, club_id: submittedClub.id, ea_url: parsed.url, ea_club_id: parsed.clubId, platform: parsed.platform, status: "queued", updated_at: new Date().toISOString() }) });
    await supabaseRest(context.env, "ea_crawl_queue?on_conflict=club_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ club_id: submittedClub.id, priority: 100, status: "queued", next_run_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }) });
    return Response.json({ id: rows[0]?.id, status: "queued", eaUrl: parsed.url, message: "URL recebida. O histórico deste clube entrou na fila prioritária de validação." }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "EA_SOURCE_FAILED";
    const status = message.startsWith("AUTH_") ? 401 : message === "MATCH_NOT_FOUND" ? 404 : message === "CLUB_PERMISSION_REQUIRED" ? 403 : message === "INVALID_EA_URL" ? 422 : 500;
    return apiError(message === "INVALID_EA_URL" ? "Use uma URL pública válida da EA Clubs com clubId e platform." : message === "CLUB_PERMISSION_REQUIRED" ? "Somente dono ou capitão de um dos times pode enviar a fonte." : message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível registrar a URL da EA.", status);
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
