import { apiError, assertSameOrigin, verifyFirebaseRequest, type FunctionContext } from "../../../_lib/billing";
import { pushConfigured, sendPushToProfiles } from "../../../_lib/push";
import { ensureProfile, supabaseRest, type SupabaseProfile } from "../../../_lib/supabase";
import {
  buildDraw,
  buildKnockoutSeeding,
  groupStandings,
  stageLabel,
  validateFormat,
  type MatchStage,
  type StandingRow,
  type TournamentFormat,
} from "../../../_lib/tournaments";
import { serializeTournament, TOURNAMENT_COLUMNS, type TournamentRow } from "../tournaments";

type TournamentContext = FunctionContext & { params: { id: string } };

interface RegistrationRow {
  id: string;
  tournament_id: string;
  club_id: string;
  status: string;
  seed: number | null;
  group_label: string | null;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  eliminated_at: string | null;
  final_position: number | null;
  created_at: string;
}

interface MatchRow {
  id: string;
  stage: MatchStage;
  round: number;
  group_label: string | null;
  slot: number;
  home_registration_id: string | null;
  away_registration_id: string | null;
  home_club_id: string | null;
  away_club_id: string | null;
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  status: string;
  result_source: string | null;
  disputed_at: string | null;
  resolution_note: string | null;
  winner_registration_id: string | null;
  next_match_id: string | null;
  scheduled_at: string | null;
  reported_at: string | null;
}

interface MatchReportRow {
  id: string;
  match_id: string;
  registration_id: string;
  club_id: string;
  home_score: number;
  away_score: number;
  home_penalties: number | null;
  away_penalties: number | null;
  evidence_url: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

interface ClubRow {
  id: string;
  name: string;
  platform: string;
  ea_club_id: string;
  skill_rating: number | null;
}

const REGISTRATION_COLUMNS =
  "id,tournament_id,club_id,status,seed,group_label,points,played,wins,draws,losses,goals_for,goals_against,eliminated_at,final_position,created_at";
const MATCH_COLUMNS =
  "id,stage,round,group_label,slot,home_registration_id,away_registration_id,home_club_id,away_club_id,home_score,away_score,home_penalties,away_penalties,status,result_source,disputed_at,resolution_note,winner_registration_id,next_match_id,scheduled_at,reported_at";
const REPORT_COLUMNS =
  "id,match_id,registration_id,club_id,home_score,away_score,home_penalties,away_penalties,evidence_url,note,created_at,updated_at";

/** Um confronto ainda aceita sumula enquanto o resultado nao fechou. */
const ACCEPTS_REPORT = ["scheduled", "awaiting_result", "disputed"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** O identificador da URL e o slug; o uuid so aparece nas chamadas internas. */
async function findTournament(env: FunctionContext["env"], key: string): Promise<TournamentRow | null> {
  const filter = UUID.test(key) ? `id=eq.${encodeURIComponent(key)}` : `slug=eq.${encodeURIComponent(key)}`;
  const rows = await supabaseRest<TournamentRow[]>(env, `tournaments?${filter}&select=${TOURNAMENT_COLUMNS}&limit=1`);
  return rows[0] ?? null;
}

async function loadClubs(env: FunctionContext["env"], ids: Array<string | null>): Promise<Map<string, ClubRow>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (!unique.length) return new Map();
  const rows = await supabaseRest<ClubRow[]>(
    env,
    `clubs?id=in.(${unique.map(encodeURIComponent).join(",")})&select=id,name,platform,ea_club_id,skill_rating`,
  );
  return new Map(rows.map((row) => [row.id, row]));
}

/**
 * Quem recebe o aviso por um clube: dono e capitao — os mesmos que podem
 * agir. Avisar o elenco inteiro sobre uma sumula que so o capitao lanca
 * seria barulho.
 */
async function clubManagerProfileIds(env: FunctionContext["env"], clubId: string | null): Promise<string[]> {
  if (!clubId) return [];
  const rows = await supabaseRest<Array<{ id: string }>>(
    env,
    `profiles?club_id=eq.${encodeURIComponent(clubId)}&role=in.(owner,captain)&select=id`,
  );
  return rows.map((row) => row.id);
}

const canManageClub = (profile: SupabaseProfile, clubId: string | null) =>
  Boolean(clubId) &&
  (profile.role === "admin" || (profile.club_id === clubId && (profile.role === "owner" || profile.role === "captain")));

const canAdminister = (profile: SupabaseProfile, tournament: TournamentRow) =>
  profile.role === "admin" || profile.id === tournament.organizer_profile_id;

async function authenticated(context: FunctionContext) {
  const identity = await verifyFirebaseRequest(context.request, context.env);
  return ensureProfile(context.env, identity, identity.name);
}

function toStandingRows(registrations: RegistrationRow[], clubs: Map<string, ClubRow>): StandingRow[] {
  return registrations
    .filter((row) => row.status === "confirmed" && row.group_label)
    .map((row) => ({
      registrationId: row.id,
      clubId: row.club_id,
      clubName: clubs.get(row.club_id)?.name ?? "Clube",
      groupLabel: row.group_label,
      points: row.points,
      played: row.played,
      wins: row.wins,
      draws: row.draws,
      losses: row.losses,
      goalsFor: row.goals_for,
      goalsAgainst: row.goals_against,
    }));
}

// ------------------------------------------------------------

export const onRequestGet = async (context: TournamentContext) => {
  try {
    const tournament = await findTournament(context.env, context.params.id);
    if (!tournament) return apiError("Campeonato não encontrado.", 404);

    let profile: SupabaseProfile | null = null;
    try {
      profile = await authenticated(context);
    } catch {
      profile = null;
    }

    // Rascunho e proposta em analise so existem para quem os administra.
    const hidden = ["draft", "pending_approval", "rejected"].includes(tournament.status);
    if (hidden && !(profile && canAdminister(profile, tournament))) {
      return apiError("Campeonato não encontrado.", 404);
    }

    const [registrations, matches] = await Promise.all([
      supabaseRest<RegistrationRow[]>(
        context.env,
        `tournament_registrations?tournament_id=eq.${tournament.id}&select=${REGISTRATION_COLUMNS}&order=created_at.asc`,
      ),
      supabaseRest<MatchRow[]>(
        context.env,
        `tournament_matches?tournament_id=eq.${tournament.id}&select=${MATCH_COLUMNS}&order=round.asc,slot.asc`,
      ),
    ]);

    // As sumulas de todos os confrontos desta edicao, agrupadas por jogo.
    const reports = matches.length
      ? await supabaseRest<MatchReportRow[]>(
          context.env,
          `tournament_match_reports?match_id=in.(${matches.map((row) => row.id).join(",")})&select=${REPORT_COLUMNS}`,
        )
      : [];
    const reportsByMatch = new Map<string, MatchReportRow[]>();
    reports.forEach((row) => {
      const list = reportsByMatch.get(row.match_id) ?? [];
      list.push(row);
      reportsByMatch.set(row.match_id, list);
    });

    const clubs = await loadClubs(context.env, [
      ...registrations.map((row) => row.club_id),
      ...matches.flatMap((row) => [row.home_club_id, row.away_club_id]),
    ]);
    const club = (id: string | null) => {
      const found = id ? clubs.get(id) : null;
      return found ? { id: found.id, name: found.name, platform: found.platform, eaClubId: found.ea_club_id } : null;
    };

    const standings = toStandingRows(registrations, clubs);
    const byGroup = groupStandings(standings);

    const viewerClubId = profile?.club_id ?? null;
    const myRegistration = viewerClubId
      ? registrations.find((row) => row.club_id === viewerClubId && row.status !== "withdrawn")
      : undefined;

    return Response.json(
      {
        tournament: serializeTournament(tournament),
        registrations: registrations.map((row) => ({
          id: row.id,
          status: row.status,
          seed: row.seed ?? undefined,
          groupLabel: row.group_label ?? undefined,
          points: row.points,
          played: row.played,
          wins: row.wins,
          draws: row.draws,
          losses: row.losses,
          goalsFor: row.goals_for,
          goalsAgainst: row.goals_against,
          eliminatedAt: row.eliminated_at ?? undefined,
          finalPosition: row.final_position ?? undefined,
          club: club(row.club_id),
        })),
        matches: matches.map((row) => {
          const matchReports = reportsByMatch.get(row.id) ?? [];
          const viewerSide =
            viewerClubId === row.home_club_id
              ? row.home_registration_id
              : viewerClubId === row.away_club_id
                ? row.away_registration_id
                : null;
          return {
          id: row.id,
          stage: row.stage,
          stageLabel: stageLabel(row.stage, row.group_label),
          round: row.round,
          groupLabel: row.group_label ?? undefined,
          slot: row.slot,
          status: row.status,
          resultSource: row.result_source ?? undefined,
          disputedAt: row.disputed_at ?? undefined,
          resolutionNote: row.resolution_note ?? undefined,
          // As duas sumulas ficam visiveis para todo mundo: e o que
          // permite a comunidade ver por que um jogo esta em disputa.
          reports: matchReports.map((report) => ({
            clubId: report.club_id,
            clubName: club(report.club_id)?.name ?? "Clube",
            homeScore: report.home_score,
            awayScore: report.away_score,
            homePenalties: report.home_penalties,
            awayPenalties: report.away_penalties,
            evidenceUrl: report.evidence_url ?? undefined,
            note: report.note ?? undefined,
            createdAt: report.created_at,
            updatedAt: report.updated_at,
            mine: Boolean(viewerSide) && report.registration_id === viewerSide,
          })),
          homeScore: row.home_score,
          awayScore: row.away_score,
          homePenalties: row.home_penalties,
          awayPenalties: row.away_penalties,
          homeRegistrationId: row.home_registration_id ?? undefined,
          awayRegistrationId: row.away_registration_id ?? undefined,
          home: club(row.home_club_id),
          away: club(row.away_club_id),
          winnerRegistrationId: row.winner_registration_id ?? undefined,
          nextMatchId: row.next_match_id ?? undefined,
          scheduledAt: row.scheduled_at ?? undefined,
          reportedAt: row.reported_at ?? undefined,
          // Quem esta olhando pode lancar a propria sumula deste jogo?
          // Admin de fora nao lanca por ninguem — quem garante isso e o
          // viewerSide, que so existe se o clube do perfil joga a partida.
          // Para corrigir jogo alheio existe a arbitragem, com justificativa.
          canReport: Boolean(
            profile &&
              viewerSide &&
              ACCEPTS_REPORT.includes(row.status) &&
              ["owner", "captain", "admin"].includes(profile.role),
          ),
          // Arbitrar so aparece para quem organiza a edicao.
          canResolve: Boolean(profile && canAdminister(profile, tournament) && row.home_registration_id && row.away_registration_id),
          };
        }),
        standings: [...byGroup.entries()].map(([label, rows]) => ({ groupLabel: label, rows })),
        viewer: profile
          ? {
              profileId: profile.id,
              clubId: profile.club_id,
              role: profile.role,
              isAdmin: profile.role === "admin",
              canAdminister: canAdminister(profile, tournament),
              canRegister: canManageClub(profile, profile.club_id) && !myRegistration,
              registrationStatus: myRegistration?.status,
            }
          : null,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return apiError("Não foi possível carregar o campeonato.", 500);
  }
};

// ------------------------------------------------------------
// Acoes de participante: inscrever, desistir, lancar placar
// ------------------------------------------------------------

const PARTICIPANT_ERRORS: Record<string, string> = {
  NOT_CLUB_MANAGER: "Só o dono ou o capitão do clube pode fazer isso.",
  REGISTRATION_CLOSED: "As inscrições deste campeonato não estão abertas.",
  REGISTRATION_NOT_OPEN: "As inscrições ainda não abriram.",
  REGISTRATION_ENDED: "As inscrições já encerraram.",
  PLATFORM_MISMATCH: "Este campeonato é de outra plataforma.",
  ALREADY_REGISTERED: "Seu clube já está inscrito.",
  REGISTRATION_NOT_FOUND: "Seu clube não está inscrito neste campeonato.",
  ALREADY_WITHDRAWN: "Seu clube já havia desistido.",
  WITHDRAW_TOO_LATE: "O sorteio já aconteceu: fale com a organização.",
  CLUB_NOT_FOUND: "Clube não encontrado.",
  MATCH_NOT_FOUND: "Partida não encontrada.",
  MATCH_NOT_READY: "Esta partida ainda não tem os dois clubes definidos.",
  NOT_MATCH_PARTICIPANT: "Só o dono ou o capitão de um dos clubes lança a súmula desta partida.",
  RESULT_ALREADY_CLOSED: "O resultado já foi fechado. Peça correção à organização.",
  NOT_TOURNAMENT_ORGANIZER: "Só quem organiza esta edição pode arbitrar.",
  RESOLUTION_NOTE_REQUIRED: "Escreva a justificativa da decisão.",
  KNOCKOUT_NEEDS_PENALTIES: "Mata-mata não termina empatado: informe os pênaltis.",
  SCORE_INVALID: "Placar inválido.",
  TOURNAMENT_NOT_RUNNING: "O campeonato não está em disputa.",
};

const rpcMessage = (raw: string) => {
  const key = Object.keys(PARTICIPANT_ERRORS).find((code) => raw.includes(code));
  return key ? PARTICIPANT_ERRORS[key] : null;
};

// ------------------------------------------------------------
// Avisos
//
// Um campeonato trava em silencio: a sumula fica esperando o adversario
// que nao sabe que precisa lancar, e a disputa fica esperando uma
// organizacao que nao sabe que existe. Os tres momentos abaixo sao
// exatamente os que bloqueiam a edicao de andar.
//
// Tudo roda em `waitUntil`: aviso que falha nao pode derrubar a acao que
// ja deu certo.
// ------------------------------------------------------------

async function notifyAfterReport(
  context: TournamentContext,
  tournament: TournamentRow,
  matchId: string,
  reporterProfileId: string,
  matchState: string | undefined,
) {
  if (!pushConfigured(context.env)) return;
  const url = `${context.env.SITE_URL ?? ""}/campeonato/?id=${encodeURIComponent(tournament.slug)}`;

  const match = (
    await supabaseRest<MatchRow[]>(
      context.env,
      `tournament_matches?id=eq.${encodeURIComponent(matchId)}&select=${MATCH_COLUMNS}&limit=1`,
    )
  )[0];
  if (!match) return;

  if (matchState === "awaiting_result") {
    // O adversario e o clube cujo gestor nao acabou de lancar.
    const [homeIds, awayIds] = await Promise.all([
      clubManagerProfileIds(context.env, match.home_club_id),
      clubManagerProfileIds(context.env, match.away_club_id),
    ]);
    const targets = [...homeIds, ...awayIds].filter((id) => id !== reporterProfileId);
    if (targets.length) {
      await sendPushToProfiles(context.env, targets, {
        title: tournament.name,
        body: "O adversário lançou o placar. Confirme a sua súmula.",
        url,
        tag: `tournament-report-${matchId}`,
      });
    }
    return;
  }

  if (matchState === "disputed") {
    await sendPushToProfiles(context.env, [tournament.organizer_profile_id], {
      title: `${tournament.name} · placar em disputa`,
      body: "As duas súmulas não bateram. Precisa da sua decisão.",
      url,
      tag: `tournament-dispute-${matchId}`,
    });
  }
}

async function notifyDraw(context: TournamentContext, tournament: TournamentRow, clubIds: Array<string | null>) {
  if (!pushConfigured(context.env)) return;
  const lists = await Promise.all(clubIds.map((id) => clubManagerProfileIds(context.env, id)));
  const targets = [...new Set(lists.flat())];
  if (!targets.length) return;
  await sendPushToProfiles(context.env, targets, {
    title: `${tournament.name} · sorteio realizado`,
    body: "Os confrontos saíram. Veja com quem seu clube joga.",
    url: `${context.env.SITE_URL ?? ""}/campeonato/?id=${encodeURIComponent(tournament.slug)}`,
    tag: `tournament-draw-${tournament.id}`,
  });
}

export const onRequestPost = async (context: TournamentContext) => {
  try {
    assertSameOrigin(context.request, context.env.SITE_URL);
    const profile = await authenticated(context);
    const tournament = await findTournament(context.env, context.params.id);
    if (!tournament) return apiError("Campeonato não encontrado.", 404);

    const body = (await context.request.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "register" || action === "withdraw") {
      const clubId = typeof body.clubId === "string" && UUID.test(body.clubId) ? body.clubId : profile.club_id;
      if (!clubId) return apiError("Você precisa representar um clube para se inscrever.", 409);

      const rpc = action === "register" ? "register_club_in_tournament" : "withdraw_club_from_tournament";
      const result = await supabaseRest<Array<Record<string, unknown>>>(context.env, `rpc/${rpc}`, {
        method: "POST",
        body: JSON.stringify({ p_tournament_id: tournament.id, p_club_id: clubId, p_profile_id: profile.id }),
      });
      return Response.json({ action, result: result[0] ?? null });
    }

    if (action === "report") {
      const matchId = typeof body.matchId === "string" && UUID.test(body.matchId) ? body.matchId : "";
      if (!matchId) return apiError("Partida inválida.");
      const score = (value: unknown) =>
        typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 99 ? value : null;
      const home = score(body.homeScore);
      const away = score(body.awayScore);
      if (home === null || away === null) return apiError("Informe o placar dos dois clubes (0 a 99).");

      const result = await supabaseRest<Array<Record<string, unknown>>>(
        context.env,
        "rpc/submit_tournament_match_report",
        {
          method: "POST",
          body: JSON.stringify({
            p_match_id: matchId,
            p_profile_id: profile.id,
            p_home_score: home,
            p_away_score: away,
            p_home_penalties: score(body.homePenalties),
            p_away_penalties: score(body.awayPenalties),
            p_evidence_url: typeof body.evidenceUrl === "string" ? body.evidenceUrl.trim().slice(0, 500) : null,
            p_note: typeof body.note === "string" ? body.note.trim().slice(0, 500) : null,
          }),
        },
      );
      const state = result[0] as { match_state?: string } | undefined;
      context.waitUntil(
        notifyAfterReport(context, tournament, matchId, profile.id, state?.match_state).catch(() => undefined),
      );
      return Response.json({ action, result: result[0] ?? null });
    }

    return apiError("Ação inválida.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "TOURNAMENT_ACTION_FAILED";
    if (message.startsWith("AUTH_")) return apiError("AUTH_REQUIRED", 401);
    if (message === "ORIGIN_NOT_ALLOWED") return apiError("Origem não permitida.", 403);
    const known = rpcMessage(message);
    return apiError(known ?? "Não foi possível concluir a ação.", known ? 409 : 500);
  }
};

// ------------------------------------------------------------
// Acoes de organizacao
// ------------------------------------------------------------

export const onRequestPatch = async (context: TournamentContext) => {
  try {
    assertSameOrigin(context.request, context.env.SITE_URL);
    const profile = await authenticated(context);
    const tournament = await findTournament(context.env, context.params.id);
    if (!tournament) return apiError("Campeonato não encontrado.", 404);

    const body = (await context.request.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";

    // Aprovar e reprovar sao exclusivos do admin da plataforma.
    if (action === "approve" || action === "reject") {
      if (profile.role !== "admin") return apiError("Apenas administradores revisam propostas.", 403);
      const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : null;
      const result = await supabaseRest<Array<Record<string, unknown>>>(context.env, "rpc/review_tournament", {
        method: "POST",
        body: JSON.stringify({
          p_tournament_id: tournament.id,
          p_admin_profile_id: profile.id,
          p_action: action,
          p_note: note,
        }),
      });
      return Response.json({ action, result: result[0] ?? null });
    }

    if (!canAdminister(profile, tournament)) return apiError("Você não organiza este campeonato.", 403);

    // Arbitragem: fecha um confronto em disputa, ou corrige um ja fechado.
    if (action === "resolve") {
      const matchId = typeof body.matchId === "string" && UUID.test(body.matchId) ? body.matchId : "";
      if (!matchId) return apiError("Partida inválida.");
      const score = (value: unknown) =>
        typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 99 ? value : null;
      const home = score(body.homeScore);
      const away = score(body.awayScore);
      if (home === null || away === null) return apiError("Informe o placar dos dois clubes (0 a 99).");
      const note = typeof body.note === "string" ? body.note.trim() : "";
      if (note.length < 5) return apiError("Escreva a justificativa da decisão (mínimo 5 caracteres).");

      const result = await supabaseRest<Array<Record<string, unknown>>>(context.env, "rpc/resolve_tournament_match", {
        method: "POST",
        body: JSON.stringify({
          p_match_id: matchId,
          p_profile_id: profile.id,
          p_home_score: home,
          p_away_score: away,
          p_home_penalties: score(body.homePenalties),
          p_away_penalties: score(body.awayPenalties),
          p_note: note.slice(0, 500),
          p_walkover: body.walkover === true,
        }),
      });
      return Response.json({ action, result: result[0] ?? null });
    }

    if (action === "publish" || action === "close" || action === "cancel") {
      const allowed: Record<string, { from: string[]; to: string; stamp?: string }> = {
        publish: { from: ["draft"], to: "open" },
        close: { from: ["open"], to: "closed" },
        cancel: {
          from: ["draft", "pending_approval", "open", "closed", "drawn", "running"],
          to: "cancelled",
          stamp: "cancelled_at",
        },
      };
      const rule = allowed[action];
      if (!rule.from.includes(tournament.status)) {
        return apiError(`Não dá para fazer isso com o campeonato em "${tournament.status}".`, 409);
      }
      const now = new Date().toISOString();
      await supabaseRest(context.env, `tournaments?id=eq.${tournament.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          status: rule.to,
          updated_at: now,
          ...(rule.stamp ? { [rule.stamp]: now } : {}),
        }),
      });
      return Response.json({ action, status: rule.to });
    }

    if (action === "draw") {
      const validation = validateFormat(tournament.format_kind, tournament.format);
      if (!validation.ok) return apiError("O formato gravado nesta edição é inválido. Corrija antes de sortear.");

      const registrations = await supabaseRest<RegistrationRow[]>(
        context.env,
        `tournament_registrations?tournament_id=eq.${tournament.id}&status=eq.confirmed&select=${REGISTRATION_COLUMNS}&order=created_at.asc`,
      );
      const clubs = await loadClubs(context.env, registrations.map((row) => row.club_id));

      const draw = buildDraw({
        kind: tournament.format_kind,
        format: validation.format as TournamentFormat,
        registrations: registrations.map((row) => ({
          id: row.id,
          clubId: row.club_id,
          clubName: clubs.get(row.club_id)?.name ?? "Clube",
          createdAt: row.created_at,
        })),
        startsAt: tournament.starts_at,
      });
      if (!draw.ok || !draw.payload) return apiError(draw.error ?? "Não foi possível sortear.", 409);

      const result = await supabaseRest<Array<Record<string, unknown>>>(context.env, "rpc/apply_tournament_draw", {
        method: "POST",
        body: JSON.stringify({ p_tournament_id: tournament.id, p_payload: draw.payload }),
      });
      context.waitUntil(
        notifyDraw(context, tournament, registrations.map((row) => row.club_id)).catch(() => undefined),
      );
      return Response.json({ action, drawnFormat: draw.payload.drawnFormat, result: result[0] ?? null });
    }

    if (action === "seed_knockout") {
      if (tournament.format_kind !== "groups_knockout") {
        return apiError("Só edições com fase de grupos precisam desta etapa.", 409);
      }
      const drawn = (tournament.drawn_format ?? {}) as Record<string, number>;
      if (!drawn.bracketTeams) return apiError("Sorteie a edição antes de fechar a fase de grupos.", 409);

      const [registrations, matches] = await Promise.all([
        supabaseRest<RegistrationRow[]>(
          context.env,
          `tournament_registrations?tournament_id=eq.${tournament.id}&status=eq.confirmed&select=${REGISTRATION_COLUMNS}`,
        ),
        supabaseRest<MatchRow[]>(
          context.env,
          `tournament_matches?tournament_id=eq.${tournament.id}&select=${MATCH_COLUMNS}&order=round.asc,slot.asc`,
        ),
      ]);
      const clubs = await loadClubs(context.env, registrations.map((row) => row.club_id));

      const pending = matches.filter((row) => row.stage === "group" && row.status !== "completed");
      if (pending.length) return apiError(`Ainda faltam ${pending.length} jogos da fase de grupos.`, 409);

      // A primeira fase da chave e a de menor round entre as nao-grupo.
      const knockout = matches.filter((row) => row.stage !== "group" && row.stage !== "third_place");
      if (!knockout.length) return apiError("Esta edição não tem mata-mata montado.", 409);
      const firstRound = Math.min(...knockout.map((row) => row.round));
      const targets = knockout.filter((row) => row.round === firstRound).map((row) => ({ id: row.id, slot: row.slot }));

      const seeding = buildKnockoutSeeding({
        standings: toStandingRows(registrations, clubs),
        qualifiersPerGroup: drawn.qualifiersPerGroup,
        bestThirds: drawn.bestThirds ?? 0,
        firstRound: targets,
      });
      if (!seeding.ok || !seeding.slots) return apiError(seeding.error ?? "Não foi possível montar a chave.", 409);

      const result = await supabaseRest<Array<Record<string, unknown>>>(context.env, "rpc/seed_tournament_knockout", {
        method: "POST",
        body: JSON.stringify({ p_tournament_id: tournament.id, p_payload: { slots: seeding.slots } }),
      });
      return Response.json({
        action,
        qualified: seeding.qualified?.map((row) => ({
          clubName: row.clubName,
          groupLabel: row.groupLabel,
          points: row.points,
        })),
        result: result[0] ?? null,
      });
    }

    return apiError("Ação inválida.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "TOURNAMENT_ADMIN_FAILED";
    if (message.startsWith("AUTH_")) return apiError("AUTH_REQUIRED", 401);
    if (message === "ORIGIN_NOT_ALLOWED") return apiError("Origem não permitida.", 403);
    if (message.includes("NOT_ADMIN")) return apiError("Apenas administradores fazem isso.", 403);
    if (message.includes("TOURNAMENT_NOT_PENDING")) return apiError("Esta proposta já foi revisada.", 409);
    if (message.includes("DRAW_NOT_ALLOWED")) return apiError("O sorteio só acontece com as inscrições abertas ou encerradas.", 409);
    if (message.includes("KNOCKOUT_ALREADY_STARTED")) return apiError("A chave já começou a ser disputada.", 409);
    if (message.includes("GROUP_STAGE_UNFINISHED")) return apiError("A fase de grupos ainda não terminou.", 409);
    const known = rpcMessage(message);
    return apiError(known ?? "Não foi possível concluir a ação.", known ? 409 : 500);
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
