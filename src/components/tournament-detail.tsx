"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Check, Gamepad2, Gavel, Shuffle, Trophy, Users, X } from "lucide-react";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";
import styles from "./tournaments.module.css";
import {
  formatPrize,
  formatTournamentDate,
  FORMAT_LABEL,
  getTournament,
  organizerAction,
  PLATFORM_LABEL,
  STATUS_LABEL,
  tournamentAction,
  TOURNAMENT_TIME_ZONE,
  type MatchStage,
  type OrganizerAction,
  type TournamentDetail as Detail,
  type TournamentMatch,
} from "@/lib/tournaments-service";

/** Ordem em que as fases aparecem na chave, da mais larga para a final. */
const STAGE_ORDER: MatchStage[] = [
  "round_of_64",
  "round_of_32",
  "round_of_16",
  "quarter",
  "semi",
  "third_place",
  "final",
];

const badgeClass = (status: Detail["tournament"]["status"]) => {
  if (status === "open") return styles.badgeOpen;
  if (status === "running" || status === "drawn" || status === "closed") return styles.badgeRunning;
  if (status === "pending_approval" || status === "draft") return styles.badgePending;
  return styles.badgeFinished;
};

function ScoreForm({
  match,
  onSubmit,
  busy,
}: {
  match: TournamentMatch;
  onSubmit: (scores: { homeScore: number; awayScore: number; homePenalties?: number; awayPenalties?: number }) => void;
  busy: boolean;
}) {
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [homePens, setHomePens] = useState("");
  const [awayPens, setAwayPens] = useState("");

  const isKnockout = match.stage !== "group" && match.stage !== "league";
  // Empate no mata-mata so fecha com penaltis; a tela pede antes de o
  // servidor recusar.
  const tied = isKnockout && home !== "" && home === away;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      homeScore: Number(home),
      awayScore: Number(away),
      ...(tied ? { homePenalties: Number(homePens), awayPenalties: Number(awayPens) } : {}),
    });
  }

  return (
    <form className={styles.scoreForm} onSubmit={submit}>
      <label>
        {match.home?.name ?? "Mandante"}
        <input required type="number" min="0" max="99" value={home} onChange={(e) => setHome(e.target.value)} />
      </label>
      <label>
        {match.away?.name ?? "Visitante"}
        <input required type="number" min="0" max="99" value={away} onChange={(e) => setAway(e.target.value)} />
      </label>
      {tied && (
        <>
          <label>
            Pên. casa
            <input required type="number" min="0" max="99" value={homePens} onChange={(e) => setHomePens(e.target.value)} />
          </label>
          <label>
            Pên. fora
            <input required type="number" min="0" max="99" value={awayPens} onChange={(e) => setAwayPens(e.target.value)} />
          </label>
        </>
      )}
      <button type="submit" disabled={busy}>
        <Check /> {busy ? "Enviando…" : "Enviar minha súmula"}
      </button>
    </form>
  );
}

/**
 * Arbitragem · so aparece para quem organiza a edicao.
 *
 * A justificativa e obrigatoria de proposito: decisao de arbitro sem
 * motivo escrito e o que transforma disputa de placar em disputa de
 * confianca. O servidor recusa nota com menos de 5 caracteres.
 */
function ResolveForm({
  match,
  onSubmit,
  busy,
}: {
  match: TournamentMatch;
  onSubmit: (input: {
    homeScore: number;
    awayScore: number;
    homePenalties?: number;
    awayPenalties?: number;
    note: string;
    walkover: boolean;
  }) => void;
  busy: boolean;
}) {
  const [home, setHome] = useState(String(match.homeScore ?? ""));
  const [away, setAway] = useState(String(match.awayScore ?? ""));
  const [homePens, setHomePens] = useState("");
  const [awayPens, setAwayPens] = useState("");
  const [note, setNote] = useState("");
  const [walkover, setWalkover] = useState(false);

  const isKnockout = match.stage !== "group" && match.stage !== "league";
  const tied = isKnockout && home !== "" && home === away;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      homeScore: Number(home),
      awayScore: Number(away),
      ...(tied ? { homePenalties: Number(homePens), awayPenalties: Number(awayPens) } : {}),
      note,
      walkover,
    });
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.scoreForm}>
        <label>
          {match.home?.name ?? "Mandante"}
          <input required type="number" min="0" max="99" value={home} onChange={(e) => setHome(e.target.value)} />
        </label>
        <label>
          {match.away?.name ?? "Visitante"}
          <input required type="number" min="0" max="99" value={away} onChange={(e) => setAway(e.target.value)} />
        </label>
        {tied && (
          <>
            <label>
              Pên. casa
              <input required type="number" min="0" max="99" value={homePens} onChange={(e) => setHomePens(e.target.value)} />
            </label>
            <label>
              Pên. fora
              <input required type="number" min="0" max="99" value={awayPens} onChange={(e) => setAwayPens(e.target.value)} />
            </label>
          </>
        )}
      </div>
      <label>
        Justificativa da decisão (obrigatória, fica registrada)
        <textarea
          required
          minLength={5}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex.: conferido o print enviado pelos dois clubes; o placar correto é 3 a 1."
        />
      </label>
      <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={walkover} onChange={(e) => setWalkover(e.target.checked)} style={{ width: "auto" }} />
        Registrar como W.O.
      </label>
      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={busy}>
          <Gavel /> {busy ? "Registrando…" : "Registrar decisão"}
        </button>
      </div>
    </form>
  );
}

/** O que aconteceu com o placar deste confronto, em uma frase. */
function resultLabel(match: TournamentMatch): string | null {
  if (match.status === "disputed") return "Em disputa — as duas súmulas não bateram";
  if (match.status === "awaiting_result") return "Aguardando a súmula do adversário";
  if (match.resultSource === "agreed") return "Confirmado pelos dois clubes";
  if (match.resultSource === "organizer") return "Decidido pela organização";
  if (match.resultSource === "walkover") return "W.O. registrado pela organização";
  return null;
}

export function TournamentDetail({ slug }: { slug: string }) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [reporting, setReporting] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setData(await getTournament(slug));
  }, [slug]);

  // A carga inicial escreve estado dentro do callback da promessa, e nao no
  // corpo do efeito · e o que a regra `set-state-in-effect` pede, e o
  // `alive` evita gravar a resposta de um slug que ja saiu da tela.
  useEffect(() => {
    let alive = true;
    getTournament(slug)
      .then((next) => {
        if (!alive) return;
        setData(next);
        setError("");
      })
      .catch((loadError: unknown) => {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : "Campeonato não encontrado.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  const run = useCallback(
    async (key: string, task: () => Promise<string>) => {
      setBusy(key);
      setError("");
      setNotice("");
      try {
        setNotice(await task());
        await reload();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Não foi possível concluir a ação.");
      } finally {
        setBusy("");
      }
    },
    [reload],
  );

  const groupMatches = useMemo(
    () => (data?.matches ?? []).filter((match) => match.stage === "group" || match.stage === "league"),
    [data],
  );
  const bracket = useMemo(() => {
    const matches = (data?.matches ?? []).filter((match) => STAGE_ORDER.includes(match.stage));
    return STAGE_ORDER.map((stage) => ({
      stage,
      matches: matches.filter((match) => match.stage === stage).sort((a, b) => a.slot - b.slot),
    })).filter((column) => column.matches.length);
  }, [data]);

  if (loading) {
    return (
      <main className="app-shell">
        <PlatformHeader />
        <div className="content">
          <div className={styles.empty}><strong>Carregando…</strong></div>
        </div>
        <MobileNav />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="app-shell">
        <PlatformHeader />
        <div className="content">
          <div className={styles.empty}>
            <Trophy />
            <strong>Campeonato não encontrado</strong>
            <Link href="/campeonatos">Ver todos os campeonatos</Link>
          </div>
        </div>
        <MobileNav />
      </main>
    );
  }

  const { tournament, registrations, standings, viewer } = data;
  const confirmed = registrations.filter((row) => row.status === "confirmed");
  const waitlisted = registrations.filter((row) => row.status === "waitlisted");
  const filled = Math.min(100, Math.round((tournament.registeredCount / tournament.maxTeams) * 100));
  const drawn = tournament.drawnFormat ?? {};
  const qualifiersPerGroup = Number(drawn.qualifiersPerGroup ?? 0);

  const organize = (action: OrganizerAction, label: string, extra: Record<string, unknown> = {}) =>
    run(action, async () => {
      const result = await organizerAction(slug, { action, ...extra });
      if (action === "draw") return `Sorteio feito. ${label}`;
      if (action === "seed_knockout") return `Chave montada com ${result.qualified?.length ?? 0} classificados.`;
      return label;
    });

  return (
    <main className="app-shell">
      <PlatformHeader />
      <div className="content">
        <div className={styles.page}>
          <Link href="/campeonatos" className={styles.meta}><ArrowLeft /> Todos os campeonatos</Link>

          <section className={styles.hero}>
            <div>
              <small>{FORMAT_LABEL[tournament.formatKind].toUpperCase()}</small>
              <h1>{tournament.name}</h1>
              {tournament.summary && <p>{tournament.summary}</p>}
              <div className={styles.meta} style={{ marginTop: 14 }}>
                <span className={`${styles.badge} ${badgeClass(tournament.status)}`}>{STATUS_LABEL[tournament.status]}</span>
                <span><Gamepad2 /> {PLATFORM_LABEL[tournament.platform] ?? tournament.platform}</span>
                <span><CalendarDays /> Começa {formatTournamentDate(tournament.startsAt)} (Brasília)</span>
                <span><Users /> {tournament.registeredCount}/{tournament.maxTeams} clubes</span>
                {tournament.prizeCents.first > 0 && <span><Trophy /> {formatPrize(tournament.prizeCents.first)}</span>}
              </div>
            </div>
            <div className={styles.heroArt}><Trophy /></div>
          </section>

          {notice && <p className={styles.notice} role="status">{notice}</p>}
          {error && <p className={`${styles.notice} ${styles.noticeError}`} role="alert">{error}</p>}

          {/* Inscricao */}
          <section className={styles.panel}>
            <header>
              <h2>Inscrições</h2>
              <span className={styles.meta}>
                Abrem {formatTournamentDate(tournament.registrationOpensAt)} · fecham{" "}
                {formatTournamentDate(tournament.registrationClosesAt)} · horário de Brasília ({TOURNAMENT_TIME_ZONE})
              </span>
            </header>
            <div className={styles.slots}>
              <div className={styles.slotsBar}><div className={styles.slotsFill} style={{ width: `${filled}%` }} /></div>
              <div className={styles.slotsText}>
                <span><b>{confirmed.length}</b> confirmados</span>
                {waitlisted.length > 0 && <span>{waitlisted.length} na fila de espera</span>}
              </div>
            </div>
            <div className={styles.actions} style={{ marginTop: 14 }}>
              {!viewer && <Link href="/entrar">Entre na sua conta para inscrever seu clube</Link>}
              {viewer && !viewer.clubId && <span className={styles.meta}>Vincule um clube para participar.</span>}
              {viewer?.canRegister && tournament.status === "open" && (
                <button
                  type="button"
                  className={styles.primary}
                  disabled={busy === "register"}
                  onClick={() => run("register", async () => {
                    const result = await tournamentAction(slug, { action: "register" });
                    const status = (result.result as { registration_status?: string } | null)?.registration_status;
                    return status === "waitlisted"
                      ? "Campeonato lotado: seu clube entrou na fila de espera."
                      : "Clube inscrito!";
                  })}
                >
                  <Check /> Inscrever meu clube
                </button>
              )}
              {viewer?.registrationStatus && ["open", "closed"].includes(tournament.status) && (
                <button
                  type="button"
                  className={styles.danger}
                  disabled={busy === "withdraw"}
                  onClick={() => run("withdraw", async () => {
                    await tournamentAction(slug, { action: "withdraw" });
                    return "Inscrição cancelada.";
                  })}
                >
                  <X /> Desistir
                </button>
              )}
              {viewer?.registrationStatus === "waitlisted" && (
                <span className={styles.meta}>Seu clube está na fila de espera.</span>
              )}
            </div>
            {confirmed.length > 0 && (
              <div className={styles.chips} style={{ marginTop: 14 }}>
                {confirmed.map((row) => (
                  <span className={`${styles.chip} ${row.eliminatedAt ? styles.chipOut : ""}`} key={row.id}>
                    {row.groupLabel ? `${row.groupLabel} · ` : ""}{row.club?.name ?? "Clube"}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Painel de organizacao */}
          {viewer?.canAdminister && (
            <section className={styles.panel}>
              <header><h2>Organização</h2></header>
              {tournament.reviewNote && <p className={styles.notice}>Nota da revisão: {tournament.reviewNote}</p>}
              <div className={styles.actions}>
                {viewer.isAdmin && tournament.status === "pending_approval" && (
                  <>
                    <button type="button" className={styles.primary} disabled={busy === "approve"}
                      onClick={() => organize("approve", "Proposta aprovada e inscrições abertas.")}>
                      <Check /> Aprovar
                    </button>
                    <button type="button" className={styles.danger} disabled={busy === "reject"}
                      onClick={() => organize("reject", "Proposta reprovada.")}>
                      <X /> Reprovar
                    </button>
                  </>
                )}
                {tournament.status === "draft" && (
                  <button type="button" className={styles.primary} disabled={busy === "publish"}
                    onClick={() => organize("publish", "Campeonato publicado.")}>
                    Publicar e abrir inscrições
                  </button>
                )}
                {tournament.status === "open" && (
                  <button type="button" disabled={busy === "close"}
                    onClick={() => organize("close", "Inscrições encerradas.")}>
                    Encerrar inscrições
                  </button>
                )}
                {["open", "closed"].includes(tournament.status) && (
                  <button type="button" className={styles.primary} disabled={busy === "draw"}
                    onClick={() => organize("draw", `${confirmed.length} clubes distribuídos.`)}>
                    <Shuffle /> Sortear
                  </button>
                )}
                {tournament.formatKind === "groups_knockout" && ["drawn", "running"].includes(tournament.status) && (
                  <button type="button" disabled={busy === "seed_knockout"}
                    onClick={() => organize("seed_knockout", "Chave montada.")}>
                    <Trophy /> Fechar grupos e montar a chave
                  </button>
                )}
                {!["finished", "cancelled", "rejected"].includes(tournament.status) && (
                  <button type="button" className={styles.danger} disabled={busy === "cancel"}
                    onClick={() => organize("cancel", "Campeonato cancelado.")}>
                    <X /> Cancelar edição
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Classificacao */}
          {standings.length > 0 && (
            <section className={styles.panel}>
              <header><h2>Classificação</h2></header>
              <div className={styles.groups}>
                {standings.map((group) => (
                  <div key={group.groupLabel}>
                    <h3>{group.groupLabel === "-" ? "Tabela" : `Grupo ${group.groupLabel}`}</h3>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>#</th><th>Clube</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row, index) => (
                          <tr key={row.registrationId} className={qualifiersPerGroup && index < qualifiersPerGroup ? styles.qualified : ""}>
                            <td>{index + 1}</td>
                            <td>{row.clubName}</td>
                            <td><b>{row.points}</b></td>
                            <td>{row.played}</td>
                            <td>{row.wins}</td>
                            <td>{row.draws}</td>
                            <td>{row.losses}</td>
                            <td>{row.goalsFor - row.goalsAgainst > 0 ? "+" : ""}{row.goalsFor - row.goalsAgainst}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Chave */}
          {bracket.length > 0 && (
            <section className={styles.panel}>
              <header><h2>Mata-mata</h2></header>
              <div className={styles.bracket}>
                {bracket.map((column) => (
                  <div className={styles.bracketColumn} key={column.stage}>
                    <small>{column.matches[0].stageLabel}</small>
                    {column.matches.map((match) => (
                      <div className={styles.tie} key={match.id}>
                        {(["home", "away"] as const).map((side) => {
                          const club = side === "home" ? match.home : match.away;
                          const score = side === "home" ? match.homeScore : match.awayScore;
                          const pens = side === "home" ? match.homePenalties : match.awayPenalties;
                          const registrationId = side === "home" ? match.homeRegistrationId : match.awayRegistrationId;
                          const won = match.winnerRegistrationId && match.winnerRegistrationId === registrationId;
                          return (
                            <div className={`${styles.tieRow} ${won ? styles.tieWinner : ""}`} key={side}>
                              <span className={club ? "" : styles.tiePending}>{club?.name ?? "A definir"}</span>
                              <b>{score ?? "–"}{pens !== null && pens !== undefined ? ` (${pens})` : ""}</b>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Jogos */}
          {data.matches.length > 0 && (
            <section className={styles.panel}>
              <header><h2>Jogos</h2><span className={styles.meta}>{data.matches.length} partidas</span></header>
              <div className={styles.matchList}>
                {data.matches.map((match) => (
                  <article className={styles.match} key={match.id}>
                    <span>{match.home?.name ?? "A definir"}</span>
                    <span className={styles.matchScore}>
                      {match.status === "completed"
                        ? `${match.homeScore} × ${match.awayScore}${
                            match.homePenalties !== null && match.homePenalties !== undefined
                              ? ` (${match.homePenalties}-${match.awayPenalties})`
                              : ""
                          }`
                        : "×"}
                    </span>
                    <span>{match.away?.name ?? "A definir"}</span>
                    <div className={styles.matchFooter}>
                      <span>
                        {match.stageLabel}
                        {match.stage === "group" || match.stage === "league" ? ` · rodada ${match.round}` : ""}
                        {match.scheduledAt ? ` · ${formatTournamentDate(match.scheduledAt)}` : ""}
                        {resultLabel(match) ? ` · ${resultLabel(match)}` : ""}
                      </span>
                      <span className={styles.actions}>
                        {match.canReport && reporting !== match.id && (
                          <button type="button" onClick={() => { setReporting(match.id); setResolving(null); }}>
                            {match.reports.some((report) => report.mine) ? "Corrigir minha súmula" : "Lançar minha súmula"}
                          </button>
                        )}
                        {match.canResolve && resolving !== match.id && (match.status === "disputed" || match.status === "completed" || match.status === "awaiting_result") && (
                          <button type="button" onClick={() => { setResolving(match.id); setReporting(null); }}>
                            <Gavel /> Arbitrar
                          </button>
                        )}
                      </span>
                    </div>

                    {/* As duas sumulas ficam a vista: e o que deixa claro por
                        que um jogo esta em disputa, sem ninguem ter de perguntar. */}
                    {match.reports.length > 0 && match.status !== "completed" && (
                      <div className={styles.matchFooter}>
                        <span>
                          {match.reports.map((report) => (
                            <span key={report.clubId} style={{ marginRight: 12 }}>
                              <b>{report.clubName}{report.mine ? " (você)" : ""}</b>: {report.homeScore}×{report.awayScore}
                              {report.homePenalties !== null ? ` (${report.homePenalties}-${report.awayPenalties})` : ""}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}

                    {match.resolutionNote && (
                      <div className={styles.matchFooter}>
                        <span>Decisão da organização: {match.resolutionNote}</span>
                      </div>
                    )}

                    {reporting === match.id && (
                      <div className={styles.matchFooter}>
                        <ScoreForm
                          match={match}
                          busy={busy === match.id}
                          onSubmit={(scores) =>
                            run(match.id, async () => {
                              const response = await tournamentAction(slug, { action: "report", matchId: match.id, ...scores });
                              setReporting(null);
                              const state = (response.result as { match_state?: string; agreed?: boolean } | null) ?? {};
                              if (state.agreed) return "Súmulas bateram: resultado confirmado.";
                              if (state.match_state === "disputed") return "Sua súmula não bate com a do adversário. A organização vai decidir.";
                              return "Súmula enviada. Falta a do adversário.";
                            })
                          }
                        />
                      </div>
                    )}

                    {resolving === match.id && (
                      <div className={styles.matchFooter}>
                        <ResolveForm
                          match={match}
                          busy={busy === match.id}
                          onSubmit={(input) =>
                            run(match.id, async () => {
                              await organizerAction(slug, { action: "resolve", matchId: match.id, ...input });
                              setResolving(null);
                              return "Decisão registrada.";
                            })
                          }
                        />
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {!data.matches.length && groupMatches.length === 0 && (
            <div className={styles.empty}>
              <Shuffle />
              <strong>Ainda sem sorteio</strong>
              <span>Os confrontos aparecem aqui assim que a organização sortear a edição.</span>
            </div>
          )}

          {tournament.rules && (
            <section className={styles.panel}>
              <header><h2>Regulamento</h2></header>
              <p style={{ whiteSpace: "pre-wrap", margin: 0, color: "var(--muted)" }}>{tournament.rules}</p>
            </section>
          )}
        </div>
      </div>
      <MobileNav />
    </main>
  );
}
