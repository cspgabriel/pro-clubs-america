"use client";

import Link from "next/link";
import { CheckCircle2, Clock3, ExternalLink, Shield, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import type { TeamRegistration } from "@/lib/community";
import { watchCommunityClubs } from "@/lib/community-service";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";
import { CountryFlag } from "./country-flag";

interface OfficialCommunityClub { id: string; name: string; skillRating: number; matches: number; wins: number; winRate: number; goals: number; }

export function CommunityRanking({ officialClubs }: { officialClubs: OfficialCommunityClub[] }) {
  const [pending, setPending] = useState<TeamRegistration[]>([]);
  useEffect(() => watchCommunityClubs((items) => setPending(items.filter((item) => item.status === "pending_review"))), []);

  return <main className="app-shell community-ranking"><PlatformHeader />
    <section className="rankings-hero"><div><small>TIMES DA COMUNIDADE</small><h1>Ranking de times</h1><p>Clubes cadastrados na plataforma com dados públicos validados na EA.</p></div><Shield /></section>
    <nav className="ranking-entity-tabs" aria-label="Categoria do ranking"><Link href="/rankings/jogadores/artilharia">Jogadores</Link><Link href="/rankings/clubes/artilharia">Clubes</Link><Link className="active" href="/rankings/times">Ranking de times</Link></nav>
    <div className="community-content">
      <header><div><small>CLASSIFICAÇÃO ATUAL</small><h2>{officialClubs.length} clubes validados</h2></div><Link href="/cadastro"><UserPlus /> Cadastrar meu time</Link></header>
      <section className="community-table"><div className="community-head"><span>#</span><span>Clube</span><span>SR</span><span>Jogos</span><span>Vitórias</span><span>Win rate</span><span>Gols</span></div>{officialClubs.map((club, index) => <Link href={`/club/${club.id}`} className="community-row" key={club.id}><span>{String(index + 1).padStart(2, "0")}</span><strong><Shield />{club.name}<small>ID {club.id}</small></strong><b>{club.skillRating.toLocaleString("pt-BR")}</b><span>{club.matches.toLocaleString("pt-BR")}</span><span>{club.wins.toLocaleString("pt-BR")}</span><span>{club.winRate}%</span><span>{club.goals.toLocaleString("pt-BR")}</span></Link>)}</section>
      <section className="pending-clubs"><header><div><Clock3 /><span>FILA DE INDEXAÇÃO<strong>Times enviados nas últimas 24 horas</strong></span></div><b>{pending.length} pendentes</b></header>{pending.length ? pending.map((club) => <article key={club.id}><Clock3 /><div><strong>{club.clubName} <CountryFlag country={club.country} /></strong><small>EA ID {club.clubId} · enviado {new Date(club.submittedAt).toLocaleString("pt-BR")}</small></div><span>AGUARDANDO COLETA</span><a href={club.eaUrl} target="_blank" rel="noreferrer" aria-label={`Abrir ${club.clubName} na EA`}><ExternalLink /></a></article>) : <div className="pending-empty"><CheckCircle2 /> Nenhum cadastro aguardando coleta.</div>}</section>
      <p className="ranking-note">A posição usa somente dados públicos já validados. O cadastro não garante entrada imediata se a URL estiver inválida ou a EA não publicar o clube.</p>
    </div><MobileNav /></main>;
}
