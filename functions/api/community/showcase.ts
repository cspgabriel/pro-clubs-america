import { apiError, assertSameOrigin, verifyFirebaseRequest, type FunctionContext } from "../../_lib/billing";
import { ensureProfile, supabaseRest } from "../../_lib/supabase";

interface ShowcaseRow {
  profile_id: string;
  overall: number | null;
  positions: string[] | null;
  archetypes: string[] | null;
  photo_urls: string[] | null;
  youtube_urls: string[] | null;
}

const MAX_PHOTOS = 3;
const MAX_VIDEOS = 5;

function textList(value: unknown, maximum: number) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim().slice(0, 40)).filter(Boolean))].slice(0, maximum);
}

function youtubeUrl(value: unknown) {
  try {
    const url = new URL(String(value));
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const id = host === "youtu.be" ? url.pathname.slice(1) : host === "youtube.com" ? url.searchParams.get("v") : null;
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? `https://www.youtube.com/watch?v=${id}` : null;
  } catch { return null; }
}

function payload(row?: ShowcaseRow) {
  return {
    overall: row?.overall ?? null,
    positions: row?.positions ?? [],
    archetypes: row?.archetypes ?? [],
    photoUrls: row?.photo_urls ?? [],
    youtubeUrls: row?.youtube_urls ?? [],
  };
}

async function ownProfile(context: FunctionContext) {
  const identity = await verifyFirebaseRequest(context.request, context.env);
  return ensureProfile(context.env, identity, identity.name);
}

export const onRequestGet = async (context: FunctionContext) => {
  try {
    const profile = await ownProfile(context);
    const row = (await supabaseRest<ShowcaseRow[]>(context.env, `profile_showcases?profile_id=eq.${encodeURIComponent(profile.id)}&limit=1`))[0];
    return Response.json(payload(row), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SHOWCASE_FAILED";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível carregar sua vitrine.", message.startsWith("AUTH_") ? 401 : 500);
  }
};

export const onRequestPatch = async (context: FunctionContext) => {
  try {
    assertSameOrigin(context.request, context.env.SITE_URL);
    const profile = await ownProfile(context);
    const body = await context.request.json() as { overall?: unknown; positions?: unknown; archetypes?: unknown; photoUrls?: unknown; youtubeUrls?: unknown };
    const overallNumber = body.overall === null || body.overall === "" ? null : Number(body.overall);
    if (overallNumber !== null && (!Number.isInteger(overallNumber) || overallNumber < 1 || overallNumber > 99)) return apiError("OVR deve estar entre 1 e 99.", 400);
    const base = `${context.env.SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/profile-showcase/${profile.id}/`;
    const photoUrls = textList(body.photoUrls, MAX_PHOTOS).filter((url) => url.startsWith(base));
    const youtubeUrls = textList(body.youtubeUrls, MAX_VIDEOS).map(youtubeUrl).filter((url): url is string => Boolean(url));
    const rows = await supabaseRest<ShowcaseRow[]>(context.env, "profile_showcases?on_conflict=profile_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ profile_id: profile.id, overall: overallNumber, positions: textList(body.positions, 4), archetypes: textList(body.archetypes, 5), photo_urls: photoUrls, youtube_urls: [...new Set(youtubeUrls)], updated_at: new Date().toISOString() }),
    });
    return Response.json(payload(rows[0]));
  } catch (error) {
    const message = error instanceof Error ? error.message : "SHOWCASE_SAVE_FAILED";
    return apiError(message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível salvar sua vitrine.", message.startsWith("AUTH_") ? 401 : 500);
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
