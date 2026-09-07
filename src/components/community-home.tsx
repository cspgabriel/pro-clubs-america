"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CalendarDays, Clock3, MapPin, Radio, Search, Shield, Swords, Trophy, UserRound, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { observeAuth, type AuthUserSnapshot } from "@/lib/auth-client";
import { getCommunityProfile, listCommunityMembers, watchFriendlies, type CommunityClubCard, type CommunityMemberCard, type CommunityProfile } from "@/lib/community-service";
import type { FriendlyRequest } from "@/lib/friendlies";
import { formatTournamentDate, listTournaments, type TournamentSummary } from "@/lib/tournaments-service";
import { BrandLogo } from "./brand-logo";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";
import { CommunityWelcomeSlider } from "./community-welcome-slider";

export function CommunityHome({ requireAuth = false }: { requireAuth?: boolean }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserSnapshot | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [members, setMembers] = useState<CommunityMemberCard[]>([]);
  const [clubs, setClubs] = useState<CommunityClubCard[]>([]);
  const [challenges, setChallenges] = useState<FriendlyRequest[]>([]);
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [query, setQuery] = useState("");
  const term = query.trim().toLocaleLowerCase("pt-BR");
  const matchingMembers = useMemo(() => term ? members.filter((member) => `${member.name} ${member.club?.name || ""}`.toLocaleLowerCase("pt-BR").includes(term)).slice(0, 5) : [], [members, term]);
  const matchingClubs = useMemo(() => term ? clubs.filter((club) => club.name.toLocaleLowerCase("pt-BR").includes(term)).slice(0, 5) : [], [clubs, term]);

  useEffect(() => observeAuth((current) => {
    setUser(current);
    setAuthResolved(true);
    if (!current) {
      setProfile(null);
      if (requireAuth) router.replace("/entrar?next=/inicio");
      return;
    }
    getCommunityProfile().then((value) => {
      setProfile(value);
      if (requireAuth && value && !value.onboardingCompleted) router.replace("/onboarding");
    }).catch(() => setProfile(null));
  }), [requireAuth, router]);
  useEffect(() => { listCommunityMembers().then((directory) => { setMembers(directory.members); setClubs(directory.clubs); }).catch(() => { setMembers([]); setClubs([]); }); }, []);
  // Campeonatos com inscricao aberta. Falha em silencio: enquanto as
  // migrations nao rodarem em producao, a home nao pode quebrar por isso.
  useEffect(() => { listTournaments("open").then((data) => setTournaments(data.tournaments.slice(0, 3))).catch(() => setTournaments([])); }, []);
  useEffect(() => { if (!user) return; return watchFriendlies((items) => setChallenges(items.filter((item) => item.mode === "open" && item.status === "searching").slice(0, 6)), () => setChallenges([])); }, [user]);

  if (requireAuth && (!authResolved || !user)) return <main className="member-home-loading"><BrandLogo size={82} /><span>Preparando sua comunidade…</span></main>;
  return <main className="app-shell"><PlatformHeader /><CommunityWelcomeSlider profile={profile} /><section className="community-home-lead"><div className="community-home-copy"><small>COMUNIDADE EM CAMPO</small><h1>Clubes e atletas<br />prontos para <em>jogar.</em></h1><p>Aqui só aparecem times e perfis cadastrados no Pro Clubs America. Entre no elenco, encontre reforços ou marque um amistoso sem depender do catálogo da EA.</p></div><div className="home-action-duo"><Link href={profile?.clubId ? "/conta/time" : "/cadastro"}><Shield /><span><small>MEU TIME</small><strong>{profile?.clubName || "Cadastrar meu time"}</strong><em>{profile?.clubId ? "Gerenciar elenco" : "Vincular clube da EA"} <ArrowRight /></em></span></Link><Link href="/campeonatos"><Trophy /><span><small>CAMPEONATOS</small><strong>Disputar um título</strong><em>{tournaments.length ? `${tournaments.length} com inscrição aberta` : "Ver edições"} <ArrowRight /></em></span></Link><Link href="/mercado"><BriefcaseBusiness /><span><small>MERCADO</small><strong>Montar o elenco</strong><em>Vagas e jogadores livres <ArrowRight /></em></span></Link><Link href="/partidas/amistosos#desafios-abertos"><Swords /><span><small>AMISTOSOS</small><strong>Encontrar rival</strong><em>Ver desafios abertos <ArrowRight /></em></span></Link></div><label className="community-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar perfil ou clube cadastrado" />{term && <div>{matchingClubs.map((club) => <Link href={`/time?id=${encodeURIComponent(club.id)}`} key={club.id}><Shield /><span><strong>{club.name}</strong><small>{club.memberCount} membro{club.memberCount === 1 ? "" : "s"} cadastrado{club.memberCount === 1 ? "" : "s"}</small></span><ArrowRight /></Link>)}{matchingMembers.map((member) => <Link href={`/perfil?id=${encodeURIComponent(member.id)}`} key={member.id}><UserRound /><span><strong>{member.name}</strong><small>{member.club?.name || "Perfil da comunidade"}</small></span><ArrowRight /></Link>)}{!matchingClubs.length && !matchingMembers.length && <span>Nenhum cadastro encontrado.</span>}</div>}</label><div className="home-community-rows"><section id="clubes-cadastrados"><header><div><small>CLUBES CADASTRADOS</small><h2>Times para entrar</h2></div><Link href="/clubes">Ver comunidade <ArrowRight /></Link></header><div className="home-community-clubs">{clubs.slice(0, 6).map((club) => <Link href={`/time?id=${encodeURIComponent(club.id)}`} key={club.id}><b>{club.name.slice(0, 2).toUpperCase()}</b><span><strong>{club.name}</strong><small>{club.memberCount} membro{club.memberCount === 1 ? "" : "s"} na plataforma</small></span><ArrowRight /></Link>)}{!clubs.length && <span className="home-members-empty">Cadastre seu time para ele aparecer aqui.</span>}</div></section><section id="jogadores-cadastrados"><header><div><small>JOGADORES CADASTRADOS</small><h2>Perfis para conhecer</h2></div><Link href="/clubes#jogadores-cadastrados">Ver comunidade <ArrowRight /></Link></header><div className="home-community-members">{members.slice(0, 6).map((member) => <Link href={`/perfil?id=${encodeURIComponent(member.id)}`} key={member.id}>{member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : <b>{member.name.slice(0, 1).toUpperCase()}</b>}<span><strong>{member.name}</strong><small>{member.player ? `${member.player.position} · ${member.player.overall >= 20 ? `OVR ${member.player.overall}` : `Nota ${member.player.overall}`}` : member.club?.name || "Perfil da comunidade"}</small></span><ArrowRight /></Link>)}{!members.length && <span className="home-members-empty">Os próximos perfis aparecerão aqui.</span>}</div></section></div></section>{tournaments.length > 0 && <section className="market-section open-challenges-home" id="campeonatos-abertos"><div className="market-title"><div><small><Trophy /> COMPETIÇÕES OFICIAIS</small><h2>Campeonatos com inscrição aberta</h2></div><Link href="/campeonatos">Ver todos <ArrowRight /></Link></div><div className="open-challenge-grid">{tournaments.map((tournament) => <Link href={`/campeonato/?id=${encodeURIComponent(tournament.slug)}`} className="open-challenge-card" key={tournament.id}><header><span><Trophy /> Inscrições abertas</span><b>{tournament.registeredCount}/{tournament.maxTeams} clubes</b></header><div><i>{tournament.name.slice(0, 2).toUpperCase()}</i><span><strong>{tournament.name}</strong><small>{tournament.summary || "Campeonato da comunidade"}</small></span></div><footer><span><CalendarDays /> {formatTournamentDate(tournament.startsAt)}</span><span><Users /> {tournament.maxTeams - tournament.registeredCount} vagas</span><ArrowRight /></footer></Link>)}</div></section>}<section className="market-section open-challenges-home" id="desafios-abertos"><div className="market-title"><div><small><Radio /> MURAL DA PLATAFORMA</small><h2>Desafios em aberto</h2></div><Link href="/partidas/amistosos#desafios-abertos">Ver todos <ArrowRight /></Link></div>{challenges.length ? <div className="open-challenge-grid">{challenges.map((challenge) => <Link href="/partidas/amistosos#desafios-abertos" className="open-challenge-card" key={challenge.id}><header><span><Radio /> Aceitando rival</span><b>Desafio aberto</b></header><div><i>{challenge.hostClubName.slice(0, 2).toUpperCase()}</i><span><strong>{challenge.hostClubName}</strong><small>Publicado por {challenge.creatorName}</small></span><em>×</em><span className="open-rival"><b>?</b><small>Seu clube</small></span></div><footer><span><CalendarDays /> {new Date(`${challenge.date}T12:00:00`).toLocaleDateString("pt-BR")}</span><span><Clock3 /> {challenge.time}</span><span><MapPin /> {challenge.region}</span><ArrowRight /></footer></Link>)}</div> : <div className="open-challenge-empty"><Swords /><span><strong>Nenhum desafio aberto agora</strong><small>Seja o primeiro clube a publicar um horário para a comunidade.</small></span><Link href="/partidas/amistosos#buscar-amistoso">Criar desafio <ArrowRight /></Link></div>}</section><section className="community-home-footer"><span><Users /> {members.length} perfis visíveis</span><span><Shield /> {clubs.length} clubes cadastrados</span>{profile?.clubName && profile.clubId && <Link href={`/time?id=${encodeURIComponent(profile.clubId)}`}>Meu clube: {profile.clubName} <ArrowRight /></Link>}</section><MobileNav /></main>;
}
