import Link from "next/link";
import { Award, ChevronRight, Shield, TrendingUp, Users } from "lucide-react";
import type { PlayerRanking } from "@/types/domain";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";

export type RankingMetric = "artilharia" | "assistencias" | "desarmes" | "aproveitamento";

interface RankingRow { id: string; name: string; value: number; secondary: string; clubName?: string; }
type RankedPlayer = PlayerRanking & { clubName?: string };

const config: Record<RankingMetric, { title: string; kicker: string; unit: string; description: string }> = {
  artilharia: { title: "Artilharia geral", kicker: "QUEM MAIS DECIDE", unit: "GOLS", description: "Maiores goleadores entre os jogadores e clubes já indexados." },
  assistencias: { title: "Ranking de assistências", kicker: "QUEM MAIS CRIA", unit: "ASSIST.", description: "Jogadores e elencos que mais produziram o último passe." },
  desarmes: { title: "Ranking de tackles", kicker: "QUEM MAIS RECUPERA", unit: "DESARMES", description: "Volume defensivo acumulado nos dados publicados pela fonte." },
  aproveitamento: { title: "Ranking de win rate", kicker: "QUEM MAIS VENCE", unit: "% VIT.", description: "Percentual de vitórias de jogadores e clubes da base." },
};

export function RankingsPage({ metric, players, clubs }: { metric: RankingMetric; players: RankedPlayer[]; clubs: RankingRow[] }) {
  const copy = config[metric];
  const eligiblePlayers = players.filter((player) => metric === "artilharia" ? player.goals != null : metric === "assistencias" ? player.assists != null : metric === "desarmes" ? player.tacklesMade != null : player.winRate != null);
  const playerRows: RankingRow[] = eligiblePlayers.map((player) => ({
    id: player.id,
    name: player.name,
    value: metric === "artilharia" ? player.goals ?? 0 : metric === "assistencias" ? player.assists ?? 0 : metric === "desarmes" ? player.tacklesMade ?? 0 : player.winRate ?? 0,
    secondary: `${player.position} · ${player.matches.toLocaleString("pt-BR")} jogos${metric === "desarmes" && player.tacklesMade != null && player.matches ? ` · ${(player.tacklesMade / player.matches).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}/jogo` : ""}`,
    clubName: player.clubName,
  })).sort((a, b) => b.value - a.value);
  const maxPlayer = playerRows[0]?.value || 1;
  const maxClub = clubs[0]?.value || 1;

  return <main className="app-shell rankings-page">
    <PlatformHeader />
    <section className="rankings-hero"><div><small>{copy.kicker}</small><h1>{copy.title}</h1><p>{copy.description}</p></div><Award /></section>
    <nav className="ranking-tabs" aria-label="Tipos de ranking">
      {(Object.keys(config) as RankingMetric[]).map((item) => <Link className={item === metric ? "active" : ""} href={`/rankings/${item}`} key={item}>{config[item].title}</Link>)}
      <Link href="/rankings/comunidade">Comunidade</Link>
    </nav>
    <div className="rankings-content">
      <section className="ranking-leaders">
        {playerRows.slice(0, 3).map((row, index) => <Link href={`/jogador/${encodeURIComponent(row.id)}`} className={`leader-card place-${index + 1}`} key={row.id}>
          <span>#{index + 1}</span><Award /><small>{copy.unit}</small><strong>{row.value.toLocaleString("pt-BR")}{metric === "aproveitamento" ? "%" : ""}</strong><h2>{row.name}{row.clubName && <em>{row.clubName}</em>}</h2><p>{row.secondary}</p>
        </Link>)}
      </section>
      <section className="ranking-columns">
        <article className="ranking-list"><header><div><Users /><span>JOGADORES</span></div><b>{playerRows.length} indexados</b></header>{playerRows.map((row, index) => <Link href={`/jogador/${encodeURIComponent(row.id)}`} key={row.id}><span className="ranking-position">{String(index + 1).padStart(2, "0")}</span><div><strong>{row.name}{row.clubName && <em>{row.clubName}</em>}</strong><small>{row.secondary}</small><i style={{ width: `${Math.max(4, row.value / maxPlayer * 100)}%` }} /></div><b>{row.value.toLocaleString("pt-BR")}{metric === "aproveitamento" ? "%" : ""}</b><ChevronRight /></Link>)}</article>
        <article className="ranking-list"><header><div><Shield /><span>CLUBES</span></div><b>{clubs.length} com dados</b></header>{clubs.map((row, index) => <Link href={`/club/${row.id}`} key={row.id}><span className="ranking-position">{String(index + 1).padStart(2, "0")}</span><div><strong>{row.name}</strong><small>{row.secondary}</small><i style={{ width: `${Math.max(4, row.value / maxClub * 100)}%` }} /></div><b>{row.value.toLocaleString("pt-BR")}{metric === "aproveitamento" ? "%" : ""}</b><ChevronRight /></Link>)}{!clubs.length && <div className="ranking-empty"><TrendingUp />Aguardando clubes com esta métrica confirmada.</div>}</article>
      </section>
      <p className="ranking-note">Rankings limitados aos clubes e jogadores atualmente indexados. A cobertura aumentará conforme novos clubes forem coletados.</p>
    </div>
    <MobileNav />
  </main>;
}
