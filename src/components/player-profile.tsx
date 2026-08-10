"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Crown, ExternalLink, LockKeyhole, Shield, Target, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PlayerRanking } from "@/types/domain";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";
import { CountryFlag } from "./country-flag";
import { observeAuth } from "@/lib/auth-client";
import { getCommunityProfile } from "@/lib/community-service";

export interface PlayerRecentMatch {
  id: string;
  label: string;
  opponent: string;
  score: string;
  result: "V" | "E" | "D";
  goals: number;
  assists: number;
  rating: number | null;
  passes: number | null;
  tackles: number | null;
}

interface PlayerProfileProps {
  player: PlayerRanking;
  club: { id: string; name: string; crestUrl?: string; sourceUrl: string };
  recentMatches: PlayerRecentMatch[];
  limitedData?: boolean;
}

const number = new Intl.NumberFormat("pt-BR");
const decimal = (value: number | null, matches: number) => value == null || !matches ? "—" : (value / matches).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export function PlayerProfile({ player, club, recentMatches, limitedData = false }: PlayerProfileProps) {
  const [officialMatches, setOfficialMatches] = useState<PlayerRecentMatch[]>(recentMatches);
  const [historySyncing, setHistorySyncing] = useState(true);
  const chronological = officialMatches.slice().reverse();
  const [premium, setPremium] = useState(false);
  useEffect(() => observeAuth((user) => {
    if (!user) { setPremium(false); return; }
    getCommunityProfile().then((profile) => {
      setPremium(Boolean(profile?.premiumAccess));
    }).catch(() => setPremium(false));
  }), []);
  useEffect(() => {
    let active = true;
    const query = new URLSearchParams({ gamertag: player.name, clubId: club.id });
    fetch(`/api/community/player-history?${query.toString()}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("PLAYER_HISTORY_UNAVAILABLE")))
      .then((payload: { matches?: Array<Omit<PlayerRecentMatch, "label"> & { playedAt: string }> }) => {
        if (!active || !Array.isArray(payload.matches)) return;
        const live = payload.matches.map((match) => ({ ...match, label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(match.playedAt)) }));
        const merged = [...live, ...recentMatches].filter((match, index, list) => list.findIndex((item) => item.id === match.id) === index).slice(0, 10);
        setOfficialMatches(merged);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setHistorySyncing(false); });
    return () => { active = false; };
  }, [club.id, player.name, recentMatches]);

  return (
    <main className="app-shell player-page">
      <PlatformHeader />
      <section className="player-hero">
        <div className="player-identity-card">
          <span className="player-ovr-label">{player.overallRating == null && player.averageRating != null ? "NOTA" : "OVR"}</span>
          <strong>{player.overallRating ?? player.averageRating ?? "—"}</strong>
          <span>{player.position}</span>
        </div>
        <div className="player-hero-copy">
          <Link className="player-back" href="/#jogadores"><ArrowLeft size={15} /> VOLTAR À BUSCA</Link>
          <small>PERFIL DO JOGADOR</small>
          <h1 className="player-name-country">{player.name}<CountryFlag country={player.country} /></h1>
          <Link className="player-club-link" href={`/club/${club.id}`}>
            {club.crestUrl && <Image src={club.crestUrl} alt={`Escudo ${club.name}`} width={38} height={38} unoptimized />}
            <span><b>{club.name}</b><small>Ver página do clube</small></span>
          </Link>
        </div>
        <div className="player-source-stamp"><Shield size={18} /><span>DADOS PÚBLICOS<br /><b>EA SPORTS FC CLUBS</b></span></div>
      </section>

      <div className="player-content">
        <section className="player-kpis" aria-label="Estatísticas do jogador">
          <article><small>JOGOS</small><strong>{number.format(player.matches)}</strong></article>
          <article><small>GOLS</small><strong>{player.goals == null ? "—" : number.format(player.goals)}</strong></article>
          <article><small>ASSISTÊNCIAS</small><strong>{player.assists == null ? "—" : number.format(player.assists)}</strong></article>
          <article><small>PARTICIPAÇÕES</small><strong>{player.goalContributions == null ? "—" : number.format(player.goalContributions)}</strong></article>
          <article><small>{player.passSuccessRate == null && player.averageRating != null ? "NOTA MÉDIA" : "PASSES CERTOS"}</small><strong>{player.passSuccessRate == null ? player.averageRating ?? "—" : `${player.passSuccessRate}%`}</strong></article>
          <article><small>VITÓRIAS</small><strong>{player.winRate == null ? "—" : `${player.winRate}%`}</strong></article>
        </section>

        <section className="player-layout">
          <aside className="player-panel player-efficiency">
            <header><div><small>CARREIRA NO CLUBE</small><h2>Eficiência</h2></div><Target /></header>
            <div className={!premium ? "premium-metric locked" : "premium-metric"}><span>Gols por jogo <small>PREMIUM</small></span><strong>{premium ? decimal(player.goals, player.matches) : <LockKeyhole />}</strong></div>
            <div className={!premium ? "premium-metric locked" : "premium-metric"}><span>Assistências por jogo <small>PREMIUM</small></span><strong>{premium ? decimal(player.assists, player.matches) : <LockKeyhole />}</strong></div>
            <div><span>Passes por jogo</span><strong>{decimal(player.passesMade, player.matches)}</strong></div>
            <div><span>Desarmes</span><strong>{player.tacklesMade == null ? "—" : number.format(player.tacklesMade)}</strong></div>
            <div><span>Desarmes por jogo</span><strong>{decimal(player.tacklesMade, player.matches)}</strong></div>
            <div><span>Sucesso no desarme</span><strong>{player.tackleSuccessRate == null ? "—" : `${player.tackleSuccessRate}%`}</strong></div>
            <div><span>Clean sheets</span><strong>{limitedData ? "—" : number.format(player.cleanSheets)}</strong></div>
            {!premium && <Link className="premium-metrics-cta" href="/planos"><Crown /> Liberar médias e análises Premium</Link>}
          </aside>

          <article className="player-panel player-trend">
            <header><div><small>RECORTE CONFIRMADO</small><h2>Desempenho recente</h2></div><span>{historySyncing ? "Atualizando EA…" : `${officialMatches.length} jogos encontrados`}</span></header>
            {chronological.length ? <div className="player-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chronological} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="#2b2d29" vertical={false} />
                  <XAxis dataKey="opponent" stroke="#737970" tickLine={false} axisLine={false} tick={{ fontSize: 9 }} />
                  <YAxis domain={[0, 10]} stroke="#737970" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#0b0c0a", border: "1px solid #2b2d29", borderRadius: 0 }} />
                  <Line type="linear" dataKey="rating" name="Nota" connectNulls stroke="#00e676" strokeWidth={3} dot={{ fill: "#00e676", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div> : <div className="player-no-data">Nenhuma atuação individual aparece nas partidas recentes coletadas.</div>}
          </article>
        </section>

        {chronological.length > 0 && <section className="player-panel player-actions-panel">
          <header><div><small>JOGO A JOGO</small><h2>Gols e assistências</h2></div><Trophy /></header>
          <div className="player-chart compact">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chronological} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#2b2d29" vertical={false} />
                <XAxis dataKey="opponent" stroke="#737970" tickLine={false} axisLine={false} tick={{ fontSize: 9 }} />
                <YAxis allowDecimals={false} stroke="#737970" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#0b0c0a", border: "1px solid #2b2d29", borderRadius: 0 }} />
                <Bar dataKey="goals" name="Gols" fill="#00e676" />
                <Bar dataKey="assists" name="Assistências" fill="#676d65" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>}

        <section className="player-panel player-match-list">
          <header><div><small>FONTE: HISTÓRICO DO CLUBE</small><h2>Partidas com dados individuais</h2></div><a href={club.sourceUrl} target="_blank" rel="noreferrer">Fonte pública <ExternalLink size={14} /></a></header>
          {officialMatches.length ? officialMatches.map((match) => <article key={match.id}>
            <span className={`player-result ${match.result}`}>{match.result}</span>
            <div><strong>{match.opponent}</strong><small>{match.label} · {match.score}</small></div>
            <dl><div><dt>G</dt><dd>{match.goals}</dd></div><div><dt>A</dt><dd>{match.assists}</dd></div><div><dt>NOTA</dt><dd>{match.rating ?? "—"}</dd></div><div><dt>PASSES</dt><dd>{match.passes ?? "—"}</dd></div></dl>
          </article>) : <div className="player-no-data">O histórico recente não publicou estatísticas deste jogador.</div>}
        </section>
      </div>
      <footer className="platform-footer">Estatísticas vinculadas ao jogador e ao clube de origem. Dados exibidos conforme a fonte pública coletada.</footer>
      <MobileNav />
    </main>
  );
}
