import { apiError, type FunctionContext } from "../../_lib/billing";
import { findClubByEa, supabaseRest } from "../../_lib/supabase";

type MatchMode = "leagueMatch" | "friendlyMatch" | "playoffMatch";
interface IncomingPlayer { playerId?: string; playerName?: string; position?: string; goals?: number; assists?: number; rating?: number; shots?: number; passesMade?: number; passAttempts?: number; tacklesMade?: number; tackleAttempts?: number; redCards?: number; saves?: number; cleanSheet?: boolean; }
interface IncomingMatch { mode?: MatchMode; playedAt?: string; homeClubId?: string; homeClubName?: string; awayClubId?: string; awayClubName?: string; homeScore?: number; awayScore?: number; competition?: string; sourceUrl?: string; players?: IncomingPlayer[]; }
interface IngestBody { parserVersion?: string; source?: string; startedAt?: string; matches?: IncomingMatch[]; metadata?: Record<string, unknown>; }
interface SnapshotRow { id: string; source_fingerprint: string; }
interface QueueRow { id: string; priority: number; attempts: number; club_id: string; next_run_at: string; }

const modes = new Set<MatchMode>(["leagueMatch", "friendlyMatch", "playoffMatch"]);
const platforms = new Set(["common-gen5", "common-gen4", "nx"]);
const safeText = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const safeNumber = (value: unknown, min = 0, max = 99) => { const number = Number(value); return Number.isFinite(number) && number >= min && number <= max ? number : null; };

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function authorized(request: Request, secret?: string) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !supplied) return false;
  return (await digest(supplied)) === (await digest(secret));
}

export const onRequestGet = async (context: FunctionContext) => {
  if (!(await authorized(context.request, context.env.EA_INGEST_SECRET))) return apiError("INGEST_AUTH_REQUIRED", 401);
  const requested = Number(new URL(context.request.url).searchParams.get("limit") || 3);
  const limit = Math.max(1, Math.min(Number.isFinite(requested) ? requested : 3, 10));
  const due = encodeURIComponent(new Date().toISOString());
  const queue = await supabaseRest<QueueRow[]>(context.env, `ea_crawl_queue?status=in.(queued,failed,succeeded)&next_run_at=lte.${due}&select=id,priority,attempts,club_id,next_run_at&order=priority.desc,next_run_at.asc&limit=${limit}`);
  const items = await Promise.all(queue.map(async (item) => {
    const club = (await supabaseRest<Array<{ id: string; ea_club_id: string; platform: string; name: string; ea_url: string }>>(context.env, `clubs?id=eq.${encodeURIComponent(item.club_id)}&select=id,ea_club_id,platform,name,ea_url&limit=1`))[0];
    return club ? { queueId: item.id, priority: item.priority, attempts: item.attempts, clubId: club.ea_club_id, platform: club.platform, clubName: club.name, sourceUrl: club.ea_url } : null;
  }));
  return Response.json({ items: items.filter(Boolean) }, { headers: { "cache-control": "no-store" } });
};

function sourceUrl(value: unknown, homeClubId: string, platform: string) {
  const raw = safeText(value, 500);
  const fallback = `https://www.ea.com/pt-br/games/ea-sports-fc/clubs/match-history?clubId=${encodeURIComponent(homeClubId)}&platform=${encodeURIComponent(platform)}`;
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname === "www.ea.com" && url.pathname.includes("/clubs/match-history") ? url.toString() : fallback;
  } catch { return fallback; }
}

function normalizePlayers(players: IncomingPlayer[] | undefined) {
  return (Array.isArray(players) ? players : []).slice(0, 50).map((player) => ({
    playerId: safeText(player.playerId, 120), playerName: safeText(player.playerName, 120), position: safeText(player.position, 30),
    goals: safeNumber(player.goals, 0, 30) ?? 0, assists: safeNumber(player.assists, 0, 30) ?? 0, rating: safeNumber(player.rating, 0, 10),
    shots: safeNumber(player.shots, 0, 100), passesMade: safeNumber(player.passesMade, 0, 500), passAttempts: safeNumber(player.passAttempts, 0, 500),
    tacklesMade: safeNumber(player.tacklesMade, 0, 100), tackleAttempts: safeNumber(player.tackleAttempts, 0, 100), redCards: safeNumber(player.redCards, 0, 10),
    saves: safeNumber(player.saves, 0, 100), cleanSheet: Boolean(player.cleanSheet),
  })).filter((player) => player.playerName);
}

export const onRequestPost = async (context: FunctionContext) => {
  if (!(await authorized(context.request, context.env.EA_INGEST_SECRET))) return apiError("INGEST_AUTH_REQUIRED", 401);
  const body = await context.request.json().catch(() => null) as IngestBody | null;
  const parserVersion = safeText(body?.parserVersion, 80);
  const input = Array.isArray(body?.matches) ? body.matches.slice(0, 500) : [];
  const queueId = safeText(body?.metadata?.queueId, 80);
  const responseCount = safeNumber(body?.metadata?.responseCount, 0, 100) ?? 0;
  const collectionStatus = ["succeeded", "failed", "blocked"].includes(String(body?.metadata?.collectionStatus)) ? String(body?.metadata?.collectionStatus) : "succeeded";
  if (!parserVersion || (!input.length && !(queueId && (responseCount > 0 || collectionStatus !== "succeeded"))) || !["succeeded", "failed", "blocked"].includes(collectionStatus)) return apiError("Coleta inválida ou sem resposta observável da página pública.");

  const runs = await supabaseRest<Array<{ id: string }>>(context.env, "ea_crawl_runs", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ source: safeText(body?.source || "authorized-import", 80), parser_version: parserVersion, status: "running", started_at: body?.startedAt || new Date().toISOString(), metadata: body?.metadata || {} }) });
  const runId = runs[0]?.id;
  const results: Array<{ fingerprint?: string; snapshotId?: string; reconciledMatchId?: string; error?: string }> = [];

  for (const match of input) {
    try {
      const platform = safeText((body?.metadata?.platform as string) || "common-gen5", 30);
      const mode = match.mode;
      const homeEaId = safeText(match.homeClubId, 60); const awayEaId = safeText(match.awayClubId, 60);
      const homeName = safeText(match.homeClubName, 140); const awayName = safeText(match.awayClubName, 140);
      const homeScore = safeNumber(match.homeScore); const awayScore = safeNumber(match.awayScore);
      const playedAt = new Date(String(match.playedAt || ""));
      if (!platforms.has(platform) || !mode || !modes.has(mode) || !homeEaId || !awayEaId || !homeName || !awayName || homeScore == null || awayScore == null || Number.isNaN(playedAt.getTime()) || playedAt.getTime() < Date.now() - 366 * 86400000 || playedAt.getTime() > Date.now() + 86400000) throw new Error("INVALID_MATCH");
      const [homeClub, awayClub] = await Promise.all([findClubByEa(context.env, platform, homeEaId), findClubByEa(context.env, platform, awayEaId)]);
      const fingerprint = await digest([platform, mode, playedAt.toISOString(), homeEaId, awayEaId, homeScore, awayScore].join("|"));
      const snapshots = await supabaseRest<SnapshotRow[]>(context.env, "ea_match_snapshots?on_conflict=source_fingerprint", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ source_fingerprint: fingerprint, platform, mode, played_at: playedAt.toISOString(), home_ea_club_id: homeEaId, home_club_id: homeClub?.id || null, home_club_name: homeName, away_ea_club_id: awayEaId, away_club_id: awayClub?.id || null, away_club_name: awayName, home_score: homeScore, away_score: awayScore, competition: safeText(match.competition || "EA Clubs", 120), source_url: sourceUrl(match.sourceUrl, homeEaId, platform), players: normalizePlayers(match.players), parser_version: parserVersion, ingest_run_id: runId, observed_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
      const snapshot = snapshots[0];
      const reconciled = mode === "friendlyMatch" && snapshot ? await supabaseRest<Array<{ matched_match_id: string | null }>>(context.env, "rpc/reconcile_ea_friendly", { method: "POST", body: JSON.stringify({ p_snapshot_id: snapshot.id }) }) : [];
      results.push({ fingerprint, snapshotId: snapshot?.id, reconciledMatchId: reconciled[0]?.matched_match_id || undefined });
    } catch (error) { results.push({ error: error instanceof Error ? error.message : "INGEST_ITEM_FAILED" }); }
  }

  const errors = results.filter((item) => item.error).length;
  const runStatus = collectionStatus !== "succeeded" ? collectionStatus : input.length > 0 && errors === input.length ? "failed" : errors ? "partial" : "succeeded";
  const finishedAt = new Date();
  await supabaseRest(context.env, `ea_crawl_runs?id=eq.${encodeURIComponent(runId)}`, { method: "PATCH", body: JSON.stringify({ status: runStatus, finished_at: finishedAt.toISOString(), clubs_processed: queueId ? 1 : 0, matches_observed: input.length - errors, error_count: errors + (collectionStatus === "succeeded" ? 0 : 1) }) });
  if (queueId) {
    const retryMinutes = runStatus === "succeeded" ? 360 : runStatus === "blocked" ? 1440 : 30;
    await supabaseRest(context.env, `ea_crawl_queue?id=eq.${encodeURIComponent(queueId)}`, { method: "PATCH", body: JSON.stringify({ status: runStatus === "partial" ? "failed" : runStatus, last_attempt_at: finishedAt.toISOString(), last_success_at: runStatus === "succeeded" ? finishedAt.toISOString() : undefined, attempts: Number(body?.metadata?.attempts || 0) + 1, last_error: runStatus === "succeeded" ? null : safeText(body?.metadata?.error || runStatus, 500), next_run_at: new Date(finishedAt.getTime() + retryMinutes * 60000).toISOString(), updated_at: finishedAt.toISOString() }) });
  }
  return Response.json({ runId, status: runStatus, accepted: input.length - errors, errors, reconciled: results.filter((item) => item.reconciledMatchId).length, results }, { status: runStatus === "failed" || runStatus === "blocked" ? 422 : 202 });
};
