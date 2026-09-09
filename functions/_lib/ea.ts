/**
 * Ponte unica com os dados publicos da EA.
 *
 * Duas coisas convivem aqui, e a diferenca entre elas importa:
 *
 * 1. `fetchEaClubPayloads` + `normalizeEaClub` — consulta direta a
 *    proclubs.ea.com. Funciona de fora da Cloudflare (o `npm run crawl:ea`
 *    local, por exemplo). **De dentro de uma Pages Function a EA responde
 *    403**, sempre; e por isso que `/api/ea` tem fallback para o catalogo.
 *
 * 2. `requestEaClubRefresh` — o caminho que de fato traz dado novo em
 *    producao. Enfileira o clube e aciona o Worker `ea-crawler`, que abre a
 *    pagina publica com Browser Rendering (Chrome real, nao `fetch`) e
 *    devolve a coleta para `/api/internal/ea-ingest`. E o unico caminho que
 *    a EA aceita, e e o que o cadastro de clube e a pagina publica usam.
 *
 * Antes disto o cadastro nao pedia coleta nenhuma: o clube nascia vazio e
 * esperava a vez na fila horaria, o que podia levar horas.
 */

export type EaRecord = Record<string, unknown>;

export const EA_PLATFORMS = new Set(["common-gen5", "common-gen4", "nx"]);

const BASE_URL = "https://proclubs.ea.com/api/fc";

const HEADERS = {
  accept: "application/json",
  "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8",
  referer: "https://www.ea.com/",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
};

export const record = (value: unknown): EaRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as EaRecord) : {};
export const text = (value: unknown, fallback = "") =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : fallback;
export const number = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : undefined);
export const values = (value: unknown) => (Array.isArray(value) ? value : Object.values(record(value)));
export const pick = (row: EaRecord, ...keys: string[]) =>
  keys.map((key) => row[key]).find((value) => value != null && value !== "");

async function ea(path: string, params: URLSearchParams) {
  const response = await fetch(`${BASE_URL}/${path}?${params}`, { headers: HEADERS });
  if (!response.ok) throw new Error(`EA_${response.status}`);
  return response.json() as Promise<unknown>;
}

export interface EaClubPayloads {
  info: unknown;
  overall: unknown;
  members: unknown;
  matches: unknown;
}

/**
 * Uma unica ida a EA por clube. As quatro chamadas sao paralelas porque a
 * EA responde cada endpoint de forma independente e a lentidao aqui aparece
 * na tela de cadastro do usuario.
 */
export async function fetchEaClubPayloads(clubId: string, platform: string): Promise<EaClubPayloads> {
  const common = new URLSearchParams({ platform, clubIds: clubId });
  const [info, overall, members, matches] = await Promise.all([
    ea("clubs/info", common),
    ea("clubs/overallStats", common),
    ea("members/career/stats", new URLSearchParams({ platform, clubId })),
    ea(
      "clubs/matches",
      new URLSearchParams({ platform, clubIds: clubId, matchType: "gameType9", maxResultCount: "10" }),
    ),
  ]);
  return { info, overall, members, matches };
}

export function normalizeEaClub(clubId: string, platform: string, payloads: EaClubPayloads) {
  const { info: infoPayload, overall: overallPayload, members: membersPayload, matches: matchesPayload } = payloads;
  const info = record(record(infoPayload)[clubId] || values(infoPayload)[0]);
  const overall = record(record(overallPayload)[clubId] || values(overallPayload)[0]);
  const clubName = text(pick(info, "name", "clubName"), `Clube ${clubId}`);
  const rawMembers = values(record(membersPayload).members || membersPayload);
  const players = rawMembers
    .map(record)
    .map((member) => {
      const name = text(pick(member, "name", "proName", "playerName"));
      if (!name) return null;
      return {
        id: text(pick(member, "playerId", "personaId", "name"), name),
        name,
        position: text(pick(member, "position", "favoritePosition"), "—"),
        gamesPlayed: number(pick(member, "gamesPlayed", "games")),
        goals: number(member.goals),
        assists: number(member.assists),
        averageRating: number(pick(member, "rating", "averageRating", "ratingAve")),
        overallRating: number(pick(member, "proOverall", "proOverallStr")),
        passesMade: number(pick(member, "passesMade", "passes")),
        passSuccessRate: number(pick(member, "passSuccessRate", "passSuccess")),
        tacklesMade: number(pick(member, "tacklesMade", "tackles")),
        tackleSuccessRate: number(pick(member, "tackleSuccessRate", "tackleSuccess")),
        cleanSheets: number(pick(member, "cleanSheets", "cleanSheetsDef", "cleanSheetsGk")),
        winRate: number(member.winRate),
        manOfTheMatch: number(pick(member, "manOfTheMatch", "motm")),
      };
    })
    .filter(Boolean);
  const matches = values(matchesPayload)
    .map(record)
    .map((match) => {
      const clubs = values(match.clubs).map(record);
      if (clubs.length < 2) return null;
      const [home, away] = clubs;
      const timestamp = number(pick(match, "timestamp", "matchTimestamp"));
      if (!timestamp) return null;
      return {
        id: text(pick(match, "matchId", "id"), `${clubId}-${timestamp}`),
        mode: "leagueMatch",
        playedAt: new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp).toISOString(),
        homeClubId: text(pick(home, "clubId", "id")),
        awayClubId: text(pick(away, "clubId", "id")),
        homeClubName: text(pick(home, "name", "clubName"), "Casa"),
        awayClubName: text(pick(away, "name", "clubName"), "Visitante"),
        homeScore: number(pick(home, "goals", "score")) ?? 0,
        awayScore: number(pick(away, "goals", "score")) ?? 0,
        competition: "EA SPORTS FC Clubs",
        sourceUrl: `https://www.ea.com/pt-br/games/ea-sports-fc/clubs/match-history?clubId=${clubId}&platform=${platform}`,
        players: [],
      };
    })
    .filter(Boolean);
  return {
    club: {
      id: platform === "common-gen5" ? clubId : `${platform}-${clubId}`,
      name: clubName,
      platform,
      sourceUrl: `https://www.ea.com/pt-br/games/ea-sports-fc/clubs/overview?clubId=${clubId}&platform=${platform}`,
      overview: {
        skillRating: number(pick(info, "skillRating", "skillRatingValue")) ?? 0,
        reputation: text(pick(info, "reputation", "reputationLevel")),
        wins: number(pick(overall, "wins", "win")) ?? 0,
        draws: number(pick(overall, "draws", "ties")) ?? 0,
        losses: number(pick(overall, "losses", "loss")) ?? 0,
        totalMatches: number(pick(overall, "gamesPlayed", "games", "matches")) ?? 0,
        goalsFor: number(pick(overall, "goals", "goalsFor")) ?? 0,
        goalsAgainst: number(pick(overall, "goalsAgainst", "goalsConceded")) ?? 0,
        leagueAppearances: 0,
        playoffAppearances: 0,
        members: players.length,
        midfielders: 0,
        forwards: 0,
        defenders: 0,
        goalkeepers: 0,
      },
    },
    source: {
      state: "live",
      fetchedAt: new Date().toISOString(),
      note: "Dados consultados agora na fonte pública da EA.",
    },
    players,
    matches,
  };
}


// ------------------------------------------------------------
// Coleta em producao: Worker ea-crawler (Browser Rendering)
// ------------------------------------------------------------

/** URL publica do Worker coletor, com override por variavel de ambiente. */
const DEFAULT_CRAWLER_URL = "https://pro-clubs-america-ea-crawler.cspgabriel.workers.dev/";

interface RefreshEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  EA_INGEST_SECRET?: string;
  EA_CRAWLER_URL?: string;
}

type RestFn = <T>(env: RefreshEnv, path: string, init?: RequestInit) => Promise<T>;

export interface EaRefreshResult {
  ok: boolean;
  /** Status devolvido pelo coletor: succeeded, failed, blocked ou idle. */
  status?: string;
  error?: string;
}

/**
 * Pede uma coleta agora para um clube.
 *
 * Sao dois passos, e os dois importam: a fila e a fonte de verdade de
 * "quem precisa ser coletado" (o cron horario le dela), e o coletor so
 * atende um clube que esteja nela. Enfileirar antes garante que, se a
 * chamada ao Worker falhar, a coleta ainda acontece na proxima hora — o
 * pedido nao se perde, so demora.
 *
 * Uma coleta com Browser Rendering leva dezenas de segundos. O cadastro de
 * clube espera (o dono nao pode abrir o proprio clube e ver zeros); a pagina
 * publica pede em `waitUntil` e serve o retrato que ja tem. Quem espera
 * passa `timeoutMs` para nao ficar pendurado se o coletor travar — estourar
 * o teto nao perde nada, porque a fila ja recebeu o pedido.
 *
 * Nunca lanca.
 */
export async function requestEaClubRefresh(
  env: RefreshEnv,
  supabaseRest: RestFn,
  input: { clubUuid: string; eaClubId: string; platform: string; priority?: number; timeoutMs?: number },
): Promise<EaRefreshResult> {
  if (!/^\d{1,12}$/.test(input.eaClubId) || !EA_PLATFORMS.has(input.platform)) {
    return { ok: false, error: "EA_PARAMS_INVALID" };
  }
  const now = new Date().toISOString();

  try {
    await supabaseRest(env, "ea_crawl_queue?on_conflict=club_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        club_id: input.clubUuid,
        priority: input.priority ?? 90,
        status: "queued",
        next_run_at: now,
        updated_at: now,
      }),
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "ea_enqueue_failed",
        eaClubId: input.eaClubId,
        reason: error instanceof Error ? error.message : "UNKNOWN",
      }),
    );
  }

  // O coletor exige o mesmo segredo da ingestao. Sem ele, o clube fica
  // enfileirado e o cron horario resolve — degradado, nao quebrado.
  if (!env.EA_INGEST_SECRET) return { ok: false, status: "queued", error: "EA_INGEST_SECRET_MISSING" };

  try {
    const crawler = new URL(env.EA_CRAWLER_URL || DEFAULT_CRAWLER_URL);
    crawler.searchParams.set("clubId", input.eaClubId);
    const response = await fetch(crawler, {
      headers: { authorization: `Bearer ${env.EA_INGEST_SECRET}` },
      signal: input.timeoutMs ? AbortSignal.timeout(input.timeoutMs) : undefined,
    });
    const payload = (await response.json().catch(() => null)) as { status?: string; error?: string } | null;
    if (!response.ok) throw new Error(payload?.error || `CRAWLER_${response.status}`);
    return { ok: payload?.status === "succeeded", status: payload?.status };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "CRAWLER_UNAVAILABLE";
    console.error(JSON.stringify({ event: "ea_crawl_request_failed", eaClubId: input.eaClubId, reason }));
    return { ok: false, status: "queued", error: reason };
  }
}
