type EaRecord = Record<string, unknown>;

const platforms = new Set(["common-gen5", "common-gen4", "nx"]);
const baseUrl = "https://proclubs.ea.com/api/fc";
const headers = {
  accept: "application/json",
  "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8",
  referer: "https://www.ea.com/",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
};

const record = (value: unknown): EaRecord => value && typeof value === "object" && !Array.isArray(value) ? value as EaRecord : {};
const text = (value: unknown, fallback = "") => typeof value === "string" || typeof value === "number" ? String(value).trim() : fallback;
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : undefined;
const values = (value: unknown) => Array.isArray(value) ? value : Object.values(record(value));
const pick = (row: EaRecord, ...keys: string[]) => keys.map((key) => row[key]).find((value) => value != null && value !== "");

async function ea(path: string, params: URLSearchParams) {
  const response = await fetch(`${baseUrl}/${path}?${params}`, { headers });
  if (!response.ok) throw new Error(`EA_${response.status}`);
  return response.json() as Promise<unknown>;
}

function normalizeClub(clubId: string, platform: string, infoPayload: unknown, overallPayload: unknown, membersPayload: unknown, matchesPayload: unknown) {
  const info = record(record(infoPayload)[clubId] || values(infoPayload)[0]);
  const overall = record(record(overallPayload)[clubId] || values(overallPayload)[0]);
  const clubName = text(pick(info, "name", "clubName"), `Clube ${clubId}`);
  const rawMembers = values(record(membersPayload).members || membersPayload);
  const players = rawMembers.map(record).map((member) => {
    const name = text(pick(member, "name", "proName", "playerName"));
    if (!name) return null;
    return {
      id: text(pick(member, "playerId", "personaId", "name"), name), name,
      position: text(pick(member, "position", "favoritePosition"), "—"),
      gamesPlayed: number(pick(member, "gamesPlayed", "games")), goals: number(member.goals), assists: number(member.assists),
      averageRating: number(pick(member, "rating", "averageRating")), overallRating: number(pick(member, "proOverall", "proOverallStr")),
      passesMade: number(pick(member, "passesMade", "passes")), passSuccessRate: number(pick(member, "passSuccessRate", "passSuccess")),
      tacklesMade: number(pick(member, "tacklesMade", "tackles")), tackleSuccessRate: number(pick(member, "tackleSuccessRate", "tackleSuccess")),
      cleanSheets: number(pick(member, "cleanSheets", "cleanSheetsDef", "cleanSheetsGk")), winRate: number(member.winRate),
      manOfTheMatch: number(pick(member, "manOfTheMatch", "motm")),
    };
  }).filter(Boolean);
  const matches = values(matchesPayload).map(record).map((match) => {
    const clubs = values(match.clubs).map(record);
    if (clubs.length < 2) return null;
    const [home, away] = clubs;
    const timestamp = number(pick(match, "timestamp", "matchTimestamp"));
    if (!timestamp) return null;
    return {
      id: text(pick(match, "matchId", "id"), `${clubId}-${timestamp}`), mode: "leagueMatch",
      playedAt: new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp).toISOString(),
      homeClubId: text(pick(home, "clubId", "id")), awayClubId: text(pick(away, "clubId", "id")),
      homeClubName: text(pick(home, "name", "clubName"), "Casa"), awayClubName: text(pick(away, "name", "clubName"), "Visitante"),
      homeScore: number(pick(home, "goals", "score")) ?? 0, awayScore: number(pick(away, "goals", "score")) ?? 0,
      competition: "EA SPORTS FC Clubs", sourceUrl: `https://www.ea.com/pt-br/games/ea-sports-fc/clubs/match-history?clubId=${clubId}&platform=${platform}`, players: [],
    };
  }).filter(Boolean);
  return {
    club: {
      id: platform === "common-gen5" ? clubId : `${platform}-${clubId}`, name: clubName, platform,
      sourceUrl: `https://www.ea.com/pt-br/games/ea-sports-fc/clubs/overview?clubId=${clubId}&platform=${platform}`,
      overview: {
        skillRating: number(pick(info, "skillRating", "skillRatingValue")) ?? 0, reputation: text(pick(info, "reputation", "reputationLevel")),
        wins: number(pick(overall, "wins", "win")) ?? 0, draws: number(pick(overall, "draws", "ties")) ?? 0, losses: number(pick(overall, "losses", "loss")) ?? 0,
        totalMatches: number(pick(overall, "gamesPlayed", "games", "matches")) ?? 0, goalsFor: number(pick(overall, "goals", "goalsFor")) ?? 0, goalsAgainst: number(pick(overall, "goalsAgainst", "goalsConceded")) ?? 0,
        leagueAppearances: 0, playoffAppearances: 0, members: players.length, midfielders: 0, forwards: 0, defenders: 0, goalkeepers: 0,
      },
    },
    source: { state: "live", fetchedAt: new Date().toISOString(), note: "Dados consultados agora na fonte pública da EA." }, players, matches,
  };
}

export const onRequestGet = async ({ request }: { request: Request }) => {
  const query = new URL(request.url).searchParams;
  const clubId = query.get("clubId") || "";
  const platform = query.get("platform") || "common-gen5";
  if (!/^\d{1,12}$/.test(clubId) || !platforms.has(platform)) return Response.json({ error: "Parâmetros inválidos." }, { status: 400 });
  try {
    const common = new URLSearchParams({ platform, clubIds: clubId });
    const [info, overall, members, matches] = await Promise.all([
      ea("clubs/info", common), ea("clubs/overallStats", common),
      ea("members/career/stats", new URLSearchParams({ platform, clubId })),
      ea("clubs/matches", new URLSearchParams({ platform, clubIds: clubId, matchType: "gameType9", maxResultCount: "10" })),
    ]);
    return Response.json(normalizeClub(clubId, platform, info, overall, members, matches), { headers: { "cache-control": "public, max-age=60, s-maxage=60" } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "EA_UNAVAILABLE";
    return Response.json({ error: "A EA não respondeu à consulta ao vivo.", code: reason }, { status: 503, headers: { "cache-control": "no-store" } });
  }
};

export const onRequest = () => Response.json({ error: "Método não permitido." }, { status: 405, headers: { allow: "GET" } });
