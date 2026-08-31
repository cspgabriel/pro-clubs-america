import { apiError, type FunctionContext } from "../../_lib/billing";
import { supabaseRest } from "../../_lib/supabase";
import { repairPublicText } from "../../_lib/text";

interface Discovery { clubId?: string; name?: string; platform?: string }

const PLATFORMS = new Set(["common-gen5", "common-gen4", "nx"]);
const safeText = (value: unknown, max: number) => repairPublicText(value).slice(0, max);

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function authorized(request: Request, secret?: string) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !supplied) return false;
  return (await digest(supplied)) === (await digest(secret));
}

/**
 * Cadastra clubes vistos no ranking publico da EA e os enfileira com prioridade
 * baixa. O catalogo inicial veio de uma leitura unica de ~557 clubes; e daqui
 * que ele cresce para alem disso.
 */
export const onRequestPost = async (context: FunctionContext) => {
  if (!(await authorized(context.request, context.env.EA_INGEST_SECRET))) return apiError("INGEST_AUTH_REQUIRED", 401);

  const body = await context.request.json().catch(() => null) as { discoveries?: Discovery[] } | null;
  const input = Array.isArray(body?.discoveries) ? body.discoveries.slice(0, 500) : [];
  if (!input.length) return Response.json({ created: 0, queued: 0, skipped: 0 });

  const now = new Date().toISOString();
  const rows = input.map((item) => {
    const eaClubId = safeText(item.clubId, 20);
    const platform = safeText(item.platform || "common-gen5", 30);
    if (!/^\d{1,12}$/.test(eaClubId) || !PLATFORMS.has(platform)) return null;
    return {
      platform, ea_club_id: eaClubId,
      name: safeText(item.name, 140) || `Clube ${eaClubId}`,
      ea_url: `https://www.ea.com/pt-br/games/ea-sports-fc/clubs/overview?clubId=${eaClubId}&platform=${platform}`,
      source_url: `https://proclubs.ea.com/api/fc/clubs/info?platform=${platform}&clubIds=${eaClubId}`,
      verified: false, updated_at: now,
    };
  }).filter(Boolean);

  if (!rows.length) return Response.json({ created: 0, queued: 0, skipped: input.length });

  const clubs = await supabaseRest<Array<{ id: string }>>(context.env, "clubs?on_conflict=platform,ea_club_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(rows),
  });

  let queued = 0;
  if (clubs.length) {
    await supabaseRest(context.env, "ea_crawl_queue?on_conflict=club_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(clubs.map((club) => ({ club_id: club.id, priority: 5, status: "queued", next_run_at: now, updated_at: now }))),
    }).catch(() => undefined);
    queued = clubs.length;
  }

  return Response.json({ created: clubs.length, queued, skipped: input.length - rows.length }, { headers: { "cache-control": "no-store" } });
};

export const onRequest = () => apiError("Metodo nao permitido.", 405);
