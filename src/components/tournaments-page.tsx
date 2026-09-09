"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Gamepad2, Plus, Trophy, Users } from "lucide-react";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";
import styles from "./tournaments.module.css";
import { observeAuth, type AuthUserSnapshot } from "@/lib/auth-client";
import {
  createTournament,
  formatPrize,
  formatTournamentDate,
  FORMAT_LABEL,
  listTournaments,
  PLATFORM_LABEL,
  STATUS_LABEL,
  type TournamentFormatKind,
  type TournamentList,
  type TournamentSummary,
} from "@/lib/tournaments-service";

type Shelf = "all" | "open" | "running" | "finished";

const SHELVES: Array<{ key: Shelf; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "open", label: "Inscrições abertas" },
  { key: "running", label: "Em disputa" },
  { key: "finished", label: "Encerrados" },
];

const badgeClass = (status: TournamentSummary["status"]) => {
  if (status === "open") return styles.badgeOpen;
  if (status === "running" || status === "drawn" || status === "closed") return styles.badgeRunning;
  if (status === "pending_approval" || status === "draft") return styles.badgePending;
  return styles.badgeFinished;
};

const isPowerOfTwo = (value: number) => value >= 2 && (value & (value - 1)) === 0;

/**
 * Os tamanhos que a escada pode ter, dado o desenho do grupo.
 *
 * Em vez de deixar o admin digitar numeros e descobrir no sorteio que a
 * conta nao fecha, a tela so oferece os degraus em que
 * `grupos x classificados` da uma potencia de dois · a mesma regra que o
 * servidor aplica em `isPlayableBracket`.
 */
function validSlots(groupSize: number, qualifiers: number): number[] {
  const options: number[] = [];
  for (let groups = 2; groups <= 26; groups += 1) {
    if (isPowerOfTwo(groups * qualifiers)) options.push(groups * groupSize);
  }
  return options;
}

const toIso = (local: string) => (local ? new Date(local).toISOString() : "");

export function TournamentsPage() {
  const [data, setData] = useState<TournamentList | null>(null);
  const [shelf, setShelf] = useState<Shelf>("all");
  const [user, setUser] = useState<AuthUserSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  // O formulario curto e o caminho normal. Os ajustes finos existem, mas
  // atras de um clique: eram eles que faziam "criar campeonato" parecer
  // trabalho de organizador profissional.
  const [advanced, setAdvanced] = useState(false);

  const [kind, setKind] = useState<TournamentFormatKind>("groups_knockout");
  const [groupSize, setGroupSize] = useState(4);
  const [qualifiers, setQualifiers] = useState(2);
  const [ladder, setLadder] = useState<number[]>([32, 16]);
  const [knockoutLadder, setKnockoutLadder] = useState<number[]>([16, 8]);

  const slotOptions = useMemo(() => validSlots(groupSize, qualifiers), [groupSize, qualifiers]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await listTournaments());
      setError("");
    } catch {
      setError("Não foi possível carregar os campeonatos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stop = observeAuth((value) => {
      setUser(value);
      void reload();
    });
    return stop;
  }, [reload]);

  // Mudar o desenho do grupo pode invalidar degraus ja marcados. Filtrar
  // na leitura (e nao num efeito que reescreve o estado) mantem a marcacao
  // do usuario intacta se ele voltar ao desenho anterior.
  const effectiveLadder = useMemo(
    () => ladder.filter((size) => slotOptions.includes(size)),
    [ladder, slotOptions],
  );

  const visible = useMemo(() => {
    const list = data?.tournaments ?? [];
    if (shelf === "all") return list;
    if (shelf === "open") return list.filter((item) => item.status === "open");
    if (shelf === "running") return list.filter((item) => ["closed", "drawn", "running"].includes(item.status));
    return list.filter((item) => ["finished", "cancelled"].includes(item.status));
  }, [data, shelf]);

  // Qualquer conta logada organiza. Nao ter clube nao impede ninguem de
  // abrir uma copa — impedia, e era so uma trava sem motivo.
  const canCreate = Boolean(data?.viewer);

  /**
   * Sem ajustes avancados, nao manda formato nenhum: o servidor aplica a
   * escada padrao (32/16/8, grupos de 4, dois classificados).
   */
  function buildFormat() {
    if (!advanced) return undefined;
    if (kind === "league") return { legs: 2, minTeams: 4 };
    if (kind === "knockout") {
      return { sizes: [...knockoutLadder].sort((a, b) => b - a), thirdPlaceMatch: true };
    }
    return {
      sizes: [...effectiveLadder]
        .sort((a, b) => b - a)
        .map((slots) => ({ slots, groupSize, qualifiersPerGroup: qualifiers, bestThirds: 0 })),
      thirdPlaceMatch: true,
    };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const format = buildFormat();
    if (advanced && kind !== "league" && !(format as { sizes: unknown[] }).sizes.length) {
      setError("Escolha ao menos um tamanho de chave.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const prize = (field: string) => Math.round(Number(form.get(field) || 0) * 100);
      const optional = (field: string) => String(form.get(field) || "") || undefined;
      const created = await createTournament({
        name: String(form.get("name") || ""),
        summary: optional("summary"),
        startsAt: toIso(String(form.get("startsAt") || "")) || undefined,
        formatKind: kind,
        // Fora do modo avancado nada mais viaja: cada `undefined` aqui e um
        // padrao que o servidor escolhe por quem esta criando.
        ...(advanced
          ? {
              format,
              rules: optional("rules"),
              platform: optional("platform"),
              prizeCents: { first: prize("first"), second: prize("second"), third: prize("third") },
              registrationOpensAt: toIso(String(form.get("opensAt") || "")) || undefined,
              registrationClosesAt: toIso(String(form.get("closesAt") || "")) || undefined,
            }
          : {}),
      });
      setNotice(`"${created.tournament.name}" está no ar com inscrições abertas. Chame os clubes.`);
      setShowForm(false);
      await reload();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível criar o campeonato.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell">
      <PlatformHeader />
      <div className="content">
        <div className={styles.page}>
          <section className={styles.hero}>
            <div>
              <small>COMPETIÇÕES OFICIAIS</small>
              <h1>Campeonatos da comunidade</h1>
              <p>
                Edições com fase de grupos, mata-mata e pontos corridos. Inscreva seu clube, acompanhe a tabela e lance
                os placares direto por aqui.
              </p>
            </div>
            <div className={styles.heroArt}>
              <Trophy />
            </div>
          </section>

          {notice && <p className={styles.notice} role="status">{notice}</p>}
          {error && <p className={`${styles.notice} ${styles.noticeError}`} role="alert">{error}</p>}

          <div className={styles.filters}>
            {SHELVES.map((item) => (
              <button
                key={item.key}
                type="button"
                className={shelf === item.key ? styles.active : ""}
                onClick={() => setShelf(item.key)}
              >
                {item.label}
              </button>
            ))}
            {canCreate && (
              <button type="button" className={styles.active} onClick={() => setShowForm((current) => !current)}>
                <Plus /> {showForm ? "Fechar" : "Criar campeonato"}
              </button>
            )}
          </div>

          {showForm && canCreate && (
            <section className={styles.panel}>
              <header>
                <h2>Criar campeonato</h2>
              </header>
              <p className={styles.notice}>
                Só o nome é obrigatório. Sem mexer em nada, a edição nasce com inscrições abertas, grupos de 4 com
                mata-mata e escada elástica de 8 a 32 clubes — o sorteio usa o tamanho que couber nos inscritos.
              </p>
              <form className={styles.form} onSubmit={submit}>
                <label>
                  Nome do campeonato
                  <input required name="name" maxLength={40} placeholder="Ex.: Copa Pro Clubs America" />
                </label>

                <div className={styles.formRow}>
                  <label>
                    Formato
                    <select value={kind} onChange={(event) => setKind(event.target.value as TournamentFormatKind)}>
                      <option value="groups_knockout">Grupos + mata-mata</option>
                      <option value="knockout">Mata-mata direto</option>
                      <option value="league">Pontos corridos</option>
                    </select>
                  </label>
                  <label>
                    Começa em <em>(opcional — padrão: em 7 dias)</em>
                    <input type="datetime-local" name="startsAt" />
                  </label>
                </div>

                <label>
                  Chamada curta <em>(opcional)</em>
                  <input name="summary" maxLength={240} placeholder="Ex.: 32 clubes, grupos de 4 e mata-mata" />
                </label>

                <button type="button" className={styles.chip} onClick={() => setAdvanced((current) => !current)}>
                  {advanced ? "Esconder ajustes avançados" : "Ajustar plataforma, datas, chaves e premiação"}
                </button>

                {advanced && kind === "groups_knockout" && (
                  <>
                    <div className={styles.formRow}>
                      <label>
                        Clubes por grupo
                        <select value={groupSize} onChange={(event) => setGroupSize(Number(event.target.value))}>
                          {[3, 4, 5, 6].map((size) => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Classificados por grupo
                        <select value={qualifiers} onChange={(event) => setQualifiers(Number(event.target.value))}>
                          {[1, 2].filter((value) => value < groupSize).map((value) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label>
                      Tamanhos que a edição aceita — o sorteio usa o maior que couber nos inscritos
                      <span className={styles.chips}>
                        {slotOptions.map((size) => (
                          <button
                            key={size}
                            type="button"
                            className={`${styles.chip} ${effectiveLadder.includes(size) ? "" : styles.chipOut}`}
                            onClick={() =>
                              setLadder((current) =>
                                current.includes(size) ? current.filter((item) => item !== size) : [...current, size],
                              )
                            }
                          >
                            {size} clubes
                          </button>
                        ))}
                      </span>
                    </label>
                  </>
                )}

                {advanced && kind === "knockout" && (
                  <label>
                    Tamanhos da chave
                    <span className={styles.chips}>
                      {[64, 32, 16, 8, 4].map((size) => (
                        <button
                          key={size}
                          type="button"
                          className={`${styles.chip} ${knockoutLadder.includes(size) ? "" : styles.chipOut}`}
                          onClick={() =>
                            setKnockoutLadder((current) =>
                              current.includes(size) ? current.filter((item) => item !== size) : [...current, size],
                            )
                          }
                        >
                          {size} clubes
                        </button>
                      ))}
                    </span>
                  </label>
                )}

                {advanced && (
                  <>
                    <label>
                      Plataforma
                      <select name="platform" defaultValue="common-gen5">
                        <option value="common-gen5">PS5 / Xbox Series / PC</option>
                        <option value="common-gen4">PS4 / Xbox One</option>
                        <option value="nx">Nintendo Switch</option>
                        <option value="crossplay">Crossplay (qualquer)</option>
                      </select>
                    </label>

                    <div className={styles.formRow}>
                      <label>
                        Inscrições abrem <em>(padrão: agora)</em>
                        <input type="datetime-local" name="opensAt" />
                      </label>
                      <label>
                        Inscrições fecham <em>(padrão: 1h antes do início)</em>
                        <input type="datetime-local" name="closesAt" />
                      </label>
                    </div>

                    <div className={styles.formRow}>
                      <label>
                        Prêmio 1º (R$)
                        <input type="number" name="first" min="0" step="1" defaultValue="0" />
                      </label>
                      <label>
                        Prêmio 2º (R$)
                        <input type="number" name="second" min="0" step="1" defaultValue="0" />
                      </label>
                      <label>
                        Prêmio 3º (R$)
                        <input type="number" name="third" min="0" step="1" defaultValue="0" />
                      </label>
                    </div>

                    <label>
                      Regulamento (markdown, até 8.000 caracteres)
                      <textarea name="rules" maxLength={8000} placeholder="Regras de W.O., horários, formato dos jogos…" />
                    </label>
                  </>
                )}

                <div className={styles.actions}>
                  <button type="submit" className={styles.primary} disabled={busy}>
                    <Trophy /> {busy ? "Criando…" : "Criar e abrir inscrições"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {loading && !data ? (
            <div className={styles.empty}>
              <strong>Carregando campeonatos…</strong>
            </div>
          ) : visible.length ? (
            <div className={styles.grid}>
              {visible.map((item) => {
                const filled = Math.min(100, Math.round((item.registeredCount / item.maxTeams) * 100));
                const registered = data?.registeredIn.includes(item.id);
                return (
                  <Link className={styles.card} key={item.id} href={`/campeonato/?id=${encodeURIComponent(item.slug)}`}>
                    <div className={styles.cardTop}>
                      <h2>{item.name}</h2>
                      <span className={`${styles.badge} ${badgeClass(item.status)}`}>{STATUS_LABEL[item.status]}</span>
                    </div>
                    {item.summary && <p>{item.summary}</p>}
                    <div className={styles.meta}>
                      <span><Trophy /> {FORMAT_LABEL[item.formatKind]}</span>
                      <span><Gamepad2 /> {PLATFORM_LABEL[item.platform] ?? item.platform}</span>
                      <span><CalendarDays /> {formatTournamentDate(item.startsAt)}</span>
                      {item.prizeCents.first > 0 && <span>{formatPrize(item.prizeCents.first)}</span>}
                    </div>
                    <div className={styles.slots}>
                      <div className={styles.slotsBar}>
                        <div className={styles.slotsFill} style={{ width: `${filled}%` }} />
                      </div>
                      <div className={styles.slotsText}>
                        <span><Users /> <b>{item.registeredCount}</b> de {item.maxTeams} clubes</span>
                        {registered && <span>Seu clube está inscrito</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className={styles.empty}>
              <Trophy />
              <strong>Nenhum campeonato neste filtro</strong>
              <span>
                {user
                  ? "Assim que uma edição abrir inscrições, ela aparece aqui."
                  : "Entre na sua conta para inscrever seu clube quando abrirem as inscrições."}
              </span>
            </div>
          )}
        </div>
      </div>
      <MobileNav />
    </main>
  );
}
