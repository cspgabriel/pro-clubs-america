"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Goal, LockKeyhole, MapPin, Radio, Search, ShieldCheck, Swords, Trophy, UserCheck, Users } from "lucide-react";
import type { CommunityMatchClub } from "@/lib/friendlies-data";
import { type ChallengeMode, type FriendlyRequest } from "@/lib/friendlies";
import { observeAuth, type AuthUserSnapshot } from "@/lib/auth-client";
import { acceptFriendly, createFriendly, getCommunityProfile, markFriendlyPlayed, watchFriendlies, type CommunityProfile } from "@/lib/community-service";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";

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

function clubInitials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function formatValue(value: number | null, suffix = "") { return value == null ? "—" : `${value.toLocaleString("pt-BR")}${suffix}`; }

export function FriendliesBoard({ matches, communityClubs, initialChallengeTarget = null, view = "all" }: { matches: PublicMatch[]; communityClubs: CommunityMatchClub[]; initialChallengeTarget?: { id: string; name: string } | null; view?: "all" | "history" | "friendlies" }) {
  const registeredClubs = communityClubs;
  const [requests, setRequests] = useState<FriendlyRequest[]>([]);
  const [authUser, setAuthUser] = useState<AuthUserSnapshot | null>(null);
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [activeClubId, setActiveClubId] = useState("");
  const [challengeMode, setChallengeMode] = useState<ChallengeMode>(initialChallengeTarget ? "invite" : "open");
  const [opponentClubId, setOpponentClubId] = useState(initialChallengeTarget?.id ?? "");
  const [opponentQuery, setOpponentQuery] = useState(initialChallengeTarget?.name ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [region, setRegion] = useState("Brasil");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [matchMode, setMatchMode] = useState<"all" | PublicMatch["mode"]>("all");
  const visibleMatches = useMemo(() => matches.filter((match) => matchMode === "all" || match.mode === matchMode), [matches, matchMode]);
  const activeClub = registeredClubs.find((club) => club.id === activeClubId);
  const opponentOptions = useMemo(() => registeredClubs.filter((club) => club.id !== activeClubId && club.platform === activeClub?.platform && (!opponentQuery.trim() || club.name.toLocaleLowerCase("pt-BR").includes(opponentQuery.trim().toLocaleLowerCase("pt-BR")))).slice(0, 12), [registeredClubs, activeClubId, activeClub?.platform, opponentQuery]);
  const canManage = Boolean(authUser && profile?.clubId && activeClub && ["owner", "captain"].includes(profile.role));

  useEffect(() => {
    const stopAuth = observeAuth(async (user) => {
      setAuthUser(user);
      const nextProfile = user ? await getCommunityProfile().catch(() => null) : null;
      setProfile(nextProfile);
      setActiveClubId(nextProfile?.clubId ?? "");
    });
    const stopMatches = watchFriendlies(setRequests, () => setNotice("Não foi possível carregar o mural em tempo real."));
    return () => { stopAuth(); stopMatches(); };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const host = registeredClubs.find((club) => club.id === activeClubId);
    const invited = registeredClubs.find((club) => club.id === opponentClubId) ?? (initialChallengeTarget?.id === opponentClubId ? { ...initialChallengeTarget, platform: "common-gen5", crestUrl: "/icon.svg", skillRating: null, winRate: null, matches: null, goals: null, roster: [] } : undefined);
    if (!authUser) { setNotice("Entre na sua conta para publicar um amistoso."); return; }
    if (!canManage || !host) { setNotice("Cadastre seu clube como dono ou capitão antes de publicar."); return; }
    if (!date || !time) { setNotice("Defina a data e o horário do jogo."); return; }
    if (challengeMode === "invite" && (!invited || invited.id === host.id)) { setNotice("Escolha outro time da comunidade para receber o convite."); return; }
    setBusyId("create"); setNotice("");
    try {
      await createFriendly({ hostClubId: host.id, hostClubName: host.name, mode: challengeMode, date, time, region, invitedClubId: challengeMode === "invite" ? invited?.id : undefined, invitedClubName: challengeMode === "invite" ? invited?.name : undefined });
      setNotice(challengeMode === "invite" ? `Convite enviado para ${invited?.name}.` : "Desafio aberto publicado para a comunidade.");
    } catch (error) { setNotice(error instanceof Error && error.message === "AUTH_REQUIRED" ? "Entre na sua conta para publicar." : "Sua conta não tem permissão para publicar por este clube."); }
    finally { setBusyId(""); }
  }

  async function accept(request: FriendlyRequest) {
    if (!canManage || !activeClub) { setNotice("Para aceitar, entre com uma conta de dono ou capitão vinculada a um time."); return; }
    if (activeClub.id === request.hostClubId) { setNotice("O mesmo time que publicou não pode aceitar o próprio desafio."); return; }
    if (request.mode === "invite" && request.invitedClubId !== activeClub.id) { setNotice(`Este convite é exclusivo para ${request.invitedClubName}.`); return; }
    setBusyId(request.id); setNotice("");
    try { await acceptFriendly(request); setNotice(`Jogo confirmado: ${request.hostClubName} × ${activeClub.name}, dia ${new Date(`${request.date}T12:00:00`).toLocaleDateString("pt-BR")} às ${request.time}.`); }
    catch { setNotice("O desafio não pôde ser aceito. Ele pode já ter sido reservado ou aceito por outro clube."); }
    finally { setBusyId(""); }
  }

  async function markPlayed(request: FriendlyRequest) {
    if (!canManage || (activeClubId !== request.hostClubId && activeClubId !== request.opponentClubId)) { setNotice("Somente dono ou capitão de um dos times pode avançar esta partida."); return; }
    setBusyId(request.id); setNotice("");
    try { await markFriendlyPlayed(request); setNotice("Partida marcada como realizada. Agora o placar aguarda publicação no histórico Friendly da EA."); }
    catch { setNotice("Não foi possível atualizar a partida. Verifique sua conta e tente novamente."); }
    finally { setBusyId(""); }
  }

  function challengeAction(request: FriendlyRequest) {
    if (request.status === "scheduled") return <button type="button" disabled={busyId === request.id} onClick={() => markPlayed(request)}>{busyId === request.id ? "Atualizando…" : "Partida realizada"}</button>;
    if (request.status !== "searching") return null;
    if (activeClubId === request.hostClubId) return <button type="button" disabled>Aguardando rival</button>;
    if (request.mode === "invite" && activeClubId !== request.invitedClubId) return <button type="button" disabled>Convite reservado</button>;
    return <button type="button" disabled={busyId === request.id} onClick={() => accept(request)}>{busyId === request.id ? "Aceitando…" : `Aceitar como ${activeClub?.name ?? "meu time"}`}</button>;
  }

  return <main className="app-shell">
    <PlatformHeader />
    <section className="friendlies-hero"><div><small>CENTRAL DE JOGOS</small><h1>{view === "history" ? "Histórico de partidas" : view === "friendlies" ? "Marcar amistoso" : "Partidas e amistosos"}</h1><p>{view === "history" ? "Resultados publicados pela EA, separados por Liga, Friendly e Playoff." : "Convide um clube específico ou publique um desafio aberto. O placar só entra depois da confirmação no histórico Friendly da EA."}</p></div><Swords /></section>
    {view !== "friendlies" && <section className="matches-wall">
      <div className="market-title"><div><small>HISTÓRICO PÚBLICO</small><h2>Últimas partidas</h2></div><span>{visibleMatches.length} jogos</span></div>
      <div className="match-filters" role="group" aria-label="Filtrar partidas">{[{ id: "all", label: "Todos" }, { id: "leagueMatch", label: "Liga" }, { id: "friendlyMatch", label: "Friendly" }, { id: "playoffMatch", label: "Playoff" }].map((item) => <button type="button" className={matchMode === item.id ? "active" : ""} onClick={() => setMatchMode(item.id as typeof matchMode)} key={item.id}>{item.label}</button>)}</div>
      {visibleMatches.length ? <div className="match-wall-grid">{visibleMatches.map((match) => <Link className="public-match-card" href={`/partida/${encodeURIComponent(match.id)}`} key={match.id}><header><span>{match.mode === "leagueMatch" ? "LIGA" : match.mode === "friendlyMatch" ? "FRIENDLY" : "PLAYOFF"}</span><small>{new Date(match.playedAt).toLocaleDateString("pt-BR")}</small></header><div><strong>{match.homeClubName}</strong><b>{match.homeScore}<i>×</i>{match.awayScore}</b><strong>{match.awayClubName}</strong></div><footer><Trophy /> {match.competition}</footer></Link>)}</div> : <div className="match-wall-empty"><Goal /><strong>Nenhum jogo publicado neste modo</strong><span>O mural só mostra resultados confirmados na fonte pública.</span></div>}
    </section>}

    {view !== "history" && <section className="friendlies-layout" id="buscar-amistoso">
      <form className="challenge-form" onSubmit={submit}>
        <h2>Criar amistoso</h2>
        <section className="match-identity"><header><UserCheck /><span>CONTA E TIME ATIVOS<strong>{canManage ? `${profile?.displayName} · ${activeClub?.name}` : authUser ? "Cadastre ou vincule seu clube" : "Entre para criar ou aceitar"}</strong></span></header>{authUser ? <><label>Conta autenticada<input readOnly value={profile?.displayName || authUser.name} /></label><label>Time vinculado<input readOnly value={activeClub?.name || profile?.clubName || "Nenhum clube vinculado"} /></label></> : <Link href="/entrar"><LockKeyhole /> Entrar na minha conta</Link>}</section>
        <div className="challenge-type" role="group" aria-label="Tipo de desafio"><button type="button" className={challengeMode === "invite" ? "active" : ""} onClick={() => setChallengeMode("invite")}><Users /> Convidar time</button><button type="button" className={challengeMode === "open" ? "active" : ""} onClick={() => setChallengeMode("open")}><Radio /> Desafio aberto</button></div>
        {challengeMode === "invite" && <label>Time convidado<div className="club-autocomplete"><input required value={opponentQuery} onChange={(event) => { setOpponentQuery(event.target.value); setOpponentClubId(""); }} placeholder="Digite o nome do clube" role="combobox" aria-controls="opponent-club-options" aria-expanded={!opponentClubId && Boolean(opponentQuery)} />{!opponentClubId && opponentQuery && <div className="club-autocomplete-list" id="opponent-club-options">{opponentOptions.map((club) => <button type="button" onClick={() => { setOpponentClubId(club.id); setOpponentQuery(club.name); }} key={club.id}><Image src={club.crestUrl} alt="" width={28} height={28} unoptimized /><span><strong>{club.name}</strong><small>SR {club.skillRating ?? "—"} · {club.platform ?? "common-gen5"}</small></span></button>)}{!opponentOptions.length && <p>Nenhum time encontrado.</p>}</div>}</div></label>}
        {challengeMode === "open" && <div className="open-challenge-note"><Radio /><span>QUALQUER TIME PODE ACEITAR<strong>Exceto o clube que publicou</strong></span></div>}
        <div className="form-pair"><label>Data<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Horário<input required type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label></div>
        <label>Região ou servidor<input value={region} onChange={(event) => setRegion(event.target.value)} /></label>
        <button type="submit" disabled={busyId === "create" || !canManage}><Search /> {busyId === "create" ? "Publicando…" : challengeMode === "invite" ? "Enviar convite" : "Publicar desafio aberto"}</button>
        {notice && <p className="challenge-notice" role="status">{notice}</p>}
        <aside><ShieldCheck /> Aceite exige conta e time. Resultado validado exclusivamente pelo histórico Friendly Match.</aside>
      </form>

      <section className="challenge-list">
        <div className="market-title"><div><small>GERADOS PELA PLATAFORMA</small><h2>Jogos marcados e desafios</h2></div><span>{requests.length} anúncios</span></div>
        {requests.length ? requests.map((request) => {
          const host = registeredClubs.find((club) => club.id === request.hostClubId);
          const opponentId = request.opponentClubId ?? request.invitedClubId;
          const opponent = registeredClubs.find((club) => club.id === opponentId);
          const opponentName = request.opponentClubName ?? request.invitedClubName ?? "Desafio aberto";
          return <article className={`challenge-card challenge-${request.status}`} key={request.id}>
            <header className="challenge-schedule"><span><CalendarDays /> {new Date(`${request.date}T12:00:00`).toLocaleDateString("pt-BR")}</span><strong><Clock3 /> {request.time}</strong><small><MapPin /> {request.region}</small><Link href={`/partida/${request.id}`}>Abrir partida</Link></header>
            <div className="challenge-matchup"><div>{host?.crestUrl ? <Image src={host.crestUrl} alt="" width={48} height={48} unoptimized /> : <span>{clubInitials(request.hostClubName)}</span>}<strong>{request.hostClubName}</strong><small>Responsável: {request.creatorName}</small></div><b>×</b><div>{opponent?.crestUrl ? <Image src={opponent.crestUrl} alt="" width={48} height={48} unoptimized /> : <span>{request.mode === "open" && !request.opponentClubId ? "?" : clubInitials(opponentName)}</span>}<strong>{opponentName}</strong><small>{request.mode === "open" && !request.opponentClubId ? "Aberto para aceitar" : request.status === "scheduled" ? `Aceito por ${request.acceptedBy}` : "Convite enviado"}</small></div></div>
            <div className={`challenge-status ${request.status}`}><span>{request.status === "searching" ? request.mode === "open" ? "Desafio aberto" : "Convite pendente" : request.status === "scheduled" ? "Jogo agendado" : request.status === "waiting_ea" ? "Aguardando EA" : "Confirmado"}</span>{challengeAction(request)}</div>
            <details className="challenge-details"><summary>Ver elencos e dados do confronto</summary><div className="challenge-team-data">{[host, opponent].map((club, index) => <section key={club?.id ?? index}><header><strong>{club?.name ?? (index ? opponentName : request.hostClubName)}</strong><span>SR {formatValue(club?.skillRating ?? null)}</span></header><dl><div><dt>Win rate</dt><dd>{formatValue(club?.winRate ?? null, "%")}</dd></div><div><dt>Jogos</dt><dd>{formatValue(club?.matches ?? null)}</dd></div><div><dt>Gols</dt><dd>{formatValue(club?.goals ?? null)}</dd></div></dl><div className="challenge-roster"><small>ELENCO PUBLICADO</small>{club?.roster.length ? club.roster.slice(0, 11).map((player) => <span key={`${club.id}-${player.name}`}><b>{player.name}</b>{player.position}</span>) : <p>Elenco ainda não coletado.</p>}</div></section>)}</div></details>
          </article>;
        }) : <div className="market-empty"><Swords /><strong>Nenhum anúncio publicado</strong><span>Publique um convite ou desafio aberto.</span></div>}
        <aside className="verification-flow"><div><UserCheck /> 1. Conta e time identificados</div><div><CheckCircle2 /> 2. Rival aceita e horário fecha</div><div><Clock3 /> 3. Partida é realizada</div><div><ShieldCheck /> 4. EA publica e confirma</div></aside>
        <p className="prototype-warning"><ShieldCheck /> Identidade, clube e permissões são validados pelo Firebase. Apenas donos e capitães vinculados podem publicar, aceitar ou avançar partidas.</p>
      </section>
    </section>}
    <MobileNav />
  </main>;
}
