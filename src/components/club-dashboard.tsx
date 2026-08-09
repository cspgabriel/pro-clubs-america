"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  CalendarDays,
  Database,
  Goal,
  Medal,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Swords,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { DashboardData } from "@/types/domain";
import { ThemeToggle } from "./theme-toggle";
import { BrandLogo } from "./brand-logo";

const number = new Intl.NumberFormat("pt-BR");

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Database size={22} /></div>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

export function ClubDashboard({ data }: { data: DashboardData }) {
  const [matchMode, setMatchMode] = useState<"leagueMatch" | "playoffMatch" | "friendlyMatch">("leagueMatch");
  const statusLabel = data.source.state === "complete"
    ? "Dados atualizados"
    : data.source.state === "partial"
      ? "Coleta parcial"
      : "Importação pendente";
  const recentGoalsFor = data.form.reduce((total, game) => total + game.goalsFor, 0);
  const recentGoalsAgainst = data.form.reduce((total, game) => total + game.goalsAgainst, 0);
  const visibleMatches = data.matches.filter((match) => (match.mode ?? "leagueMatch") === matchMode);

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Pro Clubs America — início">
          <BrandLogo size={46} />
          <span>PRO CLUBS <b>AMERICA</b></span>
        </a>
        <nav aria-label="Navegação principal">
          <a href="#visao">Visão geral</a>
          <a href="#jogadores">Jogadores</a>
          <Link href="/rankings/jogadores/artilharia">Rankings</Link>
          <Link href="/partidas">Partidas</Link>
        </nav>
        <a className="source-link" href={data.club.sourceUrl} target="_blank" rel="noreferrer">
          Fonte pública <ArrowUpRight size={15} />
        </a>
        <ThemeToggle />
      </header>

      <section className="hero" id="inicio">
        <div className="hero-glow" />
        <div className="club-crest">
          {data.club.crestUrl ? <Image src={data.club.crestUrl} alt={`Escudo ${data.club.name}`} width={132} height={132} unoptimized /> : <span>{data.club.name.slice(0, 2)}</span>}
        </div>
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={14} /> CLUBE EM DESTAQUE</div>
          <h1>{data.club.name}</h1>
          <p>Central independente de desempenho, elenco e histórico competitivo.</p>
          <div className="club-meta">
            <span><ShieldCheck size={15} /> ID {data.club.id}</span>
            <span><Users size={15} /> Crossplay — geração atual</span>
            {data.club.overview && <span><Trophy size={15} /> Skill rating {data.club.overview.skillRating}</span>}
          </div>
          <Link className="challenge-team-button" href={`/partidas/amistosos?desafiar=${data.club.id}&nome=${encodeURIComponent(data.club.name)}#buscar-amistoso`}><Swords size={16} /> Desafiar clube</Link>
        </div>
        <div className={`sync-status ${data.source.state}`}>
          <span className="status-dot" />
          <div><small>STATUS DA BASE</small><strong>{statusLabel}</strong></div>
        </div>
      </section>

      <section className="content" id="visao">
        {data.source.state !== "complete" && (
          <aside className="notice">
            <RefreshCcw size={19} />
            <div><strong>Base preparada para dados reais</strong><p>{data.source.note}</p></div>
          </aside>
        )}

        <div className="section-heading">
          <div><span>PAINEL DE DESEMPENHO</span><h2>Visão geral</h2></div>
          <small>{data.source.fetchedAt ? `Atualizado em ${new Date(data.source.fetchedAt).toLocaleString("pt-BR")}` : "Aguardando primeira coleta"}</small>
        </div>

        <div className="stat-grid">
          <article className="stat-card"><div><CalendarDays /><span>JOGOS</span></div><strong>{number.format(data.summary.matches)}</strong><small>partidas no histórico geral</small></article>
          <article className="stat-card"><div><Trophy /><span>VITÓRIAS</span></div><strong>{number.format(data.summary.wins)}</strong><small>{data.summary.winRate}% de aproveitamento</small></article>
          <article className="stat-card"><div><Goal /><span>GOLS MARCADOS</span></div><strong>{number.format(data.summary.goalsFor)}</strong><small>{data.summary.matches ? (data.summary.goalsFor / data.summary.matches).toFixed(1) : "0,0"} por jogo</small></article>
          <article className="stat-card"><div><Medal /><span>JOGADORES</span></div><strong>{number.format(data.club.overview?.members ?? data.players.length)}</strong><small>{data.rankings.length} com detalhes coletados</small></article>
        </div>

        <div className="form-top">
          <article className="panel form-panel">
            <div className="panel-heading"><div><span>RECORTE RECENTE</span><h3>Forma do clube</h3></div></div>
            {data.form.length ? (
              <><div className="form-row">{data.form.slice(-5).map((game, index) => <span key={`${game.label}-${index}`} className={game.result}>{game.result}</span>)}</div><div className="form-numbers"><div><strong>{recentGoalsFor}</strong><small>Gols pró</small></div><div><strong>{recentGoalsAgainst}</strong><small>Gols contra</small></div><div><strong>{recentGoalsFor - recentGoalsAgainst}</strong><small>Saldo</small></div></div></>
            ) : <EmptyState title="Forma indisponível" text="Precisamos de pelo menos uma partida válida." />}
          </article>
        </div>

        <section className="panel ranking-panel" id="jogadores">
          <div className="panel-heading"><div><span>ELENCO E PERFORMANCE</span><h3>Ranking de jogadores</h3></div><span className="count-pill">{data.rankings.length} atletas</span></div>
          {data.rankings.length ? (
            <div className="table-wrap"><table><thead><tr><th>#</th><th>Jogador</th><th>OVR</th><th>Posição</th><th>Jogos</th><th>Gols</th><th>Assist.</th><th>G+A</th><th>Passes</th><th>% passe</th><th>% vit.</th></tr></thead><tbody>{data.rankings.map((player, index) => <tr key={player.id}><td><span className="rank">{index + 1}</span></td><td><Link className="player-table-link" href={`/jogador/${encodeURIComponent(player.id)}`}>{player.name}<ArrowUpRight size={13} /></Link></td><td className="accent-number">{player.overallRating ?? "—"}</td><td>{player.position}</td><td>{player.matches}</td><td className="accent-number">{player.goals ?? "—"}</td><td>{player.assists ?? "—"}</td><td>{player.goalContributions ?? "—"}</td><td>{player.passesMade?.toLocaleString("pt-BR") ?? "—"}</td><td>{player.passSuccessRate == null ? "—" : `${player.passSuccessRate}%`}</td><td>{player.winRate == null ? "—" : `${player.winRate}%`}</td></tr>)}</tbody></table></div>
          ) : <EmptyState title="Elenco aguardando importação" text="Os nomes e estatísticas serão exibidos somente depois da leitura real da página oficial." />}
        </section>

        <section className="panel matches-panel" id="partidas">
          <div className="panel-heading"><div><span>HISTÓRICO</span><h3>Partidas recentes</h3></div><div className="mode-tabs"><button className={matchMode === "leagueMatch" ? "active" : ""} onClick={() => setMatchMode("leagueMatch")}>Liga</button><button className={matchMode === "friendlyMatch" ? "active" : ""} onClick={() => setMatchMode("friendlyMatch")}>Friendly</button><button className={matchMode === "playoffMatch" ? "active" : ""} onClick={() => setMatchMode("playoffMatch")}>Playoff</button></div></div>
          {visibleMatches.length ? visibleMatches.slice(0, 10).map(match => {
            const home = match.homeClubId === data.club.id;
            return <article className="match-row" key={match.id}><div><small>{new Date(match.playedAt).toLocaleDateString("pt-BR")}</small><strong>{match.competition}</strong></div><div className="scoreline"><span>{home ? data.club.name : match.homeClubName}</span><b>{match.homeScore} × {match.awayScore}</b><span>{home ? match.awayClubName : data.club.name}</span></div></article>;
          }) : <EmptyState title="Nenhum jogo coletado neste modo" text="A plataforma mantém Liga, Friendly e Playoff separados e só exibe o que foi confirmado na fonte." />}
        </section>

        <article className="panel chart-panel chart-panel-last">
          <div className="panel-heading"><div><span>ÚLTIMAS PARTIDAS</span><h3>Evolução de gols</h3></div><div className="legend"><i className="ours" /> {data.club.name} <i className="theirs" /> Adversário</div></div>
          {data.form.length ? (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.form} margin={{ top: 12, right: 10, left: -24, bottom: 0 }}>
                  <defs><linearGradient id="goals" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity={0.42}/><stop offset="100%" stopColor="#22c55e" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#243149" vertical={false} />
                  <XAxis dataKey="label" stroke="#738398" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke="#738398" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#07101f", border: "1px solid #243149", borderRadius: 0 }} />
                  <Area type="monotone" dataKey="goalsFor" stroke="#22c55e" fill="url(#goals)" strokeWidth={3} name={data.club.name} />
                  <Area type="monotone" dataKey="goalsAgainst" stroke="#78879a" fill="transparent" strokeWidth={2} name="Adversário" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState title="Ainda sem partidas" text="O gráfico aparecerá assim que o histórico público for importado." />}
        </article>
      </section>

      <footer><strong>PRO CLUBS AMERICA</strong><p>Projeto comunitário independente. Este site não é afiliado nem patrocinado pela Electronic Arts Inc. ou seus licenciadores.</p></footer>
    </main>
  );
}
