/**
 * Campeonatos · formato, sorteio e classificacao.
 *
 * O banco guarda e garante atomicidade; quem decide o desenho da
 * competicao e este arquivo. A inspiracao e o GGClubs, e o que foi
 * copiado de la e a ideia central: a **escada elastica**. Em vez de
 * fixar 16 vagas e cancelar a edicao quando aparecem 13 clubes, o
 * admin declara uma escada de tamanhos e o sorteio desce ate o degrau
 * que cabe nos inscritos. Vaga vazia nao existe.
 */

export type TournamentFormatKind = "groups_knockout" | "knockout" | "league";

export interface BracketSize {
  /** Quantos clubes entram neste degrau. */
  slots: number;
  /** Times por grupo. 4 e o padrao da casa. */
  groupSize: number;
  /** Quantos passam de cada grupo. */
  qualifiersPerGroup: number;
  /**
   * Quantos melhores terceiros completam o mata-mata.
   *
   * E o parafuso que faz a conta fechar: 12 grupos x 2 dao 24, que nao
   * e potencia de dois. Com 8 melhores terceiros viram 32, que e.
   */
  bestThirds: number;
}

export interface GroupsKnockoutFormat {
  sizes: BracketSize[];
  thirdPlaceMatch: boolean;
}

export interface KnockoutFormat {
  /** Escada de tamanhos, sempre potencias de dois. */
  sizes: number[];
  thirdPlaceMatch: boolean;
}

export interface LeagueFormat {
  /** 1 = turno unico, 2 = turno e returno. */
  legs: 1 | 2;
  minTeams: number;
}

export type TournamentFormat = GroupsKnockoutFormat | KnockoutFormat | LeagueFormat;

export type KnockoutStage =
  | "round_of_64"
  | "round_of_32"
  | "round_of_16"
  | "quarter"
  | "semi"
  | "final";

export type MatchStage = KnockoutStage | "group" | "league" | "third_place";

export interface DrawRegistration {
  id: string;
  clubId: string;
  clubName: string;
  createdAt: string;
}

export interface DrawMatch {
  id: string;
  stage: MatchStage;
  round: number;
  groupLabel?: string;
  slot: number;
  homeRegistrationId?: string;
  awayRegistrationId?: string;
  nextMatchId?: string;
  nextSlot?: "home" | "away";
  loserNextMatchId?: string;
  loserNextSlot?: "home" | "away";
  scheduledAt?: string;
}

export interface DrawPayload {
  drawnFormat: Record<string, unknown>;
  groups: Array<{ registrationId: string; groupLabel: string | null; seed: number }>;
  matches: DrawMatch[];
}

export const GROUP_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const KNOCKOUT_STAGE_BY_SIZE: Record<number, KnockoutStage> = {
  64: "round_of_64",
  32: "round_of_32",
  16: "round_of_16",
  8: "quarter",
  4: "semi",
  2: "final",
};

export const isPowerOfTwo = (value: number) => value >= 2 && (value & (value - 1)) === 0;

/** Rotulo humano de cada fase, usado nas telas e nos e-mails. */
export function stageLabel(stage: MatchStage, groupLabel?: string | null): string {
  switch (stage) {
    case "group": return groupLabel ? `Grupo ${groupLabel}` : "Fase de grupos";
    case "league": return "Pontos corridos";
    case "round_of_64": return "Trigésima segunda de final";
    case "round_of_32": return "Décima sexta de final";
    case "round_of_16": return "Oitavas de final";
    case "quarter": return "Quartas de final";
    case "semi": return "Semifinal";
    case "third_place": return "Disputa de terceiro";
    case "final": return "Final";
  }
}

// ------------------------------------------------------------
// Validacao do formato
// ------------------------------------------------------------

const int = (value: unknown) => (typeof value === "number" && Number.isInteger(value) ? value : NaN);

/**
 * Um degrau so vale se a chave que ele produz da pra jogar: os
 * classificados tem de somar exatamente uma potencia de dois.
 */
export function isPlayableBracket(size: BracketSize): boolean {
  if (!Number.isInteger(size.slots) || size.slots < 2) return false;
  if (!Number.isInteger(size.groupSize) || size.groupSize < 2) return false;
  if (size.slots % size.groupSize !== 0) return false;
  const groups = size.slots / size.groupSize;
  if (groups > GROUP_LABELS.length) return false;
  if (!Number.isInteger(size.qualifiersPerGroup) || size.qualifiersPerGroup < 1) return false;
  if (size.qualifiersPerGroup >= size.groupSize) return false;
  if (!Number.isInteger(size.bestThirds) || size.bestThirds < 0) return false;
  if (size.bestThirds > groups) return false;
  return isPowerOfTwo(groups * size.qualifiersPerGroup + size.bestThirds);
}

export interface FormatValidation {
  ok: boolean;
  error?: string;
  format?: TournamentFormat;
  /** Menor numero de clubes com que a edicao ainda acontece. */
  minTeams: number;
  maxTeams: number;
}

export function validateFormat(kind: TournamentFormatKind, raw: unknown): FormatValidation {
  const fail = (error: string): FormatValidation => ({ ok: false, error, minTeams: 0, maxTeams: 0 });
  if (!raw || typeof raw !== "object") return fail("Configuração de formato ausente.");
  const input = raw as Record<string, unknown>;

  if (kind === "league") {
    const legs = int(input.legs);
    const minTeams = int(input.minTeams);
    if (legs !== 1 && legs !== 2) return fail("Liga aceita apenas turno (1) ou turno e returno (2).");
    if (!(minTeams >= 3 && minTeams <= 128)) return fail("A liga precisa de no mínimo 3 e no máximo 128 clubes.");
    return { ok: true, format: { legs, minTeams }, minTeams, maxTeams: 128 };
  }

  const thirdPlaceMatch = input.thirdPlaceMatch === true;

  if (kind === "knockout") {
    const sizes = Array.isArray(input.sizes) ? input.sizes.map(int) : [];
    if (!sizes.length || sizes.length > 6) return fail("Informe de 1 a 6 tamanhos de chave.");
    if (!sizes.every(isPowerOfTwo)) return fail("Todo tamanho de mata-mata tem de ser potência de dois.");
    if (!sizes.every((size, i) => i === 0 || size < sizes[i - 1]))
      return fail("Os tamanhos vão do maior para o menor, sem repetir.");
    return {
      ok: true,
      format: { sizes, thirdPlaceMatch },
      minTeams: sizes[sizes.length - 1],
      maxTeams: sizes[0],
    };
  }

  const rawSizes = Array.isArray(input.sizes) ? input.sizes : [];
  if (!rawSizes.length || rawSizes.length > 6) return fail("Informe de 1 a 6 tamanhos de chave.");
  const sizes: BracketSize[] = rawSizes.map((item) => {
    const entry = (item ?? {}) as Record<string, unknown>;
    return {
      slots: int(entry.slots),
      groupSize: int(entry.groupSize),
      qualifiersPerGroup: int(entry.qualifiersPerGroup),
      bestThirds: int(entry.bestThirds) || 0,
    };
  });
  const broken = sizes.findIndex((size) => !isPlayableBracket(size));
  if (broken >= 0) return fail(`O tamanho ${broken + 1} não forma uma chave que dá para jogar.`);
  if (!sizes.every((size, i) => i === 0 || size.slots < sizes[i - 1].slots))
    return fail("Os tamanhos vão do maior para o menor, sem repetir.");

  return {
    ok: true,
    format: { sizes, thirdPlaceMatch },
    minTeams: sizes[sizes.length - 1].slots,
    maxTeams: sizes[0].slots,
  };
}

// ------------------------------------------------------------
// Sorteio
// ------------------------------------------------------------

/** Fisher-Yates com a fonte de aleatoriedade do runtime. */
function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Rodizio (metodo do circulo): todo mundo joga contra todo mundo, e
 * nenhum clube joga duas vezes na mesma rodada.
 */
function roundRobin(ids: string[]): Array<Array<[string, string]>> {
  const teams = [...ids];
  // Numero impar ganha um "descanso" que vira rodada livre.
  if (teams.length % 2 === 1) teams.push("");
  const half = teams.length / 2;
  const rounds: Array<Array<[string, string]>> = [];
  let rotation = teams.slice(1);

  for (let round = 0; round < teams.length - 1; round += 1) {
    const order = [teams[0], ...rotation];
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < half; i += 1) {
      const home = order[i];
      const away = order[order.length - 1 - i];
      if (home && away) pairs.push(round % 2 === 0 ? [home, away] : [away, home]);
    }
    rounds.push(pairs);
    rotation = [rotation[rotation.length - 1], ...rotation.slice(0, -1)];
  }
  return rounds;
}

/**
 * A arvore vazia do mata-mata, do tamanho pedido ate a final.
 *
 * Cada confronto ja sabe para onde manda o vencedor. Sem isso a
 * progressao viraria uma conta refeita a cada resultado, e chave
 * grande com conta refeita e onde nascem os bugs de "sumiu um time".
 */
export function buildKnockoutSkeleton(
  teams: number,
  thirdPlaceMatch: boolean,
  scheduledAt?: (stage: MatchStage, round: number, slot: number) => string | undefined,
): DrawMatch[] {
  if (!isPowerOfTwo(teams)) throw new Error("KNOCKOUT_SIZE_INVALID");
  const matches: DrawMatch[] = [];
  const byStage = new Map<number, DrawMatch[]>();
  let round = 1;

  for (let size = teams; size >= 2; size /= 2) {
    const stage = KNOCKOUT_STAGE_BY_SIZE[size];
    if (!stage) throw new Error("KNOCKOUT_SIZE_INVALID");
    const stageMatches: DrawMatch[] = [];
    for (let slot = 0; slot < size / 2; slot += 1) {
      stageMatches.push({
        id: crypto.randomUUID(),
        stage,
        round,
        slot,
        scheduledAt: scheduledAt?.(stage, round, slot),
      });
    }
    byStage.set(size, stageMatches);
    matches.push(...stageMatches);
    round += 1;
  }

  // Liga cada fase a seguinte: o slot i alimenta o slot i/2.
  for (let size = teams; size > 2; size /= 2) {
    const current = byStage.get(size)!;
    const next = byStage.get(size / 2)!;
    current.forEach((match, index) => {
      match.nextMatchId = next[Math.floor(index / 2)].id;
      match.nextSlot = index % 2 === 0 ? "home" : "away";
    });
  }

  if (thirdPlaceMatch && teams >= 4) {
    const third: DrawMatch = {
      id: crypto.randomUUID(),
      stage: "third_place",
      round,
      slot: 0,
      scheduledAt: scheduledAt?.("third_place", round, 0),
    };
    byStage.get(4)!.forEach((semi, index) => {
      semi.loserNextMatchId = third.id;
      semi.loserNextSlot = index === 0 ? "home" : "away";
    });
    matches.push(third);
  }

  return matches;
}

/** O maior degrau que cabe nos inscritos. */
export function pickGroupsSize(format: GroupsKnockoutFormat, confirmed: number): BracketSize | null {
  return format.sizes.find((size) => size.slots <= confirmed) ?? null;
}

export function pickKnockoutSize(format: KnockoutFormat, confirmed: number): number | null {
  return format.sizes.find((size) => size <= confirmed) ?? null;
}

export interface BuildDrawInput {
  kind: TournamentFormatKind;
  format: TournamentFormat;
  registrations: DrawRegistration[];
  startsAt: string;
  /** Minutos entre rodadas. O GGClubs usa 30. */
  roundIntervalMinutes?: number;
}

export interface BuildDrawResult {
  ok: boolean;
  error?: string;
  payload?: DrawPayload;
}

export function buildDraw(input: BuildDrawInput): BuildDrawResult {
  const { kind, format, registrations, startsAt } = input;
  const interval = (input.roundIntervalMinutes ?? 30) * 60_000;
  const base = new Date(startsAt).getTime();
  const at = (round: number) => new Date(base + (round - 1) * interval).toISOString();

  if (kind === "league") {
    const cfg = format as LeagueFormat;
    if (registrations.length < cfg.minTeams) {
      return { ok: false, error: `A liga precisa de ao menos ${cfg.minTeams} clubes inscritos.` };
    }
    const order = shuffle(registrations);
    const matches: DrawMatch[] = [];
    const turns = roundRobin(order.map((item) => item.id));
    for (let leg = 0; leg < cfg.legs; leg += 1) {
      turns.forEach((pairs, roundIndex) => {
        const round = leg * turns.length + roundIndex + 1;
        pairs.forEach(([home, away], slot) => {
          // No returno o mando inverte.
          const [h, a] = leg === 0 ? [home, away] : [away, home];
          matches.push({
            id: crypto.randomUUID(),
            stage: "league",
            round,
            slot,
            homeRegistrationId: h,
            awayRegistrationId: a,
            scheduledAt: at(round),
          });
        });
      });
    }
    return {
      ok: true,
      payload: {
        drawnFormat: { kind, legs: cfg.legs, teams: order.length, rounds: turns.length * cfg.legs },
        groups: order.map((item, index) => ({ registrationId: item.id, groupLabel: null, seed: index + 1 })),
        matches,
      },
    };
  }

  if (kind === "knockout") {
    const cfg = format as KnockoutFormat;
    const size = pickKnockoutSize(cfg, registrations.length);
    if (!size) {
      const smallest = cfg.sizes[cfg.sizes.length - 1];
      return { ok: false, error: `Faltam clubes: o menor tamanho desta edição pede ${smallest}.` };
    }
    const drawn = shuffle(registrations).slice(0, size);
    const matches = buildKnockoutSkeleton(size, cfg.thirdPlaceMatch, (_stage, round) => at(round));
    const firstRound = matches.filter((match) => match.round === 1);
    firstRound.forEach((match, index) => {
      match.homeRegistrationId = drawn[index * 2].id;
      match.awayRegistrationId = drawn[index * 2 + 1].id;
    });
    return {
      ok: true,
      payload: {
        drawnFormat: { kind, slots: size, thirdPlaceMatch: cfg.thirdPlaceMatch },
        groups: drawn.map((item, index) => ({ registrationId: item.id, groupLabel: null, seed: index + 1 })),
        matches,
      },
    };
  }

  const cfg = format as GroupsKnockoutFormat;
  const size = pickGroupsSize(cfg, registrations.length);
  if (!size) {
    const smallest = cfg.sizes[cfg.sizes.length - 1];
    return { ok: false, error: `Faltam clubes: o menor tamanho desta edição pede ${smallest.slots}.` };
  }

  const drawn = shuffle(registrations).slice(0, size.slots);
  const groupCount = size.slots / size.groupSize;
  const groups: DrawPayload["groups"] = [];
  const matches: DrawMatch[] = [];

  for (let g = 0; g < groupCount; g += 1) {
    const label = GROUP_LABELS[g];
    // Distribuicao alternada para nao concentrar os primeiros
    // sorteados no mesmo grupo.
    const members = drawn.filter((_, index) => index % groupCount === g);
    members.forEach((item, index) => groups.push({ registrationId: item.id, groupLabel: label, seed: index + 1 }));
    roundRobin(members.map((item) => item.id)).forEach((pairs, roundIndex) => {
      pairs.forEach(([home, away], slot) => {
        matches.push({
          id: crypto.randomUUID(),
          stage: "group",
          round: roundIndex + 1,
          groupLabel: label,
          slot,
          homeRegistrationId: home,
          awayRegistrationId: away,
          scheduledAt: at(roundIndex + 1),
        });
      });
    });
  }

  const groupRounds = size.groupSize % 2 === 0 ? size.groupSize - 1 : size.groupSize;
  const bracketTeams = groupCount * size.qualifiersPerGroup + size.bestThirds;
  matches.push(
    ...buildKnockoutSkeleton(bracketTeams, cfg.thirdPlaceMatch, (_stage, round) => at(groupRounds + round)),
  );

  return {
    ok: true,
    payload: {
      drawnFormat: {
        kind,
        slots: size.slots,
        groupSize: size.groupSize,
        groupCount,
        qualifiersPerGroup: size.qualifiersPerGroup,
        bestThirds: size.bestThirds,
        bracketTeams,
        thirdPlaceMatch: cfg.thirdPlaceMatch,
      },
      groups,
      matches,
    },
  };
}

// ------------------------------------------------------------
// Classificacao
// ------------------------------------------------------------

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

export const goalDifference = (row: StandingRow) => row.goalsFor - row.goalsAgainst;

/**
 * Ordem da tabela: pontos, saldo, gols pro, vitorias, nome.
 *
 * **Confronto direto nao entra**, de proposito: com grupos de 3 ou 4 e
 * uma rodada so, o criterio vira ambiguo em triplo empate e obrigaria
 * uma regra de desempate que ninguem le. O nome do clube fecha a lista
 * para a ordem ser sempre a mesma entre duas leituras da mesma tabela.
 */
export function compareStandings(a: StandingRow, b: StandingRow): number {
  return (
    b.points - a.points ||
    goalDifference(b) - goalDifference(a) ||
    b.goalsFor - a.goalsFor ||
    b.wins - a.wins ||
    a.clubName.localeCompare(b.clubName, "pt-BR")
  );
}

export function groupStandings(rows: StandingRow[]): Map<string, StandingRow[]> {
  const byGroup = new Map<string, StandingRow[]>();
  rows.forEach((row) => {
    const key = row.groupLabel ?? "-";
    const list = byGroup.get(key) ?? [];
    list.push(row);
    byGroup.set(key, list);
  });
  byGroup.forEach((list) => list.sort(compareStandings));
  return byGroup;
}

export interface KnockoutSeedInput {
  standings: StandingRow[];
  qualifiersPerGroup: number;
  bestThirds: number;
  /** Confrontos da primeira fase da chave, em ordem de slot. */
  firstRound: Array<{ id: string; slot: number }>;
}

export interface KnockoutSeedResult {
  ok: boolean;
  error?: string;
  slots?: Array<{ matchId: string; side: "home" | "away"; registrationId: string }>;
  qualified?: StandingRow[];
}

/**
 * Quem passou, e contra quem joga.
 *
 * Os classificados sao ordenados por posicao no grupo (todos os
 * primeiros, depois todos os segundos, e os melhores terceiros por
 * ultimo) e a chave e montada **cabeca contra lanterna** · 1 x N,
 * 2 x N-1. Quando o par sai do mesmo grupo, troca-se com o vizinho:
 * repetir na estreia o jogo que acabou de acontecer e o unico
 * resultado que o sorteio precisa evitar.
 */
export function buildKnockoutSeeding(input: KnockoutSeedInput): KnockoutSeedResult {
  const byGroup = groupStandings(input.standings);
  const qualified: StandingRow[] = [];
  const thirds: StandingRow[] = [];

  [...byGroup.keys()].sort().forEach((label) => {
    const list = byGroup.get(label)!;
    for (let position = 0; position < input.qualifiersPerGroup; position += 1) {
      if (list[position]) qualified.push(list[position]);
    }
    if (input.bestThirds > 0 && list[input.qualifiersPerGroup]) thirds.push(list[input.qualifiersPerGroup]);
  });

  thirds.sort(compareStandings);
  qualified.push(...thirds.slice(0, input.bestThirds));

  const needed = input.firstRound.length * 2;
  if (qualified.length !== needed) {
    return { ok: false, error: `A chave pede ${needed} classificados e a fase de grupos produziu ${qualified.length}.` };
  }

  const order = [...qualified];
  const slots: NonNullable<KnockoutSeedResult["slots"]> = [];
  const rounds = [...input.firstRound].sort((a, b) => a.slot - b.slot);

  for (let i = 0; i < rounds.length; i += 1) {
    const home = order[i];
    const awayIndex = order.length - 1 - i;
    // Mesmo grupo na estreia: puxa o proximo candidato disponivel.
    if (order[awayIndex] && order[awayIndex].groupLabel === home.groupLabel && awayIndex - 1 > i) {
      [order[awayIndex], order[awayIndex - 1]] = [order[awayIndex - 1], order[awayIndex]];
    }
    slots.push({ matchId: rounds[i].id, side: "home", registrationId: home.registrationId });
    slots.push({ matchId: rounds[i].id, side: "away", registrationId: order[awayIndex].registrationId });
  }

  return { ok: true, slots, qualified };
}

// ------------------------------------------------------------
// Slug
// ------------------------------------------------------------

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
