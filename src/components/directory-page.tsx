"use client";

import Image from "next/image";
import Link from "next/link";
import { Search, Shield, Users } from "lucide-react";
import { useMemo, useState } from "react";
import type { PlayerRanking } from "@/types/domain";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";

interface DirectoryClub { id: string; name: string; crestUrl: string; skillRating?: number; rank?: number; platform?: string; }

export function DirectoryPage({ mode, players, availableClubs }: { mode: "search" | "clubs" | "players"; players: PlayerRanking[]; availableClubs: DirectoryClub[] }) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLocaleLowerCase("pt-BR");
  const clubs = useMemo(() => availableClubs.filter((club) => club.name.toLocaleLowerCase("pt-BR").includes(term) || club.id.includes(term)), [availableClubs, term]);
  const filteredPlayers = useMemo(() => players.filter((player) => player.name.toLocaleLowerCase("pt-BR").includes(term)), [players, term]);
  const title = mode === "clubs" ? "Clubes públicos indexados" : mode === "players" ? "Diretório de jogadores" : "Buscar na plataforma";
  const description = mode === "clubs" ? "Times encontrados no ranking público da EA e no histórico da plataforma." : mode === "players" ? "Compare o desempenho dos atletas já indexados." : "Encontre um clube pelo nome ou ID e um jogador pelo nome público.";

  return <main className="app-shell directory-page"><PlatformHeader />
    <section className="directory-hero"><div><small>{mode === "clubs" ? "TIMES INDEXADOS" : mode === "players" ? "ATLETAS INDEXADOS" : "BUSCA GLOBAL"}</small><h1>{title}</h1><p>{description}</p></div>{mode === "clubs" ? <Shield /> : mode === "players" ? <Users /> : <Search />}</section>
    <div className="directory-content">
      <label className="directory-search"><Search /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={mode === "clubs" ? "Buscar clube ou ID" : mode === "players" ? "Buscar jogador" : "Buscar clube, ID ou jogador"} /></label>
      {(mode === "clubs" || mode === "search") && <section className="directory-section"><header><div><small>CLUBES</small><h2>{clubs.length} encontrados</h2></div><Link href="/cadastro">Cadastrar meu time</Link></header><div className="directory-club-grid">{clubs.map((club) => <Link href={`/club/${club.id}`} key={club.id}><Image src={club.crestUrl} alt={`Escudo ${club.name}`} width={62} height={62} unoptimized /><div><strong>{club.name}</strong><small>{club.rank ? `RANK #${club.rank}` : `ID ${club.id}`}</small><b>{club.skillRating ? `SR ${club.skillRating}` : "Aguardando coleta completa"}</b></div></Link>)}</div>{!clubs.length && <div className="directory-empty">Nenhum clube encontrado.</div>}</section>}
      {(mode === "players" || mode === "search") && <section className="directory-section"><header><div><small>JOGADORES</small><h2>{filteredPlayers.length} encontrados</h2></div><Link href="/rankings/jogadores/artilharia">Ver rankings</Link></header><div className="directory-player-grid">{filteredPlayers.map((player) => <Link href={`/jogador/${encodeURIComponent(player.id)}`} key={player.id}><span>{player.overallRating ?? "—"}</span><div><strong>{player.name}</strong><small>{player.position} · {player.matches.toLocaleString("pt-BR")} jogos</small></div><b>{player.goals ?? 0} G</b></Link>)}</div>{!filteredPlayers.length && <div className="directory-empty">Nenhum jogador encontrado.</div>}</section>}
    </div><MobileNav /></main>;
}
