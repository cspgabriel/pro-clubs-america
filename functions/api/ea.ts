import { EA_PLATFORMS, fetchEaClubPayloads, normalizeEaClub } from "../_lib/ea";

/**
 * Consulta ao vivo na fonte publica da EA.
 *
 * A busca e a normalizacao vivem em `functions/_lib/ea.ts` porque o cadastro
 * de clube e a pagina publica do clube da comunidade usam exatamente o mesmo
 * caminho. Este arquivo e so a porta HTTP.
 */
export const onRequestGet = async ({ request }: { request: Request }) => {
  const query = new URL(request.url).searchParams;
  const clubId = query.get("clubId") || "";
  const platform = query.get("platform") || "common-gen5";
  if (!/^\d{1,12}$/.test(clubId) || !EA_PLATFORMS.has(platform)) {
    return Response.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }
  try {
    const payloads = await fetchEaClubPayloads(clubId, platform);
    return Response.json(normalizeEaClub(clubId, platform, payloads), {
      headers: { "cache-control": "public, max-age=60, s-maxage=60" },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "EA_UNAVAILABLE";
    return Response.json(
      { error: "A EA não respondeu à consulta ao vivo.", code: reason },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
};

export const onRequest = () =>
  Response.json({ error: "Método não permitido." }, { status: 405, headers: { allow: "GET" } });
