"use client";

import { FormEvent, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Goal, MapPin, Search, ShieldCheck, Swords, Trophy } from "lucide-react";
import { catalogClubs } from "@/data/catalog";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";

interface FriendlyRequest {
  id: string;
  clubId: string;
  clubName: string;
  date: string;
  time: string;
  region: string;
  status: "searching" | "scheduled" | "waiting_ea" | "verified";
  opponentClubId?: string;
  opponentClubName?: string;
}

const storageKey = "clubs-brasil-friendly-requests";

export interface PublicMatch {
  id: string;
  mode: "leagueMatch" | "playoffMatch" | "friendlyMatch";
  playedAt: string;
  homeClubName: string;
  awayClubName: string;
  homeScore: number;
  awayScore: number;
  competition: string;
  sourceUrl: string;
}

export function FriendliesBoard({ matches, initialChallengeTarget = null }: { matches: PublicMatch[]; initialChallengeTarget?: { id: string; name: string } | null }) {
  const [requests, setRequests] = useState<FriendlyRequest[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(storageKey);
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [clubId, setClubId] = useState("171630");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [region, setRegion] = useState("Brasil");
  const challengeTarget = initialChallengeTarget;
  const [mode, setMode] = useState<"all" | PublicMatch["mode"]>("all");
  const visibleMatches = useMemo(() => matches.filter((match) => mode === "all" || match.mode === mode), [matches, mode]);

  function persist(next: FriendlyRequest[]) {
    setRequests(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const club = catalogClubs.find((item) => item.id === clubId);
    if (!club || !date || !time) return;
    persist([{ id: crypto.randomUUID(), clubId, clubName: club.name, date, time, region, status: "searching", opponentClubId: challengeTarget?.id, opponentClubName: challengeTarget?.name }, ...requests]);
  }

  function advance(id: string) {
    persist(requests.map((request) => request.id === id ? { ...request, status: request.status === "searching" ? "scheduled" : "waiting_ea" } : request));
  }

  return (
    <main className="app-shell">
      <PlatformHeader />
      <section className="friendlies-hero"><div><small>CENTRAL DE JOGOS</small><h1>Partidas e amistosos</h1><p>Acompanhe os últimos resultados publicados pela EA e organize novos confrontos. O placar de amistoso nunca é digitado manualmente.</p></div><Swords /></section>
      <section className="matches-wall">
        <div className="market-title"><div><small>HISTÓRICO PÚBLICO</small><h2>Últimas partidas</h2></div><span>{visibleMatches.length} jogos</span></div>
        <div className="match-filters" role="group" aria-label="Filtrar partidas">
          {[{ id: "all", label: "Todos" }, { id: "leagueMatch", label: "Liga" }, { id: "friendlyMatch", label: "Friendly" }, { id: "playoffMatch", label: "Playoff" }].map((item) => <button type="button" className={mode === item.id ? "active" : ""} onClick={() => setMode(item.id as typeof mode)} key={item.id}>{item.label}</button>)}
        </div>
        {visibleMatches.length ? <div className="match-wall-grid">{visibleMatches.map((match) => <a className="public-match-card" href={match.sourceUrl} target="_blank" rel="noreferrer" key={match.id}>
          <header><span>{match.mode === "leagueMatch" ? "LIGA" : match.mode === "friendlyMatch" ? "FRIENDLY" : "PLAYOFF"}</span><small>{new Date(match.playedAt).toLocaleDateString("pt-BR")}</small></header>
          <div><strong>{match.homeClubName}</strong><b>{match.homeScore}<i>×</i>{match.awayScore}</b><strong>{match.awayClubName}</strong></div>
          <footer><Trophy /> {match.competition}</footer>
        </a>)}</div> : <div className="match-wall-empty"><Goal /><strong>Nenhum jogo publicado neste modo</strong><span>O mural só mostra resultados confirmados na fonte pública.</span></div>}
      </section>
      <section className="friendlies-layout" id="buscar-amistoso">
        <form className="challenge-form" onSubmit={submit}>
          <h2>{challengeTarget ? `Desafiar ${challengeTarget.name}` : "Publicar disponibilidade"}</h2>
          {challengeTarget && <div className="challenge-target"><Swords /><span>ADVERSÁRIO SELECIONADO<strong>{challengeTarget.name}</strong><small>EA ID {challengeTarget.id}</small></span></div>}
          <label>Seu clube<select value={clubId} onChange={(event) => setClubId(event.target.value)}>{catalogClubs.map((club) => <option value={club.id} key={club.id}>{club.name}</option>)}</select></label>
          <div className="form-pair"><label>Data<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Horário<input required type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label></div>
          <label>Região<input value={region} onChange={(event) => setRegion(event.target.value)} /></label>
          <button type="submit"><Search /> Buscar adversário</button>
          <aside><ShieldCheck /> Resultado validado exclusivamente pelo histórico Friendly Match.</aside>
        </form>

        <section className="challenge-list">
          <div className="market-title"><div><small>GERADOS PELA PLATAFORMA</small><h2>Mural de amistosos</h2></div><span>{requests.length} anúncios</span></div>
          {requests.length ? requests.map((request) => <article className="challenge-card" key={request.id}>
            <div className="challenge-club"><span>{request.clubName.slice(0, 2).toUpperCase()}</span><div><strong>{request.clubName}{request.opponentClubName ? ` × ${request.opponentClubName}` : ""}</strong><small>ID {request.clubId}{request.opponentClubId ? ` · desafio para ${request.opponentClubId}` : ""}</small></div></div>
            <div className="challenge-meta"><span><CalendarDays /> {new Date(`${request.date}T12:00:00`).toLocaleDateString("pt-BR")}</span><span><Clock3 /> {request.time}</span><span><MapPin /> {request.region}</span></div>
            <div className={`challenge-status ${request.status}`}><span>{request.status === "searching" ? "Buscando adversário" : request.status === "scheduled" ? "Agendado" : request.status === "waiting_ea" ? "Aguardando EA" : "Confirmado"}</span>{request.status !== "waiting_ea" && request.status !== "verified" && <button onClick={() => advance(request.id)}>{request.status === "searching" ? "Aceitar desafio" : "Partida realizada"}</button>}</div>
          </article>) : <div className="market-empty"><Swords /><strong>Nenhum anúncio publicado</strong><span>Publique a primeira disponibilidade real.</span></div>}
          <aside className="verification-flow"><div><CheckCircle2 /> 1. Clubes combinam</div><div><Clock3 /> 2. Partida é realizada</div><div><ShieldCheck /> 3. EA publica em Friendly</div><div><CheckCircle2 /> 4. Plataforma confirma</div></aside>
        </section>
      </section>
      <MobileNav />
    </main>
  );
}
