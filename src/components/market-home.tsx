"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, BriefcaseBusiness, CalendarDays, Clock3, MapPin, Radio, Search, Shield, Swords, UserRound, Users } from "lucide-react";
import type { PlayerRanking } from "@/types/domain";
import { observeAuth, type AuthUserSnapshot } from "@/lib/auth-client";
import { getCommunityProfile, watchFriendlies, type CommunityProfile } from "@/lib/community-service";
import type { FriendlyRequest } from "@/lib/friendlies";
import { PlatformHeader } from "./platform-header";
import { MobileNav } from "./mobile-nav";
import { BrandLogo } from "./brand-logo";

interface HomeClub { id: string; name: string; crestUrl: string; skillRating?: number; record?: string; }
type HomePlayer = PlayerRanking & { clubName?: string };

export function MarketHome({ players, availableClubs }: { players: HomePlayer[]; availableClubs: HomeClub[] }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserSnapshot | null>(null);
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [openChallenges, setOpenChallenges] = useState<FriendlyRequest[]>([]);
  const [query, setQuery] = useState("");
  const [featured, setFeatured] = useState(0);
  const term = query.trim().toLocaleLowerCase("pt-BR");
  const clubs = useMemo(() => availableClubs.filter((club) => club.name.toLocaleLowerCase("pt-BR").includes(term)), [availableClubs, term]);
  const matchingPlayers = useMemo(() => players.filter((player) => player.name.toLocaleLowerCase("pt-BR").includes(term)), [players, term]);
  const visiblePlayers = (term ? matchingPlayers : players.filter((player) => !("statsReliable" in player) || player.statsReliable).slice().sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))).slice(0, 9);
  const slides = [
    { kicker: "MARCAR AMISTOSO", title: "Encontre um adversário", text: "Publique um horário ou desafie diretamente outro clube da comunidade.", href: "/partidas/amistosos#buscar-amistoso", action: "Buscar amistoso" },
    { kicker: "RANKING DE JOGADORES", title: "Veja os artilheiros", text: "Compare gols, assistências, desarmes e aproveitamento por atleta.", href: "/rankings/jogadores/artilharia", action: "Ver artilharia" },
    { kicker: "RANKING DE CLUBES", title: "Os melhores times", text: "Classificação de clubes e times cadastrados com dados públicos da EA.", href: "/rankings/clubes/artilharia", action: "Ver clubes" },
    { kicker: "MERCADO", title: "Reforce seu elenco", text: "Divulgue vagas abertas ou mostre que você está procurando um clube.", href: "/mercado", action: "Abrir mercado" },
  ];

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setFeatured((current) => (current + 1) % slides.length), 5000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  useEffect(() => observeAuth((value) => {
    setUser(value); setAuthReady(true);
    if (!value) { setProfile(null); router.replace("/entrar?next=/inicio"); }
    else getCommunityProfile().then(setProfile).catch(() => setProfile(null));
  }), [router]);

  useEffect(() => {
    if (!user) return;
    return watchFriendlies(
      (items) => setOpenChallenges(items.filter((item) => item.mode === "open" && item.status === "searching").slice(0, 6)),
      () => setOpenChallenges([]),
    );
  }, [user]);

  if (!authReady || !user) return <main className="member-home-loading"><BrandLogo size={82} /><span>Preparando sua comunidade…</span></main>;

  return (
    <main className="app-shell">
      <PlatformHeader />
      <section className="featured-slider" aria-label="Destaques">
        <Image className="featured-stadium" src="/brand/home-stadium.png" alt="" fill sizes="100vw" priority />
        <div className="featured-track" key={featured}>
          <div><small>{slides[featured].kicker}</small><h2>{slides[featured].title}</h2><p>{slides[featured].text}</p></div>
          <Link href={slides[featured].href}>{slides[featured].action}<ArrowRight /></Link>
        </div>
        <div className="featured-dots" aria-label="Selecionar destaque">{slides.map((slide, index) => <button type="button" aria-label={`Mostrar ${slide.title}`} aria-current={index === featured} className={index === featured ? "active" : ""} onClick={() => setFeatured(index)} key={slide.title} />)}</div>
      </section>
      <section className="market-hero" id="buscar">
        <div className="member-greeting"><BrandLogo size={94} /><div><small>PRO CLUBS AMERICA</small><h1>Olá, {user.name.split(" ")[0]}.</h1><p>{profile?.clubName ? <>Seu clube <strong>{profile.clubName}</strong> está pronto para competir.</> : "Encontre um clube, publique uma oportunidade ou comece seu próprio time."}</p></div></div>
        <label className="global-search">
          <Search size={20} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar clube ou jogador" />
          <span>FC 26</span>
        </label>
        <div className="quick-links">
          <Link href="/clubes"><Shield /><span><strong>Clubes</strong><small>Encontrar times</small></span></Link>
          <Link href="/jogadores"><Users /><span><strong>Jogadores</strong><small>Explorar atletas</small></span></Link>
          <Link href="/partidas/amistosos#buscar-amistoso"><Swords /><span><strong>Amistosos</strong><small>Buscar confronto</small></span></Link>
          <Link href="/rankings/jogadores/artilharia"><BarChart3 /><span><strong>Rankings</strong><small>Ver os líderes</small></span></Link>
        </div>
        <div className="member-status"><Link href={profile?.clubId ? `/club/${profile.clubId}` : "/cadastro"}><Shield /><span><small>MEU CLUBE</small><strong>{profile?.clubName ?? "Vincular time da EA"}</strong></span><ArrowRight /></Link><Link href="/conta"><UserRound /><span><small>MEU PERFIL</small><strong>{profile ? `${profile.elo} ELO · ${profile.reliability}% confiança` : "Completar perfil"}</strong></span><ArrowRight /></Link><Link href="/mercado"><BriefcaseBusiness /><span><small>MERCADO</small><strong>Publicar vaga ou perfil</strong></span><ArrowRight /></Link></div>
      </section>

      <section className="market-section open-challenges-home" id="desafios-abertos">
        <div className="market-title"><div><small><Radio /> MURAL EM TEMPO REAL</small><h2>Desafios em aberto</h2></div><Link href="/partidas/amistosos#desafios-abertos">Ver todos <ArrowRight /></Link></div>
        {openChallenges.length ? <div className="open-challenge-grid">{openChallenges.map((challenge) => {
          const host = availableClubs.find((club) => club.id === challenge.hostClubId);
          return <Link href="/partidas/amistosos#desafios-abertos" className="open-challenge-card" key={challenge.id}>
            <header><span><Radio /> Aceitando rival</span><b>{challenge.hostElo ? `${challenge.hostElo} ELO` : "Aberto"}</b></header>
            <div>{host?.crestUrl ? <Image src={host.crestUrl} alt={`Escudo ${challenge.hostClubName}`} width={56} height={56} unoptimized /> : <i>{challenge.hostClubName.slice(0, 2).toUpperCase()}</i>}<span><strong>{challenge.hostClubName}</strong><small>Publicado por {challenge.creatorName}</small></span><em>×</em><span className="open-rival"><b>?</b><small>Seu clube</small></span></div>
            <footer><span><CalendarDays /> {new Date(`${challenge.date}T12:00:00`).toLocaleDateString("pt-BR")}</span><span><Clock3 /> {challenge.time}</span><span><MapPin /> {challenge.region}</span><ArrowRight /></footer>
          </Link>;
        })}</div> : <div className="open-challenge-empty"><Swords /><span><strong>Nenhum desafio aberto agora</strong><small>Seja o primeiro clube a publicar um horário para a comunidade.</small></span><Link href="/partidas/amistosos#buscar-amistoso">Criar desafio <ArrowRight /></Link></div>}
      </section>

      <section className="market-section" id="clubes">
        <div className="market-title"><div><small>{availableClubs.length} CLUBES INDEXADOS</small><h2>Clubes encontrados</h2></div><span>common-gen5</span></div>
        {clubs.length ? <div className="club-strip">{clubs.slice(0, 6).map((club) => (
          <Link className="club-market-card" href={`/club/${club.id}`} key={club.id}>
            <Image src={club.crestUrl} alt={`Escudo ${club.name}`} width={72} height={72} unoptimized />
            <div><strong>{club.name}</strong><small>ID {club.id}</small>{club.skillRating ? <b>SR {club.skillRating}</b> : <em>Visto no histórico</em>}</div>
          </Link>
        ))}</div> : <div className="market-empty">{/^\d+$/.test(term) ? <><strong>Clube ID {term}</strong><Link href={`/club/${term}`}>Preparar página deste clube</Link></> : "Nenhum clube encontrado."}</div>}
      </section>

      <section className="market-section" id="jogadores">
        <div className="market-title"><div><small>BASE DE JOGADORES</small><h2>Mercado de desempenho</h2></div><span>{players.length} jogadores</span></div>
        {term && matchingPlayers.length === 0 ? <div className="market-empty">Nenhum jogador encontrado.</div> : (
          <div className="home-player-grid">{visiblePlayers.slice(0, 6).map((player) => <Link href={`/jogador/${encodeURIComponent(player.id)}`} key={player.id}><span><small>{player.overallRating != null ? "OVR" : "NOTA"}</small><b>{player.overallRating ?? player.averageRating ?? "—"}</b></span><div><strong>{player.name}</strong><small>{player.clubName ?? "Clube indexado"}</small><p>{player.position} · {player.matches.toLocaleString("pt-BR")} jogos</p></div><dl><span><b>{player.goals ?? "—"}</b> gols</span><span><b>{player.assists ?? "—"}</b> assist.</span></dl></Link>)}</div>
        )}
      </section>
      <footer className="platform-footer">Plataforma comunitária independente para EA SPORTS FC Clubs. Sem afiliação ou patrocínio da Electronic Arts Inc.</footer>
      <MobileNav />
    </main>
  );
}
