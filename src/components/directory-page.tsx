"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Goal, Grid2X2, Search, Shield, Target, Users } from "lucide-react";
import { useMemo, useState } from "react";
import type { PlayerRanking } from "@/types/domain";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";

interface DirectoryClub { id: string; name: string; crestUrl: string; skillRating?: number; rank?: number; platform?: string; }
type DirectoryPlayer = PlayerRanking & { clubName?: string };

export function DirectoryPage({ mode, players, availableClubs }: { mode: "search" | "clubs" | "players"; players: DirectoryPlayer[]; availableClubs: DirectoryClub[] }) {
  const [query, setQuery] = useState("");
  const [clubPage, setClubPage] = useState(1);
  const [playerPage, setPlayerPage] = useState(1);
  const [position, setPosition] = useState("all");
  const term = query.trim().toLocaleLowerCase("pt-BR");
  const clubs = useMemo(() => availableClubs.filter((club) => club.name.toLocaleLowerCase("pt-BR").includes(term) || club.id.includes(term)), [availableClubs, term]);
  const filteredPlayers = useMemo(() => players.filter((player) => {
    if (!player.name.toLocaleLowerCase("pt-BR").includes(term)) return false;
    if (position === "all") return true;
    return player.position.toLocaleLowerCase("pt-BR").includes(position);
  }), [players, position, term]);
  const pageSize = 24;
  const clubPageCount = Math.max(1, Math.ceil(clubs.length / pageSize));
  const playerPageCount = Math.max(1, Math.ceil(filteredPlayers.length / pageSize));
  const visibleClubs = clubs.slice((Math.min(clubPage, clubPageCount) - 1) * pageSize, Math.min(clubPage, clubPageCount) * pageSize);
  const visiblePlayers = filteredPlayers.slice((Math.min(playerPage, playerPageCount) - 1) * pageSize, Math.min(playerPage, playerPageCount) * pageSize);
  const pageButtons = (current: number, total: number, setPage: (page: number) => void) => {
    if (total <= 1) return null;
    const pages = Array.from({ length: total }, (_, index) => index + 1).filter((page) => page === 1 || page === total || Math.abs(page - current) <= 1);
    return <nav className="directory-pagination" aria-label="Paginação"><button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Página anterior"><ChevronLeft /></button>{pages.map((page, index) => <span key={page}>{index > 0 && page - pages[index - 1] > 1 && <i>…</i>}<button type="button" className={page === current ? "active" : ""} aria-current={page === current ? "page" : undefined} onClick={() => setPage(page)}>{page}</button></span>)}<button type="button" disabled={current === total} onClick={() => setPage(current + 1)} aria-label="Próxima página"><ChevronRight /></button></nav>;
  };
  const title = mode === "clubs" ? "Clubes públicos indexados" : mode === "players" ? "Diretório de jogadores" : "Buscar na plataforma";
  const description = mode === "clubs" ? "Times encontrados no ranking público da EA e no histórico da plataforma." : mode === "players" ? "Compare o desempenho dos atletas já indexados." : "Encontre um clube pelo nome ou ID e um jogador pelo nome público.";

  return <main className="app-shell directory-page"><PlatformHeader />
    <section className="directory-hero"><div><small>{mode === "clubs" ? "TIMES INDEXADOS" : mode === "players" ? "ATLETAS INDEXADOS" : "BUSCA GLOBAL"}</small><h1>{title}</h1><p>{description}</p></div>{mode === "clubs" ? <Shield /> : mode === "players" ? <Users /> : <Search />}</section>
    <nav className="search-tabs"><Link href="/buscar">Menu</Link><Link className={mode === "players" ? "active" : ""} href="/jogadores">Jogadores</Link><Link className={mode === "clubs" ? "active" : ""} href="/clubes">Clubes</Link></nav>
    <div className="directory-content">
      <label className="directory-search"><Search /><input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setClubPage(1); setPlayerPage(1); }} placeholder={mode === "clubs" ? "Buscar clube ou ID" : mode === "players" ? "Buscar jogador" : "Buscar clube, ID ou jogador"} /></label>
      {(mode === "players" || mode === "search") && <nav className="player-filter-grid" aria-label="Filtrar jogadores por posição">{[{ id: "all", label: "Todos", icon: Grid2X2 }, { id: "forward", label: "Atacantes", icon: Goal }, { id: "midfielder", label: "Meias", icon: Users }, { id: "defender", label: "Defensores", icon: Shield }, { id: "goalkeeper", label: "Goleiros", icon: Target }].map((filter) => { const Icon = filter.icon; return <button type="button" className={position === filter.id ? "active" : ""} onClick={() => { setPosition(filter.id); setPlayerPage(1); }} key={filter.id}><Icon /><span>{filter.label}</span></button>; })}</nav>}
      {(mode === "clubs" || mode === "search") && <section className="directory-section"><header><div><small>CLUBES</small><h2>{clubs.length} encontrados</h2></div><Link href="/cadastro">Cadastrar meu time</Link></header><div className="directory-list-head club"><span>Clube</span><span>Plataforma</span><span>Ranking</span><span>Skill rating</span></div><div className="directory-club-grid">{visibleClubs.map((club) => <Link href={`/club/${club.id}`} key={club.id}><Image src={club.crestUrl} alt={`Escudo ${club.name}`} width={52} height={52} unoptimized /><div><strong>{club.name}</strong><small>ID {club.id}</small></div><span>{club.platform ?? "common-gen5"}</span><span>{club.rank ? `#${club.rank}` : "—"}</span><b>{club.skillRating ? `SR ${club.skillRating}` : "Coleta pendente"}</b><ChevronRight /></Link>)}</div>{!clubs.length && <div className="directory-empty">Nenhum clube encontrado.</div>}{pageButtons(Math.min(clubPage, clubPageCount), clubPageCount, setClubPage)}</section>}
      {(mode === "players" || mode === "search") && <section className="directory-section"><header><div><small>JOGADORES</small><h2>{filteredPlayers.length} encontrados</h2></div><Link href="/rankings/jogadores/artilharia">Ver rankings</Link></header><div className="directory-list-head player"><span>Jogador</span><span>Posição</span><span>Jogos</span><span>Gols</span></div><div className="directory-player-grid">{visiblePlayers.map((player) => <Link href={`/jogador/${encodeURIComponent(player.id)}`} key={player.id}><span><small>{player.overallRating != null ? "OVR" : "NOTA"}</small>{player.overallRating ?? player.averageRating ?? "—"}</span><div><strong>{player.name}</strong><small>{player.clubName ?? "Clube não identificado"}</small></div><em>{player.position}</em><span className="directory-metric">{player.matches.toLocaleString("pt-BR")}</span><b>{player.goals ?? 0}</b><ChevronRight /></Link>)}</div>{!filteredPlayers.length && <div className="directory-empty">Nenhum jogador encontrado.</div>}{pageButtons(Math.min(playerPage, playerPageCount), playerPageCount, setPlayerPage)}</section>}
    </div><MobileNav /></main>;
}
