import { apiError, assertSameOrigin, verifyFirebaseRequest, type FunctionContext } from "../../_lib/billing";
import { ensureProfile, findClubById, supabaseRest, type SupabaseProfile } from "../../_lib/supabase";
import { slugify, validateFormat, type TournamentFormatKind } from "../../_lib/tournaments";

export interface TournamentRow {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  rules: string | null;
  banner_url: string | null;
  crest_url: string | null;
  platform: string;
  country_code: string;
  format_kind: TournamentFormatKind;
  format: Record<string, unknown>;
  status: string;
  price_cents: number;
  prize_cents: { first: number; second: number; third: number };
  max_teams: number;
  registered_count: number;
  organizer_profile_id: string;
  organizer_club_id: string | null;
  created_by_admin: boolean;
  review_note: string | null;
  registration_opens_at: string;
  registration_closes_at: string;
  draw_at: string | null;
  starts_at: string;
  drawn_at: string | null;
  finished_at: string | null;
  drawn_format: Record<string, unknown> | null;
  champion_club_id: string | null;
  created_at: string;
}

export const TOURNAMENT_COLUMNS =
  "id,slug,name,summary,rules,banner_url,crest_url,platform,country_code,format_kind,format,status,price_cents,prize_cents,max_teams,registered_count,organizer_profile_id,organizer_club_id,created_by_admin,review_note,registration_opens_at,registration_closes_at,draw_at,starts_at,drawn_at,finished_at,drawn_format,champion_club_id,created_at";

/** Rascunho e reprovado nunca aparecem para quem nao organiza. */
const PUBLIC_STATUSES = ["open", "closed", "drawn", "running", "finished", "cancelled"];

export function serializeTournament(row: TournamentRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary ?? undefined,
    rules: row.rules ?? undefined,
    bannerUrl: row.banner_url ?? undefined,
    crestUrl: row.crest_url ?? undefined,
    platform: row.platform,
    countryCode: row.country_code,
    formatKind: row.format_kind,
    format: row.format,
    status: row.status,
    priceCents: row.price_cents,
    prizeCents: row.prize_cents,
    maxTeams: row.max_teams,
    registeredCount: row.registered_count,
    organizerProfileId: row.organizer_profile_id,
    organizerClubId: row.organizer_club_id ?? undefined,
    createdByAdmin: row.created_by_admin,
    reviewNote: row.review_note ?? undefined,
    registrationOpensAt: row.registration_opens_at,
    registrationClosesAt: row.registration_closes_at,
    drawAt: row.draw_at ?? undefined,
    startsAt: row.starts_at,
    drawnAt: row.drawn_at ?? undefined,
    finishedAt: row.finished_at ?? undefined,
    drawnFormat: row.drawn_format ?? undefined,
    championClubId: row.champion_club_id ?? undefined,
    createdAt: row.created_at,
  };
}

/** Auth sem exigir login: a lista publica funciona deslogado. */
export async function optionalProfile(context: FunctionContext): Promise<SupabaseProfile | null> {
  try {
    const identity = await verifyFirebaseRequest(context.request, context.env);
    return await ensureProfile(context.env, identity, identity.name);
  } catch {
    return null;
  }
}

const isoDate = (value: unknown) => {
  if (typeof value !== "string" || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const clampText = (value: unknown, max: number) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

const HOUR_MS = 3_600_000;

/**
 * Quantas edicoes vivas um organizador comum pode manter ao mesmo tempo.
 *
 * A criacao deixou de passar por curadoria — qualquer conta abre campeonato.
 * O freio contra spam passou a ser este teto, que nao atrapalha quem organiza
 * de verdade e impede que uma conta encha a vitrine sozinha.
 */
const MAX_LIVE_PER_ORGANIZER = 5;
const LIVE_STATUSES = ["draft", "pending_approval", "open", "closed", "drawn", "running"];

/**
 * O desenho que a edicao ganha quando o organizador nao mexe em nada.
 *
 * Escada elastica de 32/16/8: com 8 clubes inscritos o sorteio desce ao
 * degrau de 8 em vez de cancelar por falta de gente. Grupos de 4 com 2
 * classificados e o padrao da casa, e a conta fecha em todos os degraus.
 */
const DEFAULT_FORMAT: Record<TournamentFormatKind, Record<string, unknown>> = {
  groups_knockout: {
    sizes: [32, 16, 8].map((slots) => ({ slots, groupSize: 4, qualifiersPerGroup: 2, bestThirds: 0 })),
    thirdPlaceMatch: true,
  },
  knockout: { sizes: [32, 16, 8, 4], thirdPlaceMatch: true },
  league: { legs: 2, minTeams: 4 },
};

/** So considera "formato informado" o que traz de fato uma escada. */
const hasFormatInput = (value: unknown) => {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return Array.isArray(input.sizes) ? input.sizes.length > 0 : Object.keys(input).length > 0;
};

export const onRequestGet = async (context: FunctionContext) => {
  try {
    const url = new URL(context.request.url);
    const status = url.searchParams.get("status");
    const mine = url.searchParams.get("mine") === "1";
    const profile = await optionalProfile(context);

    let filter = `status=in.(${PUBLIC_STATUSES.join(",")})`;
    if (mine) {
      if (!profile) return apiError("AUTH_REQUIRED", 401);
      filter = `organizer_profile_id=eq.${encodeURIComponent(profile.id)}`;
    } else if (status && PUBLIC_STATUSES.includes(status)) {
      filter = `status=eq.${status}`;
    } else if (profile?.role === "admin") {
      // O admin ve tambem os rascunhos e as propostas na fila.
      filter = "";
    }

    const rows = await supabaseRest<TournamentRow[]>(
      context.env,
      `tournaments?${filter}${filter ? "&" : ""}select=${TOURNAMENT_COLUMNS}&order=starts_at.desc&limit=60`,
    );

    // Onde o clube de quem esta olhando ja se inscreveu.
    let registeredIn: string[] = [];
    if (profile?.club_id && rows.length) {
      const registrations = await supabaseRest<Array<{ tournament_id: string }>>(
        context.env,
        `tournament_registrations?club_id=eq.${encodeURIComponent(profile.club_id)}&status=in.(confirmed,waitlisted)&select=tournament_id`,
      );
      registeredIn = registrations.map((item) => item.tournament_id);
    }

    return Response.json(
      {
        tournaments: rows.map(serializeTournament),
        registeredIn,
        viewer: profile
          ? { profileId: profile.id, role: profile.role, clubId: profile.club_id, isAdmin: profile.role === "admin" }
          : null,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "TOURNAMENTS_FAILED";
    return apiError(
      message.startsWith("AUTH_") ? "AUTH_REQUIRED" : "Não foi possível carregar os campeonatos.",
      message.startsWith("AUTH_") ? 401 : 500,
    );
  }
};

export const onRequestPost = async (context: FunctionContext) => {
  try {
    assertSameOrigin(context.request, context.env.SITE_URL);
    const identity = await verifyFirebaseRequest(context.request, context.env);
    const profile = await ensureProfile(context.env, identity, identity.name);

    const isAdmin = profile.role === "admin";

    // Qualquer conta autenticada abre campeonato. O que segura o volume e o
    // teto de edicoes vivas por organizador, nao mais o papel do usuario.
    if (!isAdmin) {
      const live = await supabaseRest<Array<{ id: string }>>(
        context.env,
        `tournaments?organizer_profile_id=eq.${encodeURIComponent(profile.id)}&status=in.(${LIVE_STATUSES.join(",")})&select=id&limit=${MAX_LIVE_PER_ORGANIZER}`,
      );
      if (live.length >= MAX_LIVE_PER_ORGANIZER) {
        return apiError(
          `Você já tem ${MAX_LIVE_PER_ORGANIZER} campeonatos em andamento. Encerre ou cancele um antes de abrir outro.`,
          409,
        );
      }
    }

    const body = (await context.request.json()) as Record<string, unknown>;

    // Unico campo obrigatorio. Todo o resto tem um padrao que funciona.
    const name = clampText(body.name, 40);
    if (!name || name.length < 2) return apiError("Dê um nome ao campeonato (2 a 40 caracteres).");

    const kind = (
      typeof body.formatKind === "string" && ["groups_knockout", "knockout", "league"].includes(body.formatKind)
        ? body.formatKind
        : "groups_knockout"
    ) as TournamentFormatKind;

    const validation = validateFormat(kind, hasFormatInput(body.format) ? body.format : DEFAULT_FORMAT[kind]);
    if (!validation.ok) return apiError(validation.error ?? "Configuração de formato inválida.");

    // Datas: quem informa manda, quem nao informa recebe um calendario que
    // fecha — inscricoes abrem agora, fecham uma hora antes e a bola rola no
    // dia marcado (ou em uma semana, se nem isso foi dito).
    const nowMs = Date.now();
    const startsInput = isoDate(body.startsAt);
    const startsMs = startsInput ? Date.parse(startsInput) : nowMs + 7 * 24 * HOUR_MS;
    if (startsMs <= nowMs) return apiError("A data de início tem de ser no futuro.");

    const opensInput = isoDate(body.registrationOpensAt);
    const opensMs = Math.min(opensInput ? Date.parse(opensInput) : nowMs, startsMs - 60_000);

    const closesInput = isoDate(body.registrationClosesAt);
    const closesMs = closesInput
      ? Date.parse(closesInput)
      : Math.min(startsMs, Math.max(opensMs + 30 * 60_000, startsMs - HOUR_MS));

    if (closesMs <= opensMs) return apiError("O fim das inscrições tem de vir depois da abertura.");
    if (startsMs < closesMs) return apiError("O campeonato não pode começar antes de as inscrições fecharem.");

    const opensAt = new Date(opensMs).toISOString();
    const closesAt = new Date(closesMs).toISOString();
    const startsAt = new Date(startsMs).toISOString();

    const platform =
      typeof body.platform === "string" && ["common-gen5", "common-gen4", "nx", "crossplay"].includes(body.platform)
        ? body.platform
        : "common-gen5";

    const maxTeams =
      typeof body.maxTeams === "number" && Number.isInteger(body.maxTeams)
        ? Math.min(Math.max(body.maxTeams, validation.minTeams), 128)
        : validation.maxTeams;
    if (maxTeams < validation.minTeams) {
      return apiError(`O formato escolhido precisa de pelo menos ${validation.minTeams} clubes.`);
    }

    const prize = (body.prizeCents ?? {}) as Record<string, unknown>;
    const cents = (value: unknown) => (typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0);

    // Slug unico: colisao ganha sufixo curto em vez de erro na cara do usuario.
    const base = slugify(name) || "campeonato";
    const taken = await supabaseRest<Array<{ slug: string }>>(
      context.env,
      `tournaments?slug=like.${encodeURIComponent(`${base}*`)}&select=slug`,
    );
    const slug = taken.some((item) => item.slug === base)
      ? `${base}-${Math.random().toString(36).slice(2, 6)}`
      : base;

    // Antes, proposta de nao-admin ia para uma fila de aprovacao e a do admin
    // nascia como rascunho: em nenhum dos dois casos criar um campeonato
    // significava ter um campeonato. Agora a edicao ja nasce com inscricoes
    // abertas; quem quiser preparar em silencio manda `publish: false`.
    const status = body.publish === false ? "draft" : "open";

    const created = await supabaseRest<TournamentRow[]>(context.env, "tournaments", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        slug,
        name,
        summary: clampText(body.summary, 240),
        rules: clampText(body.rules, 8000),
        banner_url: clampText(body.bannerUrl, 500),
        crest_url: clampText(body.crestUrl, 500),
        platform,
        country_code: clampText(body.countryCode, 5) ?? "BR",
        format_kind: kind,
        format: validation.format,
        status,
        price_cents: 0,
        prize_cents: { first: cents(prize.first), second: cents(prize.second), third: cents(prize.third) },
        max_teams: maxTeams,
        organizer_profile_id: profile.id,
        organizer_club_id: profile.club_id ?? null,
        created_by_admin: isAdmin,
        registration_opens_at: opensAt,
        registration_closes_at: closesAt,
        draw_at: isoDate(body.drawAt),
        starts_at: startsAt,
      }),
    });

    const row = created[0];
    if (!row) throw new Error("TOURNAMENT_CREATE_EMPTY");

    const club = row.organizer_club_id ? await findClubById(context.env, row.organizer_club_id) : null;
    return Response.json(
      {
        tournament: serializeTournament(row),
        organizerClubName: club?.name,
        needsApproval: false,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "TOURNAMENT_CREATE_FAILED";
    if (message.includes("tournaments_slug_key")) return apiError("Já existe um campeonato com esse nome.", 409);
    return apiError(
      message.startsWith("AUTH_")
        ? "AUTH_REQUIRED"
        : message === "ORIGIN_NOT_ALLOWED"
          ? "Origem não permitida."
          : "Não foi possível criar o campeonato.",
      message.startsWith("AUTH_") ? 401 : message === "ORIGIN_NOT_ALLOWED" ? 403 : 500,
    );
  }
};

export const onRequest = () => apiError("Método não permitido.", 405);
