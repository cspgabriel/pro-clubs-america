import { type FunctionContext } from "../_lib/billing";
import { supabaseRest } from "../_lib/supabase";

export const onRequestGet = async ({ env }: FunctionContext) => {
  try {
    const [runs, snapshots, queue] = await Promise.all([
      supabaseRest<Array<{ finished_at: string; parser_version: string; status: string }>>(env, "ea_crawl_runs?status=eq.succeeded&order=finished_at.desc&limit=1"),
      supabaseRest<Array<{ observed_at: string }>>(env, "ea_match_snapshots?order=observed_at.desc&limit=1"),
      supabaseRest<Array<{ id: string }>>(env, "ea_crawl_queue?status=in.(queued,running)&select=id&limit=1000"),
    ]);
    const latest = snapshots[0]?.observed_at || null;
    return Response.json({ ok: true, service: "pro-clubs-america", database: "supabase", auth: "firebase", crawler: { state: runs[0] ? "ingestion-ready" : "awaiting-authorized-source", lastSuccessfulCrawl: runs[0]?.finished_at || null, lastObservation: latest, dataAgeSeconds: latest ? Math.max(0, Math.round((Date.now() - new Date(latest).getTime()) / 1000)) : null, queueDepth: queue.length, parserVersion: runs[0]?.parser_version || null } }, { headers: { "cache-control": "no-store" } });
  } catch { return Response.json({ ok: false, service: "pro-clubs-america", database: "unavailable" }, { status: 503 }); }
};
