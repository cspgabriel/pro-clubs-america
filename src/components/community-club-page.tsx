"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, RefreshCw, ShieldCheck, Swords, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { CountryFlag } from "./country-flag";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";
import { ClubInvitations } from "./club-invitations";

interface ClubMember {
  id: string;
  name: string;
  role: string;
  country: string;
  avatarUrl?: string;
  player?: { id: string; name: string; position: string; overall: number };
}

interface EaSquadPlayer {
  id: string;
  name: string;
  position: string;
  rating?: number;
  played: number;
  goals: number;
  assists: number;
  winRate?: number;
  manOfTheMatch?: number;
  passSuccessRate?: number;
  tackleSuccessRate?: number;
  cleanSheetsGk?: number;
}

/** Retrato oficial da EA que a API do clube agora devolve no mesmo payload. */
interface EaClubData {
  clubId: string;
  sourceUrl: string;
  syncedAt: string;
  skillRating: number;
  division?: number;
  rank?: number;
  reputation?: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsPerGame?: number;
  cleanSheets: number;
  squad: EaSquadPlayer[];
}

interface CommunityClub {
  id: string;
  name: string;
  platform: string;
  verified: boolean;
  members: ClubMember[];
  ea?: EaClubData;
}

const roleLabel = (role: string) => role === "owner" ? "Dono" : role === "captain" ? "Capitão" : "Jogador";

const integer = (value: number) => new Intl.NumberFormat("pt-BR").format(Math.round(value));

/** "há 4 min" diz mais sobre a confiabilidade do dado que um timestamp cru. */
function syncedLabel(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return `há ${Math.round(hours / 24)} d`;
}

export function CommunityClubPage() {
  const id = useSearchParams().get("id") || "";
  const [club, setClub] = useState<CommunityClub | null>(null);
  const [error, setError] = useState(id ? "" : "Clube não informado.");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/community/clubs/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<CommunityClub>;
      })
      .then(setClub)
      .catch(() => setError("Clube não encontrado."));
  }, [id]);

  const ea = club?.ea;

  return <main className="app-shell">
    <PlatformHeader />
    {club ? <>
      <section className="community-club-hero">
        <Link href="/clubes" className="community-back"><ArrowLeft /> Comunidade</Link>
        <div className="community-club-badge">{club.name.slice(0, 2).toUpperCase()}</div>
        <div><small>CLUBE DA COMUNIDADE</small><h1>{club.name}</h1><p>{club.verified ? <><ShieldCheck /> Clube vinculado e verificado</> : <><Users /> Clube cadastrado na plataforma</>}</p></div>
        <Link href="/partidas/amistosos#buscar-amistoso" className="community-club-challenge"><Swords /> Desafiar este clube</Link>
      </section>

      {ea && <section className="community-club-ea">
        <header>
          <div>
            <small>EA SPORTS FC · DADOS OFICIAIS</small>
            <h2>Temporada do clube na EA</h2>
          </div>
          <span><RefreshCw /> Sincronizado {syncedLabel(ea.syncedAt)}</span>
        </header>
        <div className="community-club-ea-stats">
          <article><small>Skill Rating</small><strong>{integer(ea.skillRating)}</strong></article>
          <article><small>Partidas</small><strong>{integer(ea.played)}</strong></article>
          <article><small>V · E · D</small><strong>{integer(ea.wins)} · {integer(ea.draws)} · {integer(ea.losses)}</strong></article>
          <article><small>Aproveitamento</small><strong>{ea.winRate.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</strong></article>
          <article><small>Gols pró · contra</small><strong>{integer(ea.goalsFor)} · {integer(ea.goalsAgainst)}</strong></article>
          <article><small>Jogos sem sofrer gol</small><strong>{integer(ea.cleanSheets)}</strong></article>
          {ea.division != null && <article><small>Divisão atual</small><strong>{integer(ea.division)}</strong></article>}
          {ea.rank != null && ea.rank > 0 && <article><small>Ranking histórico</small><strong>#{integer(ea.rank)}</strong></article>}
        </div>
        {ea.squad.length ? <div className="community-club-ea-squad">
          <table>
            <thead><tr><th>Jogador</th><th>Pos.</th><th>J</th><th>G</th><th>A</th><th>Nota</th><th>MOTM</th></tr></thead>
            <tbody>
              {ea.squad.map((player) => <tr key={player.id}>
                <td>{player.name}</td>
                <td>{player.position}</td>
                <td>{integer(player.played)}</td>
                <td>{integer(player.goals)}</td>
                <td>{integer(player.assists)}</td>
                <td>{player.rating != null ? player.rating.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "—"}</td>
                <td>{player.manOfTheMatch != null ? integer(player.manOfTheMatch) : "—"}</td>
              </tr>)}
            </tbody>
          </table>
        </div> : <p className="community-club-ea-pending">A EA ainda não publicou estatísticas de elenco para este clube.</p>}
        <footer>
          <a href={ea.sourceUrl} target="_blank" rel="noreferrer noopener">Ver na fonte pública da EA <ArrowRight /></a>
          <Link href={`/club?id=${encodeURIComponent(club.id)}`}>Histórico completo e rankings do elenco <ArrowRight /></Link>
        </footer>
      </section>}

      <section className="community-club-roster">
        <ClubInvitations mode="club" clubId={club.id} onMembershipChanged={() => window.location.reload()} />
        {!ea && <Link className="community-back" href={`/club?id=${encodeURIComponent(club.id)}`}>Estatísticas, elenco EA e histórico atualizado <ArrowRight /></Link>}
        <header><div><small>ELENCO NA PLATAFORMA</small><h2>{club.members.length} {club.members.length === 1 ? "membro" : "membros"} cadastrados</h2></div><span>{club.platform === "common-gen4" ? "PS4 / Xbox One" : "PS5 / Xbox Series / PC"}</span></header>
        {club.members.length ? <div>{club.members.map((member) => <Link href={`/perfil?id=${encodeURIComponent(member.id)}`} key={member.id}>
          {member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : <b>{member.name.slice(0, 1).toUpperCase()}</b>}
          <span><strong>{member.name} <CountryFlag country={member.country} /></strong><small>{roleLabel(member.role)}{member.player ? ` · ${member.player.position} · ${member.player.overall >= 20 ? `OVR ${member.player.overall}` : `Nota ${member.player.overall}`}` : " · Perfil da comunidade"}</small></span><ArrowRight />
        </Link>)}</div> : <div className="community-club-empty"><Users /><strong>O elenco ainda está sendo montado</strong><span>Este clube já está na plataforma. Os jogadores aparecerão aqui conforme entrarem no time.</span></div>}
      </section>
    </> : <section className="member-home-loading"><Users /><span>{error || "Carregando clube…"}</span>{error && <Link href="/clubes">Voltar para a comunidade</Link>}</section>}
    <MobileNav />
  </main>;
}
