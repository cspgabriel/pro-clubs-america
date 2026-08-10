"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, BriefcaseBusiness, CalendarDays, Clock3, Goal, MapPin, Radio, Search, Shield, Swords, Trophy, Users } from "lucide-react";
import type { PlayerRanking } from "@/types/domain";
import { observeAuth, type AuthUserSnapshot } from "@/lib/auth-client";
import { getCommunityProfile, watchFriendlies, type CommunityProfile } from "@/lib/community-service";
import type { FriendlyRequest } from "@/lib/friendlies";
import { PlatformHeader } from "./platform-header";
import { MobileNav } from "./mobile-nav";
import { BrandLogo } from "./brand-logo";
import { ClubInviteCard } from "./club-invite-card";

interface HomeClub { id: string; name: string; crestUrl: string; skillRating?: number; rank?: number; wins?: number; draws?: number; losses?: number; goals?: number; platform?: string; }
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
  const matchingClubs = useMemo(() => term ? availableClubs.filter((club) => club.name.toLocaleLowerCase("pt-BR").includes(term) || club.id.toLocaleLowerCase("pt-BR").includes(term)).slice(0, 6) : [], [availableClubs, term]);
  const matchingPlayers = useMemo(() => term ? players.filter((player) => player.name.toLocaleLowerCase("pt-BR").includes(term) || player.clubName?.toLocaleLowerCase("pt-BR").includes(term)).slice(0, 6) : [], [players, term]);
  const reliablePlayers = useMemo(() => players.filter((player) => !("statsReliable" in player) || player.statsReliable), [players]);
  const topScorers = useMemo(() => reliablePlayers.slice().sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0)).slice(0, 5), [reliablePlayers]);
  const topAssists = useMemo(() => reliablePlayers.slice().sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0)).slice(0, 5), [reliablePlayers]);
  const topTackles = useMemo(() => reliablePlayers.filter((player) => player.tacklesMade != null).slice().sort((a, b) => (b.tacklesMade ?? 0) - (a.tacklesMade ?? 0)).slice(0, 5), [reliablePlayers]);
  const topClubs = useMemo(() => availableClubs.filter((club) => club.platform === "common-gen5" && (club.rank ?? 0) > 0).slice().sort((a, b) => (a.rank ?? 999999) - (b.rank ?? 999999)).slice(0, 5), [availableClubs]);
  const slides = [
    { kicker: "MARCAR AMISTOSO", title: "Encontre um adversário", text: "Publique um horário ou desafie diretamente outro clube da comunidade.", href: "/partidas/amistosos#buscar-amistoso", action: "Buscar amistoso" },
    { kicker: "RANKING DE JOGADORES", title: "Veja os artilheiros", text: "Compare gols, assistências, desarmes e aproveitamento por atleta.", href: "/rankings/jogadores/artilharia", action: "Ver artilharia" },
    { kicker: "RANKING DE CLUBES", title: "Os melhores times", text: "Classificação de clubes e times cadastrados com dados públicos da EA.", href: "/rankings/clubes/artilharia", action: "Ver clubes" },
    { kicker: "MERCADO", title: "Reforce seu elenco", text: "Divulgue vagas abertas ou mostre que você está procurando um clube.", href: "/mercado", action: "Abrir mercado" },
  ];

  function openFirstResult() {
    const club = matchingClubs[0]; const player = matchingPlayers[0];
    if (club) router.push(`/club/${club.id}`);
    else if (player) router.push(`/jogador/${encodeURIComponent(player.id)}`);
    else if (term) router.push(`/clubes?termo=${encodeURIComponent(query.trim())}`);
  }

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
        <label className="global-search home-search">
          <Search size={20} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); openFirstResult(); } }} placeholder="Buscar clube, jogador ou ID" />
          <span>FC 26</span>
          {term && <div className="home-search-results">{matchingClubs.map((club) => <Link href={`/club/${club.id}`} key={`club-${club.id}`}><Image src={club.crestUrl} alt="" width={34} height={34} unoptimized /><span><strong>{club.name}</strong><small>Clube · Rank #{club.rank || "—"} · SR {club.skillRating || "—"}</small></span><ArrowRight /></Link>)}{matchingPlayers.map((player) => <Link href={`/jogador/${encodeURIComponent(player.id)}`} key={`player-${player.id}`}><span className="search-player-mark">{player.name.slice(0, 1)}</span><span><strong>{player.name}</strong><small>Jogador · {player.clubName} · {player.position}</small></span><ArrowRight /></Link>)}{!matchingClubs.length && !matchingPlayers.length && <Link href={`/clubes?termo=${encodeURIComponent(query.trim())}`}><Search /><span><strong>Procurar no diretório de clubes</strong><small>Buscar por nome ou ID oficial</small></span><ArrowRight /></Link>}</div>}
        </label>
        <div className="quick-links">
          <Link href="/clubes"><Shield /><span><strong>Clubes</strong><small>Encontrar times</small></span></Link>
          <Link href="/jogadores"><Users /><span><strong>Jogadores</strong><small>Explorar atletas</small></span></Link>
          <Link href="/partidas/amistosos#buscar-amistoso"><Swords /><span><strong>Amistosos</strong><small>Buscar confronto</small></span></Link>
          <Link href="/rankings/jogadores/artilharia"><BarChart3 /><span><strong>Rankings</strong><small>Ver os líderes</small></span></Link>
        </div>
        <div className="member-status"><Link href={profile?.clubId ? `/club/${profile.clubId}` : "/cadastro"}><Shield /><span><small>MEU CLUBE</small><strong>{profile?.clubName ?? "Vincular time da EA"}</strong></span><ArrowRight /></Link><Link href="/mercado"><BriefcaseBusiness /><span><small>MERCADO</small><strong>Publicar vaga ou perfil</strong></span><ArrowRight /></Link></div>
      </section>

      <section className="market-section open-challenges-home" id="desafios-abertos">
        <div className="market-title"><div><small><Radio /> MURAL EM TEMPO REAL</small><h2>Desafios em aberto</h2></div><Link href="/partidas/amistosos#desafios-abertos">Ver todos <ArrowRight /></Link></div>
        {openChallenges.length ? <div className="open-challenge-grid">{openChallenges.map((challenge) => {
          const host = availableClubs.find((club) => club.id === challenge.hostClubId);
          return <Link href="/partidas/amistosos#desafios-abertos" className="open-challenge-card" key={challenge.id}>
            <header><span><Radio /> Aceitando rival</span><b>Desafio aberto</b></header>
            <div>{host?.crestUrl ? <Image src={host.crestUrl} alt={`Escudo ${challenge.hostClubName}`} width={56} height={56} unoptimized /> : <i>{challenge.hostClubName.slice(0, 2).toUpperCase()}</i>}<span><strong>{challenge.hostClubName}</strong><small>Publicado por {challenge.creatorName}</small></span><em>×</em><span className="open-rival"><b>?</b><small>Seu clube</small></span></div>
            <footer><span><CalendarDays /> {new Date(`${challenge.date}T12:00:00`).toLocaleDateString("pt-BR")}</span><span><Clock3 /> {challenge.time}</span><span><MapPin /> {challenge.region}</span><ArrowRight /></footer>
          </Link>;
        })}</div> : <div className="open-challenge-empty"><Swords /><span><strong>Nenhum desafio aberto agora</strong><small>Seja o primeiro clube a publicar um horário para a comunidade.</small></span><Link href="/partidas/amistosos#buscar-amistoso">Criar desafio <ArrowRight /></Link></div>}
      </section>

      <section className="market-section home-invite-section"><ClubInviteCard compact /></section>

      <section className="market-section" id="clubes">
        <div className="market-title"><div><small>RANKING OFICIAL EA · COMMON GEN 5</small><h2>Top 5 clubes</h2></div><Link href="/rankings/times">Ranking completo <ArrowRight /></Link></div>
        <div className="club-strip home-top-clubs">{topClubs.map((club) => (
          <Link className="club-market-card" href={`/club/${club.id}`} key={club.id}>
            <Image src={club.crestUrl} alt={`Escudo ${club.name}`} width={72} height={72} unoptimized />
            <span className="home-club-rank">#{club.rank}</span><div><strong>{club.name}</strong><small>{club.wins ?? 0}V · {club.draws ?? 0}E · {club.losses ?? 0}D</small><b>SR {club.skillRating || "—"} · {club.goals ?? 0} gols</b></div>
          </Link>
        ))}</div>
      </section>

      <section className="market-section" id="jogadores">
        <div className="market-title"><div><small>DESTAQUES DE JOGADORES</small><h2>Líderes por estatística</h2></div><Link href="/rankings/jogadores/artilharia">Todos os rankings <ArrowRight /></Link></div>
        <div className="home-player-leaders">{[{ title: "Top 5 artilheiros", icon: Goal, metric: "gols", items: topScorers, value: (player: HomePlayer) => player.goals }, { title: "Top 5 assistências", icon: Users, metric: "assist.", items: topAssists, value: (player: HomePlayer) => player.assists }, { title: "Top 5 desarmes", icon: Trophy, metric: "desarmes", items: topTackles, value: (player: HomePlayer) => player.tacklesMade }].map((board) => { const Icon = board.icon; return <article key={board.title}><header><Icon /><h3>{board.title}</h3></header>{board.items.map((player, index) => <Link href={`/jogador/${encodeURIComponent(player.id)}`} key={`${board.title}-${player.id}`}><b>{index + 1}</b><span><strong>{player.name}</strong><small>{player.clubName ?? "Clube indexado"}</small></span><em>{board.value(player)?.toLocaleString("pt-BR") ?? "—"} {board.metric}</em></Link>)}</article>; })}</div>
      </section>
      <footer className="platform-footer">Plataforma comunitária independente para EA SPORTS FC Clubs. Sem afiliação ou patrocínio da Electronic Arts Inc.</footer>
      <MobileNav />
    </main>
  );
}
