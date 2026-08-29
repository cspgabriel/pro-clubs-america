"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminOverview, type AdminOverview } from "@/lib/community-service";

const number = (value: number) => value.toLocaleString("pt-BR");
const dateTime = (value: string | null) => (value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="admin-metric">
      <small>{label}</small>
      <strong>{value}</strong>
      {hint && <span>{hint}</span>}
    </article>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getAdminOverview()
      .then((payload) => { setData(payload); setError(""); })
      .catch((cause: Error) => setError(cause.message === "AUTH_REQUIRED" ? "Entre com a conta de administrador para ver o painel." : cause.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 400);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading && !data) return <div className="admin-state">Carregando painel…</div>;
  if (error && !data) return <div className="admin-state admin-state-error">{error}<button type="button" onClick={load}>Tentar novamente</button></div>;
  if (!data) return null;

  const { totals, growth, crawl } = data;

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <small>PAINEL INTERNO</small>
          <h1>Visão geral</h1>
          <p>Atualizado em {dateTime(data.generatedAt)}</p>
        </div>
        <button type="button" onClick={load} disabled={loading}>{loading ? "Atualizando…" : "Atualizar"}</button>
      </header>

      <section className={`admin-alert ${crawl.healthy ? "ok" : "bad"}`}>
        <strong>{crawl.healthy ? "Crawler saudável" : "Crawler sem dado novo"}</strong>
        <span>
          Última partida coletada: {dateTime(crawl.lastSnapshotAt)}
          {crawl.lastSnapshotAgeHours !== null && ` (há ${crawl.lastSnapshotAgeHours}h · limite ${crawl.staleThresholdHours}h)`}
        </span>
      </section>

      <section className="admin-metrics">
        <Metric label="USUÁRIOS" value={number(totals.profiles)} hint={`+${growth.newProfiles7d} em 7 dias`} />
        <Metric label="CLUBES" value={number(totals.clubs)} hint={`${totals.approvedClaims} reivindicados`} />
        <Metric label="JOGADORES" value={number(totals.players)} />
        <Metric label="PARTIDAS EA" value={number(totals.snapshots)} hint={`+${growth.snapshots24h} em 24h`} />
        <Metric label="PARTIDAS NA PLATAFORMA" value={number(totals.matches)} />
        <Metric label="ANÚNCIOS DO MERCADO" value={number(totals.marketListings)} />
        <Metric label="ASSINATURAS ATIVAS" value={number(totals.paidEntitlements)} />
        <Metric label="FILA DE COLETA" value={number(crawl.queue.queued)} hint={`${crawl.queue.failed} falhas · ${crawl.queue.blocked} bloqueados`} />
      </section>

      <section className="admin-block">
        <h2>Coleta — clubes prioritários</h2>
        {crawl.priorityQueue.length === 0 ? <p className="admin-empty">Nenhum clube com prioridade alta na fila.</p> : (
          <div className="admin-table-wrap">
            <table>
              <thead><tr><th>Clube</th><th>Status</th><th>Tentativas</th><th>Próxima coleta</th><th>Último erro</th></tr></thead>
              <tbody>
                {crawl.priorityQueue.map((item) => (
                  <tr key={item.club_id}>
                    <td>{item.club_id.slice(0, 8)}</td>
                    <td><span className={`admin-tag ${item.status}`}>{item.status}</span></td>
                    <td>{item.attempts}</td>
                    <td>{dateTime(item.next_run_at)}</td>
                    <td className="admin-error-cell">{item.last_error || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-block">
        <h2>Últimas execuções do crawler</h2>
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>Início</th><th>Status</th><th>Clubes</th><th>Partidas</th><th>Jogadores</th><th>Erros</th></tr></thead>
            <tbody>
              {crawl.runs.map((run) => (
                <tr key={run.started_at}>
                  <td>{dateTime(run.started_at)}</td>
                  <td><span className={`admin-tag ${run.status}`}>{run.status}</span></td>
                  <td>{run.clubs_processed}</td>
                  <td>{run.matches_observed}</td>
                  <td>{run.players_observed}</td>
                  <td>{run.error_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-block">
        <h2>Usuários recentes</h2>
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>E-mail</th><th>Nome</th><th>Papel</th><th>Plano</th><th>Clube</th><th>EA</th><th>Cadastro</th></tr></thead>
            <tbody>
              {data.recentProfiles.map((profile) => (
                <tr key={profile.email}>
                  <td>{profile.email}</td>
                  <td>{profile.full_name || "—"}</td>
                  <td><span className={`admin-tag ${profile.role}`}>{profile.role}</span></td>
                  <td>{profile.plan}</td>
                  <td>{profile.club_id ? "sim" : "—"}</td>
                  <td>{profile.player_id ? "sim" : "—"}</td>
                  <td>{dateTime(profile.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-block">
        <h2>Clubes recentes</h2>
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>EA ID</th><th>Plataforma</th><th>País</th><th>Criado</th></tr></thead>
            <tbody>
              {data.recentClubs.map((club) => (
                <tr key={club.id}>
                  <td><a href={`/club/${club.ea_club_id}/`}>{club.name}</a></td>
                  <td>{club.ea_club_id}</td>
                  <td>{club.platform}</td>
                  <td>{club.country_slug || "—"}</td>
                  <td>{dateTime(club.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
