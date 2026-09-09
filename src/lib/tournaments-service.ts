"use client";

import { getFirebaseAuth } from "./firebase";

export type TournamentFormatKind = "groups_knockout" | "knockout" | "league";

export type TournamentStatus =
  | "draft"
  | "pending_approval"
  | "rejected"
  | "open"
  | "closed"
  | "drawn"
  | "running"
  | "finished"
  | "cancelled";

export type MatchStage =
  | "group"
  | "league"
  | "round_of_64"
  | "round_of_32"
  | "round_of_16"
  | "quarter"
  | "semi"
  | "third_place"
  | "final";

export interface TournamentSummary {
  id: string;
  slug: string;
  name: string;
  summary?: string;
  rules?: string;
  bannerUrl?: string;
  crestUrl?: string;
  platform: string;
  countryCode: string;
  formatKind: TournamentFormatKind;
  format: Record<string, unknown>;
  status: TournamentStatus;
  priceCents: number;
  prizeCents: { first: number; second: number; third: number };
  maxTeams: number;
  registeredCount: number;
  organizerProfileId: string;
  organizerClubId?: string;
  createdByAdmin: boolean;
  reviewNote?: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
  drawAt?: string;
  startsAt: string;
  drawnAt?: string;
  finishedAt?: string;
  drawnFormat?: Record<string, number | boolean | string>;
  championClubId?: string;
  createdAt: string;
}

export interface TournamentClub {
  id: string;
  name: string;
  platform: string;
  eaClubId: string;
}

export interface TournamentRegistration {
  id: string;
  status: "confirmed" | "waitlisted" | "withdrawn" | "disqualified";
  seed?: number;
  groupLabel?: string;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  eliminatedAt?: string;
  finalPosition?: number;
  club: TournamentClub | null;
}

export interface MatchReport {
  clubId: string;
  clubName: string;
  homeScore: number;
  awayScore: number;
  homePenalties: number | null;
  awayPenalties: number | null;
  evidenceUrl?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  /** Súmula do clube de quem está olhando. */
  mine: boolean;
}

export interface TournamentMatch {
  id: string;
  stage: MatchStage;
  stageLabel: string;
  round: number;
  groupLabel?: string;
  slot: number;
  status: "scheduled" | "awaiting_result" | "disputed" | "completed" | "walkover" | "cancelled";
  /** agreed = as duas súmulas bateram; organizer = a organização arbitrou. */
  resultSource?: "agreed" | "organizer" | "walkover";
  disputedAt?: string;
  resolutionNote?: string;
  reports: MatchReport[];
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  homeRegistrationId?: string;
  awayRegistrationId?: string;
  home: TournamentClub | null;
  away: TournamentClub | null;
  winnerRegistrationId?: string;
  nextMatchId?: string;
  scheduledAt?: string;
  reportedAt?: string;
  canReport: boolean;
  canResolve: boolean;
}

export interface StandingRow {
  registrationId: string;
  clubId: string;
  clubName: string;
  groupLabel: string | null;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface TournamentViewer {
  profileId: string;
  clubId: string | null;
  role: string;
  isAdmin: boolean;
  canAdminister: boolean;
  canRegister: boolean;
  registrationStatus?: string;
}

export interface TournamentDetail {
  tournament: TournamentSummary;
  registrations: TournamentRegistration[];
  matches: TournamentMatch[];
  standings: Array<{ groupLabel: string; rows: StandingRow[] }>;
  viewer: TournamentViewer | null;
}

export interface TournamentList {
  tournaments: TournamentSummary[];
  registeredIn: string[];
  viewer: { profileId: string; role: string; clubId: string | null; isAdmin: boolean } | null;
}

/**
 * Mesma ponte do resto da comunidade: token do Firebase no header, e o
 * corpo de erro do servidor vira a mensagem que a tela mostra.
 *
 * `authRequired` e opcional de proposito · a lista e o detalhe publicos
 * respondem deslogado, e mandar o token quando ele existe so enriquece
 * a resposta com o que o clube de quem olha ja fez.
 */
async function api<T>(path: string, init: RequestInit = {}, authRequired = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) headers.set("content-type", "application/json");
  const user = getFirebaseAuth()?.currentUser;
  if (user) headers.set("authorization", `Bearer ${await user.getIdToken()}`);
  else if (authRequired) throw new Error("AUTH_REQUIRED");

  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `API_${response.status}`);
  return payload;
}

export function listTournaments(status?: TournamentStatus | "mine"): Promise<TournamentList> {
  const query = status === "mine" ? "?mine=1" : status ? `?status=${status}` : "";
  return api<TournamentList>(`/api/community/tournaments${query}`);
}

export function getTournament(slug: string): Promise<TournamentDetail> {
  return api<TournamentDetail>(`/api/community/tournaments/${encodeURIComponent(slug)}`);
}

/**
 * O nome e o unico campo obrigatorio.
 *
 * O servidor completa formato, plataforma, datas, vagas e premios com
 * padroes que funcionam — criar um campeonato passou a ser uma decisao, nao
 * um formulario. Quem quiser desenhar cada detalhe continua podendo.
 */
export interface CreateTournamentInput {
  name: string;
  summary?: string;
  rules?: string;
  bannerUrl?: string;
  platform?: string;
  countryCode?: string;
  formatKind?: TournamentFormatKind;
  format?: Record<string, unknown>;
  maxTeams?: number;
  prizeCents?: { first: number; second: number; third: number };
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  drawAt?: string;
  startsAt?: string;
  /** `false` guarda como rascunho em vez de abrir as inscricoes na hora. */
  publish?: boolean;
}

export function createTournament(input: CreateTournamentInput) {
  return api<{ tournament: TournamentSummary; needsApproval: boolean }>(
    "/api/community/tournaments",
    { method: "POST", body: JSON.stringify(input) },
    true,
  );
}

export type ParticipantAction = "register" | "withdraw" | "report";
export type OrganizerAction =
  | "approve"
  | "reject"
  | "publish"
  | "close"
  | "cancel"
  | "draw"
  | "seed_knockout"
  | "resolve";

export function tournamentAction(slug: string, body: { action: ParticipantAction } & Record<string, unknown>) {
  return api<{ action: string; result: Record<string, unknown> | null }>(
    `/api/community/tournaments/${encodeURIComponent(slug)}`,
    { method: "POST", body: JSON.stringify(body) },
    true,
  );
}

export function organizerAction(slug: string, body: { action: OrganizerAction } & Record<string, unknown>) {
  return api<{ action: string; status?: string; qualified?: Array<{ clubName: string }>; result: unknown }>(
    `/api/community/tournaments/${encodeURIComponent(slug)}`,
    { method: "PATCH", body: JSON.stringify(body) },
    true,
  );
}

// ------------------------------------------------------------
// Apresentacao
// ------------------------------------------------------------

/**
 * Toda data de campeonato aparece no horario de Brasilia, e nao no fuso
 * de quem olha · "o campeonato comeca 21:00" e uma frase sobre **um
 * instante so**, combinada entre gente que joga junto. A tela diz o fuso
 * ao lado da hora para ninguem entrar atrasado.
 */
export const TOURNAMENT_TIME_ZONE = "America/Sao_Paulo";

export function formatTournamentDate(value: string, withTime = true): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    ...(withTime ? { hour: "2-digit" as const, minute: "2-digit" as const } : {}),
    timeZone: TOURNAMENT_TIME_ZONE,
  });
}

export const STATUS_LABEL: Record<TournamentStatus, string> = {
  draft: "Rascunho",
  pending_approval: "Aguardando aprovação",
  rejected: "Reprovado",
  open: "Inscrições abertas",
  closed: "Inscrições encerradas",
  drawn: "Sorteado",
  running: "Em disputa",
  finished: "Encerrado",
  cancelled: "Cancelado",
};

export const FORMAT_LABEL: Record<TournamentFormatKind, string> = {
  groups_knockout: "Grupos + mata-mata",
  knockout: "Mata-mata",
  league: "Pontos corridos",
};

export const PLATFORM_LABEL: Record<string, string> = {
  "common-gen5": "PS5 / Xbox Series / PC",
  "common-gen4": "PS4 / Xbox One",
  nx: "Nintendo Switch",
  crossplay: "Crossplay",
};

export const formatPrize = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
