"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, BriefcaseBusiness, Search, Shield, Swords, Users } from "lucide-react";
import type { PlayerRanking } from "@/types/domain";
import { PlatformHeader } from "./platform-header";
import { MobileNav } from "./mobile-nav";

interface HomeClub { id: string; name: string; crestUrl: string; skillRating?: number; record?: string; }
type HomePlayer = PlayerRanking & { clubName?: string };

export function MarketHome({ players, availableClubs }: { players: HomePlayer[]; availableClubs: HomeClub[] }) {
  const [query, setQuery] = useState("");
  const [featured, setFeatured] = useState(0);
  const term = query.trim().toLocaleLowerCase("pt-BR");
  const clubs = useMemo(() => availableClubs.filter((club) => club.name.toLocaleLowerCase("pt-BR").includes(term)), [availableClubs, term]);
  const matchingPlayers = useMemo(() => players.filter((player) => player.name.toLocaleLowerCase("pt-BR").includes(term)), [players, term]);
  const visiblePlayers = (term ? matchingPlayers : players.slice().sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))).slice(0, 9);
  const leader = players[0];
  const slides = [
    { kicker: "CLUBE EM DESTAQUE", title: "Villathinaikos", text: "2.403 skill rating · 624 vitórias", href: "/club/171630", action: "Ver clube" },
    { kicker: "ARTILHARIA GERAL", title: leader?.name ?? "Ranking de jogadores", text: leader ? `${leader.goals ?? 0} gols em ${leader.matches} jogos` : "Compare os destaques da comunidade", href: "/rankings/artilharia", action: "Abrir ranking" },
    { kicker: "MURAL DA COMUNIDADE", title: "Partidas e amistosos", text: "Resultados oficiais e desafios organizados pela plataforma", href: "/partidas", action: "Ver partidas" },
  ];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setFeatured((current) => (current + 1) % slides.length), 5000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  return (
    <main className="app-shell">
      <PlatformHeader />
      <section className="featured-slider" aria-label="Destaques">
        <div className="featured-track" key={featured}>
          <div><small>{slides[featured].kicker}</small><h2>{slides[featured].title}</h2><p>{slides[featured].text}</p></div>
          <Link href={slides[featured].href}>{slides[featured].action}<ArrowRight /></Link>
        </div>
        <div className="featured-dots" aria-label="Selecionar destaque">{slides.map((slide, index) => <button type="button" aria-label={`Mostrar ${slide.title}`} aria-current={index === featured} className={index === featured ? "active" : ""} onClick={() => setFeatured(index)} key={slide.title} />)}</div>
      </section>
      <section className="market-hero" id="buscar">
        <div className="market-wordmark"><span>CB</span><strong>CLUBS BRASIL</strong></div>
        <h1>Seu clube. Seu time. Sua comunidade.</h1>
        <p className="market-intro">Encontre clubes, jogadores, partidas e oportunidades para crescer no Pro Clubs.</p>
        <label className="global-search">
          <Search size={20} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar clube ou jogador" />
          <span>FC 26</span>
        </label>
        <div className="quick-links">
          <Link href="/clubes"><Shield /> Clubes</Link>
          <Link href="/jogadores"><Users /> Jogadores</Link>
          <Link href="/partidas#buscar-amistoso"><Swords /> Buscar amistoso</Link>
          <Link href="/rankings/artilharia"><BarChart3 /> Rankings</Link>
          <Link href="/mercado"><BriefcaseBusiness /> Mercado</Link>
        </div>
      </section>

      <section className="market-section" id="clubes">
        <div className="market-title"><div><small>{availableClubs.length} CLUBES INDEXADOS</small><h2>Clubes encontrados</h2></div><span>common-gen5</span></div>
        {clubs.length ? <div className="club-strip">{clubs.map((club) => (
          <Link className="club-market-card" href={`/club/${club.id}`} key={club.id}>
            <Image src={club.crestUrl} alt={`Escudo ${club.name}`} width={72} height={72} unoptimized />
            <div><strong>{club.name}</strong><small>ID {club.id}</small>{club.skillRating ? <b>SR {club.skillRating}</b> : <em>Visto no histórico</em>}</div>
          </Link>
        ))}</div> : <div className="market-empty">{/^\d+$/.test(term) ? <><strong>Clube ID {term}</strong><Link href={`/club/${term}`}>Preparar página deste clube</Link></> : "Nenhum clube encontrado."}</div>}
      </section>

      <section className="market-section" id="jogadores">
        <div className="market-title"><div><small>BASE DE JOGADORES</small><h2>Mercado de desempenho</h2></div><span>{players.length} jogadores</span></div>
        {term && matchingPlayers.length === 0 ? <div className="market-empty">Nenhum jogador encontrado.</div> : (
          <div className="home-player-grid">{visiblePlayers.map((player) => <Link href={`/jogador/${encodeURIComponent(player.id)}`} key={player.id}><span><small>{player.overallRating != null ? "OVR" : "NOTA"}</small><b>{player.overallRating ?? player.averageRating ?? "—"}</b></span><div><strong>{player.name}</strong><small>{player.clubName ?? "Clube indexado"}</small><p>{player.position} · {player.matches.toLocaleString("pt-BR")} jogos</p></div><dl><span><b>{player.goals ?? "—"}</b> gols</span><span><b>{player.assists ?? "—"}</b> assist.</span></dl></Link>)}</div>
        )}
      </section>
      <footer className="platform-footer">Plataforma comunitária independente para EA SPORTS FC Clubs. Sem afiliação ou patrocínio da Electronic Arts Inc.</footer>
      <MobileNav />
    </main>
  );
}
