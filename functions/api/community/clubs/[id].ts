import { apiError, type FunctionContext } from "../../../_lib/billing";
import { refreshEaClub } from "../../../_lib/ea";
import { findClubByPublicRouteId, publicRouteId, supabaseRest } from "../../../_lib/supabase";

type ClubContext = FunctionContext & { params: { id: string } };

/**
 * Depois de quanto tempo o retrato da EA e considerado velho.
 *
 * Nao existe webhook da EA: a unica forma de saber que mudou e olhar de novo.
 * 30 minutos e o meio entre nao castigar a EA a cada visita e nao mostrar
 * numero de ontem numa pagina que anuncia dado oficial.
 */
const EA_STALE_MS = 30 * 60 * 1000;

const CLUB_COLUMNS =
  "id,ea_club_id,platform,name,ea_url,verified,country_code,skill_rating,wins,ties,losses,games_played,goals,goals_against,clean_sheets,goals_per_game,all_time_rank,current_division,reputation_level,last_synced_at";

const EA_SQUAD_COLUMNS =
  "id,gamertag,favorite_position,rating,games_played,goals,assists,win_rate,man_of_the_match,pass_success_rate,tackle_success_rate,clean_sheets_gk,last_synced_at";

interface ClubStatsRow {
  id: string;
  ea_club_id: string;
  platform: string;
  name: string;
  ea_url: string;
  verified: boolean;
  country_code: string | null;
  skill_rating: number | null;
  wins: number | null;
  ties: number | null;
  losses: number | null;
  games_played: number | null;
  goals: number | null;
  goals_against: number | null;
  clean_sheets: number | null;
  goals_per_game: number | null;
  all_time_rank: number | null;
  current_division: number | null;
  reputation_level: string | null;
  last_synced_at: string | null;
}

interface ClubMemberRow {
  id: string;
  full_name: string | null;
  role: string;
  country_slug: string | null;
  avatar_url: string | null;
  player_id: string | null;
}

interface PlayerRow {
  id: string;
  gamertag: string;
  favorite_position: string;
  rating: number;
}

interface EaSquadRow {
  id: string;
  gamertag: string;
  favorite_position: string | null;
  rating: number | null;
  games_played: number | null;
  goals: number | null;
  assists: number | null;
  win_rate: number | null;
  man_of_the_match: number | null;
  pass_success_rate: number | null;
  tackle_success_rate: number | null;
  clean_sheets_gk: number | null;
  last_synced_at: string | null;
}

export const onRequestGet = async (context: ClubContext) => {
  const { env, params } = context;
  try {
    const club = await findClubByPublicRouteId(env, params.id);
    if (!club) return apiError("Clube não encontrado.", 404);

    const before = (
      await supabaseRest<ClubStatsRow[]>(
        env,
        `clubs?id=eq.${encodeURIComponent(club.id)}&select=${CLUB_COLUMNS}&limit=1`,
      )
    )[0];
    if (!before) return apiError("Clube não encontrado.", 404);

    // Sem retrato nenhum, buscar na EA agora: a pagina publica nao pode
    // estrear com zeros so porque a fila do crawler ainda nao chegou aqui.
    // Com retrato velho, revalidar em segundo plano e servir o que ja existe.
    const age = before.last_synced_at ? Date.now() - new Date(before.last_synced_at).getTime() : Infinity;
    const refresh = { clubUuid: club.id, eaClubId: club.ea_club_id, platform: club.platform };
    if (!before.last_synced_at) {
      await refreshEaClub(env, supabaseRest, refresh);
    } else if (age > EA_STALE_MS) {
      context.waitUntil(refreshEaClub(env, supabaseRest, refresh));
    }

    const [stats, profiles, squad] = await Promise.all([
      before.last_synced_at
        ? Promise.resolve(before)
        : supabaseRest<ClubStatsRow[]>(
            env,
            `clubs?id=eq.${encodeURIComponent(club.id)}&select=${CLUB_COLUMNS}&limit=1`,
          ).then((rows) => rows[0] ?? before),
      supabaseRest<ClubMemberRow[]>(
        env,
        `profiles?club_id=eq.${encodeURIComponent(club.id)}&select=id,full_name,role,country_slug,avatar_url,player_id&order=created_at.asc&limit=100`,
      ),
      supabaseRest<EaSquadRow[]>(
        env,
        `players?club_id=eq.${encodeURIComponent(club.id)}&select=${EA_SQUAD_COLUMNS}&order=games_played.desc.nullslast&limit=60`,
      ),
    ]);

    const members = await Promise.all(
      profiles.map(async (profile) => {
        const player = profile.player_id
          ? (
              await supabaseRest<PlayerRow[]>(
                env,
                `players?id=eq.${encodeURIComponent(profile.player_id)}&select=id,gamertag,favorite_position,rating&limit=1`,
              )
            )[0]
          : null;
        return {
          id: profile.id,
          name: profile.full_name || "Jogador",
          role: profile.role,
          country: profile.country_slug || "brasil",
          avatarUrl: profile.avatar_url || undefined,
          player: player
            ? { id: player.id, name: player.gamertag, position: player.favorite_position, overall: player.rating }
            : undefined,
        };
      }),
    );

    const played = stats.games_played ?? 0;
    const wins = stats.wins ?? 0;

    return Response.json(
      {
        id: publicRouteId(club),
        name: stats.name,
        platform: club.platform,
        verified: club.verified,
        members,
        // Bloco EA no mesmo payload da pagina do clube da comunidade: os
        // numeros oficiais deixam de morar numa tela separada.
        ea: stats.last_synced_at
          ? {
              clubId: club.ea_club_id,
              sourceUrl: club.ea_url,
              syncedAt: stats.last_synced_at,
              skillRating: stats.skill_rating ?? 0,
              division: stats.current_division ?? undefined,
              rank: stats.all_time_rank ?? undefined,
              reputation: stats.reputation_level ?? undefined,
              played,
              wins,
              draws: stats.ties ?? 0,
              losses: stats.losses ?? 0,
              winRate: played > 0 ? Math.round((wins / played) * 1000) / 10 : 0,
              goalsFor: stats.goals ?? 0,
              goalsAgainst: stats.goals_against ?? 0,
              goalsPerGame: stats.goals_per_game ?? undefined,
              cleanSheets: stats.clean_sheets ?? 0,
              squad: squad.map((player) => ({
                id: player.id,
                name: player.gamertag,
                position: player.favorite_position ?? "—",
                rating: player.rating ?? undefined,
                played: player.games_played ?? 0,
                goals: player.goals ?? 0,
                assists: player.assists ?? 0,
                winRate: player.win_rate ?? undefined,
                manOfTheMatch: player.man_of_the_match ?? undefined,
                passSuccessRate: player.pass_success_rate ?? undefined,
                tackleSuccessRate: player.tackle_success_rate ?? undefined,
                cleanSheetsGk: player.clean_sheets_gk ?? undefined,
              })),
            }
          : undefined,
      },
      { headers: { "cache-control": "public, max-age=60" } },
    );
  } catch {
    return apiError("Não foi possível carregar o clube.", 500);
  }
};
