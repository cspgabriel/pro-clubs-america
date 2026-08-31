import { apiError, type FunctionContext } from "../../_lib/billing";
import { findClubByEa, supabaseRest } from "../../_lib/supabase";
import { repairPublicText } from "../../_lib/text";

type MatchMode = "leagueMatch" | "friendlyMatch" | "playoffMatch";
interface IncomingPlayer { playerId?: string; playerName?: string; position?: string; goals?: number; assists?: number; rating?: number; shots?: number; passesMade?: number; passAttempts?: number; tacklesMade?: number; tackleAttempts?: number; redCards?: number; saves?: number; cleanSheet?: boolean; }
interface IncomingMatch { mode?: MatchMode; playedAt?: string; homeClubId?: string; homeClubName?: string; awayClubId?: string; awayClubName?: string; homeScore?: number; awayScore?: number; competition?: string; sourceUrl?: string; players?: IncomingPlayer[]; }
interface IncomingExtras { overallStats?: unknown; info?: unknown; members?: unknown }
interface IngestBody { parserVersion?: string; source?: string; startedAt?: string; matches?: IncomingMatch[]; extras?: IncomingExtras; metadata?: Record<string, unknown>; }
interface SnapshotRow { id: string; source_fingerprint: string; }
interface QueueRow { id: string; priority: number; attempts: number; club_id: string; next_run_at: string; }

const modes = new Set<MatchMode>(["leagueMatch", "friendlyMatch", "playoffMatch"]);
const platforms = new Set(["common-gen5", "common-gen4", "nx"]);
const safeText = (value: unknown, max: number) => repairPublicText(value).slice(0, max);
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
  const requestUrl = new URL(context.request.url);
  const requested = Number(requestUrl.searchParams.get("limit") || 3);
  const limit = Math.max(1, Math.min(Number.isFinite(requested) ? requested : 3, 10));
  const forcedEaClubId = safeText(requestUrl.searchParams.get("clubId"), 20);
  const forcedPlatform = safeText(requestUrl.searchParams.get("platform") || "common-gen5", 30);
  if (forcedEaClubId) {
    if (!/^\d{1,12}$/.test(forcedEaClubId) || !platforms.has(forcedPlatform)) return apiError("FORCED_CLUB_INVALID", 422);
    const club = await findClubByEa(context.env, forcedPlatform, forcedEaClubId);
    if (!club) return apiError("FORCED_CLUB_NOT_FOUND", 404);
    const item = (await supabaseRest<QueueRow[]>(context.env, `ea_crawl_queue?club_id=eq.${encodeURIComponent(club.id)}&select=id,priority,attempts,club_id,next_run_at&limit=1`))[0];
    return Response.json({ items: item ? [{ queueId: item.id, priority: item.priority, attempts: item.attempts, clubId: club.ea_club_id, platform: club.platform, clubName: club.name, sourceUrl: club.ea_url }] : [] }, { headers: { "cache-control": "no-store" } });
  }
  const due = encodeURIComponent(new Date().toISOString());
  const queueSelect = "select=id,priority,attempts,club_id,next_run_at";
  const queueWindow = `status=in.(queued,failed,succeeded)&next_run_at=lte.${due}`;
  const queueOrder = "order=priority.desc,next_run_at.asc";
  const [claims, matches] = await Promise.all([
    supabaseRest<Array<{ club_id: string }>>(context.env, "club_claims?status=eq.approved&select=club_id&limit=1000"),
    supabaseRest<Array<{ home_club_id: string; away_club_id: string | null; invited_club_id: string | null }>>(context.env, "matches?status=in.(open_challenge,accepted,waiting_ea_verification)&select=home_club_id,away_club_id,invited_club_id&limit=1000"),
  ]);
  const activeClubIds = [...new Set([...claims.map((item) => item.club_id), ...matches.flatMap((item) => [item.home_club_id, item.away_club_id, item.invited_club_id]).filter((value): value is string => Boolean(value))])];
  const queue: QueueRow[] = [];
  // Reserva ao menos um slot para a fila geral: os clubes reivindicados ficam
  // sempre "vencidos" e, sem essa reserva, consomem 100% da vazao e os 552
  // clubes do catalogo nunca sao coletados.
  const priorityBudget = Math.max(1, limit - 1);
  if (activeClubIds.length) {
    const clubFilter = activeClubIds.map(encodeURIComponent).join(",");
    queue.push(...(await supabaseRest<QueueRow[]>(context.env, `ea_crawl_queue?club_id=in.(${clubFilter})&${queueWindow}&${queueSelect}&${queueOrder}&limit=${priorityBudget}`)));
  }
  if (queue.length < limit) {
    const seen = queue.map((item) => item.id);
    const exclusion = seen.length ? `&id=not.in.(${seen.map(encodeURIComponent).join(",")})` : "";
    queue.push(...(await supabaseRest<QueueRow[]>(context.env, `ea_crawl_queue?${queueWindow}${exclusion}&${queueSelect}&${queueOrder}&limit=${limit - queue.length}`)));
  }
  if (!queue.length) return Response.json({ items: [] }, { headers: { "cache-control": "no-store" } });
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


const asArray = (value: unknown) => (Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value as Record<string, unknown>) : []);
const num = (value: unknown) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; };
const ratio = (part: unknown, total: unknown) => { const a = Number(part), b = Number(total); return Number.isFinite(a) && Number.isFinite(b) && b > 0 ? Math.round((a / b) * 1000) / 1000 : null; };

/**
 * Atualiza catalogo (clubs/players) com o que a API publica devolveu.
 * O catalogo veio de um dump estatico; sem isto ele nunca envelhece bem.
 * Falha aqui nunca derruba a ingestao de partidas — e enriquecimento, nao core.
 */
/**
 * Descoberta organica: todo adversario que aparece numa partida e um clube real
 * da EA que talvez ainda nao esteja no catalogo. O dump inicial pegou ~557
 * clubes de um ranking; a EA tem muito mais. Cadastrar o adversario e enfileira-lo
 * faz o catalogo crescer sozinho a cada coleta, sem custo de browser adicional.
 */
async function discoverClub(context: FunctionContext, platform: string, eaClubId: string, name: string) {
  if (!eaClubId || !/^\d{1,12}$/.test(eaClubId)) return null;
  const now = new Date().toISOString();
  const rows = await supabaseRest<Array<{ id: string }>>(context.env, "clubs?on_conflict=platform,ea_club_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      platform, ea_club_id: eaClubId,
      name: name || `Clube ${eaClubId}`,
      ea_url: `https://www.ea.com/pt-br/games/ea-sports-fc/clubs/overview?clubId=${eaClubId}&platform=${platform}`,
      source_url: `https://proclubs.ea.com/api/fc/clubs/info?platform=${platform}&clubIds=${eaClubId}`,
      verified: false, updated_at: now,
    }),
  }).catch(() => []);
  const club = rows[0];
  if (!club) return null;
  // Prioridade baixa: descoberto entra na fila atras dos clubes com dono real.
  await supabaseRest(context.env, "ea_crawl_queue?on_conflict=club_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ club_id: club.id, priority: 5, status: "queued", next_run_at: now, updated_at: now }),
  }).catch(() => undefined);
  return club;
}

async function syncCatalog(context: FunctionContext, eaClubId: string, platform: string, extras: IncomingExtras) {
  const summary = { clubUpdated: false, playersUpserted: 0 };
  const club = await findClubByEa(context.env, platform, eaClubId);
  if (!club) return summary;
  const now = new Date().toISOString();

  const stats = asArray(extras.overallStats)[0] as Record<string, unknown> | undefined;
  if (stats) {
    const games = num(stats.gamesPlayed);
    await supabaseRest(context.env, `clubs?id=eq.${encodeURIComponent(club.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        skill_rating: num(stats.skillRating), wins: num(stats.wins), ties: num(stats.ties), losses: num(stats.losses),
        games_played: games, goals: num(stats.goals), goals_against: num(stats.goalsAgainst),
        clean_sheets: num(stats.cleanSheets), goals_per_game: num(stats.goalsPerGame),
        all_time_rank: num(stats.rank), current_division: num(stats.currentDivision),
        last_synced_at: now, updated_at: now,
      }),
    });
    summary.clubUpdated = true;
  }

  const members = asArray((extras.members as Record<string, unknown>)?.members ?? extras.members);
  const rows = members.map((entry) => {
    const member = entry as Record<string, unknown>;
    const gamertag = safeText(member.name, 80);
    if (!gamertag) return null;
    const games = num(member.gamesPlayed);
    return {
      club_id: club.id, gamertag,
      favorite_position: safeText(member.favoritePosition, 40) || null,
      rating: num(member.ratingAve), games_played: games, goals: num(member.goals), assists: num(member.assists),
      passes_made: num(member.passesMade), pass_success_rate: num(member.passSuccessRate),
      tackles_made: num(member.tacklesMade), tackle_success_rate: num(member.tackleSuccessRate),
      clean_sheets_def: num(member.cleanSheetsDef), clean_sheets_gk: num(member.cleanSheetsGK),
      man_of_the_match: num(member.manOfTheMatch),
      goals_per_game: ratio(member.goals, games), assists_per_game: ratio(member.assists, games),
      tackles_per_game: ratio(member.tacklesMade, games),
      last_synced_at: now, updated_at: now,
    };
  }).filter(Boolean);

  if (rows.length) {
    await supabaseRest(context.env, "players?on_conflict=club_id,gamertag", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows),
    });
    summary.playersUpserted = rows.length;
  }
  return summary;
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
  let playersObserved = 0;
  let discovered = 0;

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
      // Adversario fora do catalogo vira clube novo + entrada na fila.
      const homeClubId = homeClub?.id ?? (await discoverClub(context, platform, homeEaId, homeName))?.id ?? null;
      const awayClubId = awayClub?.id ?? (await discoverClub(context, platform, awayEaId, awayName))?.id ?? null;
      if (!homeClub && homeClubId) discovered += 1;
      if (!awayClub && awayClubId) discovered += 1;
      const fingerprint = await digest([platform, mode, playedAt.toISOString(), homeEaId, awayEaId, homeScore, awayScore].join("|"));
      const snapshots = await supabaseRest<SnapshotRow[]>(context.env, "ea_match_snapshots?on_conflict=source_fingerprint", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ source_fingerprint: fingerprint, platform, mode, played_at: playedAt.toISOString(), home_ea_club_id: homeEaId, home_club_id: homeClubId, home_club_name: homeName, away_ea_club_id: awayEaId, away_club_id: awayClubId, away_club_name: awayName, home_score: homeScore, away_score: awayScore, competition: safeText(match.competition || "EA Clubs", 120), source_url: sourceUrl(match.sourceUrl, homeEaId, platform), players: normalizePlayers(match.players), parser_version: parserVersion, ingest_run_id: runId, observed_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
      const snapshot = snapshots[0];
      playersObserved += normalizePlayers(match.players).length;
      const reconciled = mode === "friendlyMatch" && snapshot ? await supabaseRest<Array<{ matched_match_id: string | null }>>(context.env, "rpc/reconcile_ea_friendly", { method: "POST", body: JSON.stringify({ p_snapshot_id: snapshot.id }) }) : [];
      results.push({ fingerprint, snapshotId: snapshot?.id, reconciledMatchId: reconciled[0]?.matched_match_id || undefined });
    } catch (error) { results.push({ error: error instanceof Error ? error.message : "INGEST_ITEM_FAILED" }); }
  }

  // Enriquecimento do catalogo: isolado do core, nunca derruba a ingestao.
  let catalog = { clubUpdated: false, playersUpserted: 0 };
  if (body?.extras && queueId) {
    const platform = safeText((body?.metadata?.platform as string) || "common-gen5", 30);
    const eaClubId = safeText(body?.metadata?.clubId, 20);
    if (eaClubId && platforms.has(platform)) {
      catalog = await syncCatalog(context, eaClubId, platform, body.extras)
        .catch((error) => { console.error(JSON.stringify({ event: "catalog_sync_failed", eaClubId, reason: error instanceof Error ? error.message : "UNKNOWN" })); return catalog; });
    }
  }

  const errors = results.filter((item) => item.error).length;
  const runStatus = collectionStatus !== "succeeded" ? collectionStatus : input.length > 0 && errors === input.length ? "failed" : errors ? "partial" : "succeeded";
  const finishedAt = new Date();
  await supabaseRest(context.env, `ea_crawl_runs?id=eq.${encodeURIComponent(runId)}`, { method: "PATCH", body: JSON.stringify({ status: runStatus, finished_at: finishedAt.toISOString(), clubs_processed: queueId ? 1 : 0, matches_observed: input.length - errors, players_observed: playersObserved, error_count: errors + (collectionStatus === "succeeded" ? 0 : 1) }) });
  if (queueId) {
    const priorAttempts = Number(body?.metadata?.attempts || 0);
    const retryMinutes = runStatus === "succeeded" ? 120 : runStatus === "blocked" ? 1440 : Math.min(30 * 2 ** Math.min(priorAttempts, 6), 1440);
    await supabaseRest(context.env, `ea_crawl_queue?id=eq.${encodeURIComponent(queueId)}`, { method: "PATCH", body: JSON.stringify({ status: runStatus === "partial" ? "failed" : runStatus, last_attempt_at: finishedAt.toISOString(), last_success_at: runStatus === "succeeded" ? finishedAt.toISOString() : undefined, attempts: priorAttempts + 1, last_error: runStatus === "succeeded" ? null : safeText(body?.metadata?.error || runStatus, 500), next_run_at: new Date(finishedAt.getTime() + retryMinutes * 60000).toISOString(), updated_at: finishedAt.toISOString() }) });
  }
  return Response.json({ runId, status: runStatus, accepted: input.length - errors, errors, catalog, discovered, reconciled: results.filter((item) => item.reconciledMatchId).length, results }, { status: runStatus === "failed" || runStatus === "blocked" ? 422 : 202 });
};
