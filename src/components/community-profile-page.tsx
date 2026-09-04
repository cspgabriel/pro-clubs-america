"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CirclePlay, Goal, Shield, Target, Trophy, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CountryFlag } from "./country-flag";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";
import { deviceLabel } from "@/lib/player-identity";

interface ProfileData {
  id: string;
  name: string;
  nickname?: string;
  gamingPlatform?: string;
  preferredPosition?: string;
  lookingForClub?: boolean;
  role: string;
  country: string;
  club: { id: string; name: string } | null;
  player: { id: string; name: string; position: string; overall: number; matches: number; goals: number; assists: number; tackles: number; winRate: number } | null;
  showcase: { overall: number | null; positions: string[]; archetypes: string[]; photoUrls: string[]; youtubeUrls: string[]; };
}

function youtubeId(url: string) {
  try {
    const parsed = new URL(url);
    const id = parsed.hostname.includes("youtu.be") ? parsed.pathname.slice(1) : parsed.searchParams.get("v");
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

const roleLabel = (role: string) => role === "owner" ? "Dono de clube" : role === "captain" ? "Capitão" : "Jogador";

export function CommunityProfilePage() {
  const id = useSearchParams().get("id") || "";
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState(id ? "" : "Perfil não informado.");
  useEffect(() => {
    if (!id) return;
    fetch(`/api/community/profiles/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<ProfileData>;
      })
      .then(setProfile)
      .catch(() => setError("Perfil não encontrado."));
  }, [id]);

  const videoIds = useMemo(() => profile?.showcase.youtubeUrls.map(youtubeId).filter((video): video is string => Boolean(video)) ?? [], [profile]);
  const overall = profile?.showcase.overall ?? (profile?.player && profile.player.overall >= 20 ? profile.player.overall : null);
  const stats = profile ? [
    { label: "OVR", value: overall ?? "—" },
    { label: "Jogos", value: profile.player?.matches ?? "—" },
    { label: "Gols", value: profile.player?.goals ?? "—" },
    { label: "Assist.", value: profile.player?.assists ?? "—" },
    { label: "Desarmes", value: profile.player?.tackles ?? "—" },
    { label: "Vitórias", value: profile.player ? `${Math.round(profile.player.winRate)}%` : "—" },
  ] : [];
  const hasShowcase = Boolean(profile && (profile.showcase.positions.length || profile.showcase.archetypes.length || profile.showcase.photoUrls.length || videoIds.length));

  return <main className="app-shell"><PlatformHeader />{profile ? <>
    <section className="account-hero professional"><span className="account-avatar">{profile.name.slice(0, 1).toUpperCase()}</span><div><small>{profile.nickname ? `@${profile.nickname}` : "PERFIL DA COMUNIDADE"}</small><h1 className="profile-country-title">{profile.name} <CountryFlag country={profile.country} /></h1><p>{roleLabel(profile.role)}{profile.club ? ` · ${profile.club.name}` : ""}</p><p>{[deviceLabel(profile.gamingPlatform), profile.preferredPosition].filter(Boolean).join(" · ")}</p>{profile.lookingForClub && <Link href="/mercado">Procurando clube <ArrowRight size={16} /></Link>}</div></section>
    <section className="community-player-profile"><header><Target /><div><small>{profile.player ? "JOGADOR OFICIAL VINCULADO" : "CARTÃO DO ATLETA"}</small><h2>{profile.player?.name || "Atleta da comunidade"}</h2><p>{profile.player?.position || profile.showcase.positions[0] || "Posição ainda não informada"}{overall ? ` · OVR ${overall}` : ""}</p></div>{profile.player ? <Link href={`/jogador/${encodeURIComponent(profile.player.id)}`}>Ver carreira <ArrowRight /></Link> : <span className="community-profile-pending"><Goal /> Estatísticas ao vincular EA</span>}</header><div className="community-profile-stats">{stats.map((stat) => <article key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></article>)}</div>{profile.club && <Link className="community-profile-club" href={`/time?id=${encodeURIComponent(profile.club.id)}`}><Shield /> {profile.club.name}<ArrowRight /></Link>}</section>
    <section className="public-showcase"><header><div><small>VITRINE DO ATLETA</small><h2>Boneco, posições e lances</h2></div><Trophy /></header>{hasShowcase ? <>{(profile.showcase.positions.length > 0 || profile.showcase.archetypes.length > 0) && <div className="public-showcase-tags"><div><small>POSIÇÕES</small>{profile.showcase.positions.length ? profile.showcase.positions.map((position) => <span key={position}>{position}</span>) : <em>Não informadas</em>}</div><div><small>ARQUÉTIPOS</small>{profile.showcase.archetypes.length ? profile.showcase.archetypes.map((archetype) => <span key={archetype}>{archetype}</span>) : <em>Não informados</em>}</div></div>}{profile.showcase.photoUrls.length > 0 && <div className="public-showcase-photos">{profile.showcase.photoUrls.map((url) => <img key={url} src={url} alt={`Boneco de ${profile.name} no EA SPORTS FC`} />)}</div>}{videoIds.length > 0 && <div className="public-showcase-videos">{videoIds.map((video) => <iframe key={video} src={`https://www.youtube-nocookie.com/embed/${video}`} title={`Melhores momentos de ${profile.name}`} allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />)}</div>}</> : <div className="public-showcase-empty"><CirclePlay /><strong>Ainda não há fotos ou melhores momentos.</strong><span>OVR, posições, arquétipos, fotos do boneco e vídeos de gols aparecem aqui.</span></div>}<Link href="/conta" className="public-showcase-edit"><CirclePlay /> Tem lances? Monte sua vitrine</Link></section>
  </> : <section className="member-home-loading">{error ? <><UserRound /><span>{error}</span></> : <><Trophy /><span>Carregando perfil…</span></>}</section>}<MobileNav /></main>;
}
