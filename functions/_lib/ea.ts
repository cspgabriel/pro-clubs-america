/**
 * Ponte unica com a API publica da EA (proclubs.ea.com).
 *
 * Antes deste arquivo o projeto falava com a EA em dois lugares que nao se
 * conheciam: `/api/ea` normalizava para a tela e o crawler externo mandava
 * payload bruto para `/api/internal/ea-ingest`. O cadastro de clube nao
 * falava com a EA nenhuma vez — o clube nascia vazio e so ganhava dados
 * quando a fila do crawler chegasse nele, o que podia levar horas.
 *
 * Aqui ficam as tres pecas que todos precisam: buscar na EA, normalizar
 * para o dominio da aplicacao e gravar no catalogo (clubs + players).
 * Quem cadastra clube chama `refreshEaClub` na hora; a pagina publica do
 * clube chama a mesma funcao quando o dado esta velho.
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

const num = (value: unknown) => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const ratio = (part: unknown, total: unknown) => {
  const a = Number(part);
  const b = Number(total);
  return Number.isFinite(a) && Number.isFinite(b) && b > 0 ? Math.round((a / b) * 1000) / 1000 : null;
};

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
// Gravacao no catalogo
// ------------------------------------------------------------

interface CatalogEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

type RestFn = <T>(env: CatalogEnv, path: string, init?: RequestInit) => Promise<T>;

export interface EaSyncSummary {
  clubUpdated: boolean;
  playersUpserted: number;
  name?: string;
}

/**
 * Grava no catalogo o que a EA devolveu para um clube.
 *
 * As colunas sao as mesmas que o crawler ja alimentava em
 * `functions/api/internal/ea-ingest.ts`; o que muda e a origem — aqui o
 * payload vem de uma chamada direta, nao de uma coleta agendada. Isso
 * mantem uma unica forma de dado no banco, seja quem tiver buscado.
 */
export async function syncEaClubToCatalog(
  env: CatalogEnv,
  supabaseRest: RestFn,
  input: { clubUuid: string; eaClubId: string; platform: string; payloads: EaClubPayloads },
): Promise<EaSyncSummary> {
  const summary: EaSyncSummary = { clubUpdated: false, playersUpserted: 0 };
  const now = new Date().toISOString();
  const { clubUuid, eaClubId, payloads } = input;

  const info = record(record(payloads.info)[eaClubId] || values(payloads.info)[0]);
  const stats = record(record(payloads.overall)[eaClubId] || values(payloads.overall)[0]);
  const members = values(record(payloads.members).members || payloads.members).map(record);
  const publishedName = text(pick(info, "name", "clubName"));

  if (Object.keys(stats).length || publishedName) {
    const games = num(pick(stats, "gamesPlayed", "games", "matches"));
    const patch: Record<string, unknown> = {
      skill_rating: num(pick(stats, "skillRating", "skillRatingValue")),
      wins: num(pick(stats, "wins", "win")),
      ties: num(pick(stats, "ties", "draws")),
      losses: num(pick(stats, "losses", "loss")),
      games_played: games,
      goals: num(pick(stats, "goals", "goalsFor")),
      goals_against: num(pick(stats, "goalsAgainst", "goalsConceded")),
      clean_sheets: num(stats.cleanSheets),
      goals_per_game: num(stats.goalsPerGame) ?? ratio(pick(stats, "goals", "goalsFor"), games),
      all_time_rank: num(stats.rank),
      current_division: num(pick(stats, "currentDivision", "division")),
      reputation_level: text(pick(info, "reputation", "reputationLevel")) || null,
      source_payload: {
        overallStats: stats,
        info,
        memberNames: members.map((member) => text(member.name).slice(0, 80)).filter(Boolean),
        observedAt: now,
      },
      last_synced_at: now,
      updated_at: now,
    };
    // O nome oficial da EA vence o que o usuario digitou no cadastro; se a EA
    // nao publicou nome, o digitado permanece.
    if (publishedName) {
      patch.name = publishedName.slice(0, 120);
      summary.name = patch.name as string;
    }
    // Chave nula significa "a EA nao publicou este campo agora" — deixar o
    // valor anterior no banco em vez de zerar um historico bom.
    for (const key of Object.keys(patch)) {
      if (patch[key] === null && key !== "reputation_level") delete patch[key];
    }

    await supabaseRest(env, `clubs?id=eq.${encodeURIComponent(clubUuid)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });
    summary.clubUpdated = true;
  }

  const rows = members
    .map((member) => {
      const gamertag = text(member.name).slice(0, 80);
      if (!gamertag) return null;
      const games = num(pick(member, "gamesPlayed", "games"));
      return {
        club_id: clubUuid,
        gamertag,
        favorite_position: text(pick(member, "favoritePosition", "position")).slice(0, 40) || null,
        rating: num(pick(member, "ratingAve", "rating", "averageRating")),
        games_played: games,
        goals: num(member.goals),
        assists: num(member.assists),
        passes_made: num(pick(member, "passesMade", "passes")),
        pass_success_rate: num(pick(member, "passSuccessRate", "passSuccess")),
        tackles_made: num(pick(member, "tacklesMade", "tackles")),
        tackle_success_rate: num(pick(member, "tackleSuccessRate", "tackleSuccess")),
        clean_sheets_def: num(member.cleanSheetsDef),
        clean_sheets_gk: num(pick(member, "cleanSheetsGK", "cleanSheetsGk")),
        man_of_the_match: num(pick(member, "manOfTheMatch", "motm")),
        win_rate: num(member.winRate),
        source_payload: { member, observedAt: now },
        goals_per_game: ratio(member.goals, games),
        assists_per_game: ratio(member.assists, games),
        tackles_per_game: ratio(pick(member, "tacklesMade", "tackles"), games),
        last_synced_at: now,
        updated_at: now,
      };
    })
    .filter(Boolean);

  if (rows.length) {
    await supabaseRest(env, "players?on_conflict=club_id,gamertag", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows),
    });
    summary.playersUpserted = rows.length;
  }

  return summary;
}

/**
 * Busca na EA e grava, numa chamada. Nunca lanca: o cadastro do clube e a
 * pagina publica precisam continuar funcionando se a EA estiver fora.
 */
export async function refreshEaClub(
  env: CatalogEnv,
  supabaseRest: RestFn,
  input: { clubUuid: string; eaClubId: string; platform: string },
): Promise<EaSyncSummary & { ok: boolean; error?: string }> {
  if (!/^\d{1,12}$/.test(input.eaClubId) || !EA_PLATFORMS.has(input.platform)) {
    return { ok: false, clubUpdated: false, playersUpserted: 0, error: "EA_PARAMS_INVALID" };
  }
  try {
    const payloads = await fetchEaClubPayloads(input.eaClubId, input.platform);
    const summary = await syncEaClubToCatalog(env, supabaseRest, { ...input, payloads });
    return { ok: true, ...summary };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "EA_UNAVAILABLE";
    console.error(JSON.stringify({ event: "ea_refresh_failed", eaClubId: input.eaClubId, reason }));
    return { ok: false, clubUpdated: false, playersUpserted: 0, error: reason };
  }
}
