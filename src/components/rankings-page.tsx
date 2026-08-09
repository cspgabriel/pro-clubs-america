import Link from "next/link";
import { Award, ChevronRight, Shield, TrendingUp, Users } from "lucide-react";
import type { ClubRankingRow, RankedPlayer, RankingMetric } from "@/lib/ranking-data";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";

interface RankingRow { id: string; name: string; value: number; secondary: string; clubName?: string; }

const config: Record<RankingMetric, { title: string; short: string; kicker: string; unit: string }> = {
  artilharia: { title: "Artilharia", short: "Gols", kicker: "QUEM MAIS DECIDE", unit: "GOLS" },
  assistencias: { title: "Assistências", short: "Assist.", kicker: "QUEM MAIS CRIA", unit: "ASSIST." },
  desarmes: { title: "Desarmes", short: "Desarmes", kicker: "QUEM MAIS RECUPERA", unit: "DESARMES" },
  aproveitamento: { title: "Aproveitamento", short: "Win rate", kicker: "QUEM MAIS VENCE", unit: "% VIT." },
};

function EntityTabs({ entity, metric }: { entity: "players" | "clubs"; metric: RankingMetric }) {
  return <>
    <nav className="ranking-entity-tabs" aria-label="Categoria do ranking">
      <Link className={entity === "players" ? "active" : ""} href={`/rankings/jogadores/${metric}`}><Users /> Jogadores</Link>
      <Link className={entity === "clubs" ? "active" : ""} href={`/rankings/clubes/${metric}`}><Shield /> Clubes</Link>
      <Link href="/rankings/times"><Award /> Ranking de times</Link>
    </nav>
    <nav className="ranking-tabs" aria-label="Métrica do ranking">
      {(Object.keys(config) as RankingMetric[]).map((item) => <Link className={item === metric ? "active" : ""} href={`/rankings/${entity === "players" ? "jogadores" : "clubes"}/${item}`} key={item}>{config[item].short}</Link>)}
    </nav>
  </>;
}

export function RankingsPage({ metric, entity, players = [], clubs = [] }: { metric: RankingMetric; entity: "players" | "clubs"; players?: RankedPlayer[]; clubs?: ClubRankingRow[] }) {
  const copy = config[metric];
  const playerRows: RankingRow[] = players.filter((player) => metric === "artilharia" ? player.goals != null : metric === "assistencias" ? player.assists != null : metric === "desarmes" ? player.tacklesMade != null : player.winRate != null).map((player) => ({
    id: player.id,
    name: player.name,
    value: metric === "artilharia" ? player.goals ?? 0 : metric === "assistencias" ? player.assists ?? 0 : metric === "desarmes" ? player.tacklesMade ?? 0 : player.winRate ?? 0,
    secondary: `${player.position} · ${player.matches.toLocaleString("pt-BR")} jogos${metric === "desarmes" && player.tacklesMade != null && player.matches ? ` · ${(player.tacklesMade / player.matches).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}/jogo` : ""}`,
    clubName: player.clubName,
  })).sort((a, b) => b.value - a.value);
  const rows: RankingRow[] = entity === "players" ? playerRows : clubs;
  const maxValue = rows[0]?.value || 1;
  const entityTitle = entity === "players" ? "jogadores" : "clubes";

  return <main className="app-shell rankings-page">
    <PlatformHeader />
    <section className="rankings-hero"><div><small>{copy.kicker}</small><h1>{copy.title} de {entityTitle}</h1><p>Classificação exclusiva de {entityTitle} nos dados públicos já indexados.</p></div>{entity === "players" ? <Users /> : <Shield />}</section>
    <EntityTabs entity={entity} metric={metric} />
    <div className="rankings-content">
      <section className="ranking-leaders compact-leaders">
        {rows.slice(0, 3).map((row, index) => <Link href={entity === "players" ? `/jogador/${encodeURIComponent(row.id)}` : `/club/${row.id}`} className={`leader-card place-${index + 1}`} key={row.id}>
          <span>#{index + 1}</span><Award /><small>{copy.unit}</small><strong>{row.value.toLocaleString("pt-BR")}{metric === "aproveitamento" ? "%" : ""}</strong><h2>{row.name}{row.clubName && <em>{row.clubName}</em>}</h2><p>{row.secondary}</p>
        </Link>)}
      </section>
      <section className="ranking-list ranking-list-full"><header><div>{entity === "players" ? <Users /> : <Shield />}<span>{entityTitle.toUpperCase()}</span></div><b>{rows.length} indexados</b></header>
        {rows.map((row, index) => <Link href={entity === "players" ? `/jogador/${encodeURIComponent(row.id)}` : `/club/${row.id}`} key={row.id}><span className="ranking-position">{String(index + 1).padStart(2, "0")}</span><div><strong>{row.name}{row.clubName && <em>{row.clubName}</em>}</strong><small>{row.secondary}</small><i style={{ width: `${Math.max(4, row.value / maxValue * 100)}%` }} /></div><b>{row.value.toLocaleString("pt-BR")}{metric === "aproveitamento" ? "%" : ""}</b><ChevronRight /></Link>)}
        {!rows.length && <div className="ranking-empty"><TrendingUp />Aguardando dados confirmados para esta métrica.</div>}
      </section>
      <p className="ranking-note">Ranking limitado aos {entityTitle} atualmente indexados. A cobertura aumenta conforme novas coletas públicas são validadas.</p>
    </div>
    <MobileNav />
  </main>;
}
