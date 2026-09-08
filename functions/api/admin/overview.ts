import { apiError, verifyFirebaseRequest, type BillingEnv, type FunctionContext } from "../../_lib/billing";
import { findProfile, supabaseCount, supabaseRest } from "../../_lib/supabase";

interface RunRow { started_at: string; finished_at: string | null; status: string; source: string; clubs_processed: number; players_observed: number; matches_observed: number; error_count: number }
interface QueueRow { status: string; priority: number; attempts: number; next_run_at: string; last_error: string | null; club_id: string }
interface ProfileRow { email: string; full_name: string | null; role: string; plan: string; created_at: string; club_id: string | null; player_id: string | null }
interface ClubRow { id: string; name: string; ea_club_id: string; platform: string; country_code: string | null; created_at: string }

const STALE_HOURS = 24;

async function isAdmin(env: BillingEnv, request: Request) {
  const allowed = (env.ADMIN_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (!allowed.length) return { ok: false as const, reason: "ADMIN_EMAILS_NOT_CONFIGURED" };
  const identity = await verifyFirebaseRequest(request, env);
  const profile = await findProfile(env, identity.uid);
  const email = (profile?.email || identity.email || "").toLowerCase();
  if (!email || !allowed.includes(email)) return { ok: false as const, reason: "NOT_ADMIN" };
  return { ok: true as const, email };
}

export const onRequestGet = async (context: FunctionContext) => {
  try {
    const auth = await isAdmin(context.env, context.request);
    if (!auth.ok) return apiError(auth.reason === "ADMIN_EMAILS_NOT_CONFIGURED" ? "Painel admin não configurado (defina ADMIN_EMAILS)." : "Acesso restrito.", auth.reason === "ADMIN_EMAILS_NOT_CONFIGURED" ? 503 : 403);

    const since24h = new Date(Date.now() - 86400000).toISOString();
    const since7d = new Date(Date.now() - 7 * 86400000).toISOString();

    const [
      profiles, clubs, players, matches, snapshots, claims, listings, entitlements,
      newProfiles7d, snapshots24h,
      queueQueued, queueFailed, queueBlocked, queueSucceeded,
      recentProfiles, recentClubs, recentRuns, priorityQueue, freshSnapshot,
    ] = await Promise.all([
      supabaseCount(context.env, "profiles"),
      supabaseCount(context.env, "clubs"),
      supabaseCount(context.env, "players"),
      supabaseCount(context.env, "matches"),
      supabaseCount(context.env, "ea_match_snapshots"),
      supabaseCount(context.env, "club_claims?status=eq.approved"),
      supabaseCount(context.env, "market_listings"),
      supabaseCount(context.env, "subscription_entitlements"),
      supabaseCount(context.env, `profiles?created_at=gte.${since7d}`),
      supabaseCount(context.env, `ea_match_snapshots?created_at=gte.${since24h}`),
      supabaseCount(context.env, "ea_crawl_queue?status=eq.queued"),
      supabaseCount(context.env, "ea_crawl_queue?status=eq.failed"),
      supabaseCount(context.env, "ea_crawl_queue?status=eq.blocked"),
      supabaseCount(context.env, "ea_crawl_queue?status=eq.succeeded"),
      supabaseRest<ProfileRow[]>(context.env, "profiles?select=email,full_name,role,plan,created_at,club_id,player_id&order=created_at.desc&limit=25"),
      supabaseRest<ClubRow[]>(context.env, "clubs?select=id,name,ea_club_id,platform,country_code,created_at&order=created_at.desc&limit=25"),
      supabaseRest<RunRow[]>(context.env, "ea_crawl_runs?select=started_at,finished_at,status,source,clubs_processed,players_observed,matches_observed,error_count&order=started_at.desc&limit=15"),
      supabaseRest<QueueRow[]>(context.env, "ea_crawl_queue?priority=gte.90&select=club_id,status,priority,attempts,next_run_at,last_error&order=next_run_at.asc&limit=25"),
      supabaseRest<Array<{ created_at: string }>>(context.env, "ea_match_snapshots?select=created_at&order=created_at.desc&limit=1"),
    ]);

    const lastSnapshotAt = freshSnapshot[0]?.created_at || null;
    const ageHours = lastSnapshotAt ? (Date.now() - new Date(lastSnapshotAt).getTime()) / 3600000 : null;

    return Response.json({
      generatedAt: new Date().toISOString(),
      totals: { profiles, clubs, players, matches, snapshots, approvedClaims: claims, marketListings: listings, paidEntitlements: entitlements },
      growth: { newProfiles7d, snapshots24h },
      crawl: {
        healthy: ageHours !== null && ageHours < STALE_HOURS,
        lastSnapshotAt,
        lastSnapshotAgeHours: ageHours === null ? null : Number(ageHours.toFixed(1)),
        staleThresholdHours: STALE_HOURS,
        queue: { queued: queueQueued, failed: queueFailed, blocked: queueBlocked, succeeded: queueSucceeded },
        priorityQueue,
        runs: recentRuns,
      },
      recentProfiles,
      recentClubs,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ADMIN_OVERVIEW_FAILED";
    if (message.startsWith("AUTH_")) return apiError("Sessão inválida.", 401);
    console.error(JSON.stringify({ event: "admin_overview_failed", reason: message }));
    return apiError("Não foi possível carregar o painel.", 500);
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
