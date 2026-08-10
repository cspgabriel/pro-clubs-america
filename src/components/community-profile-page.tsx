"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Shield, Target, Trophy, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { CountryFlag } from "./country-flag";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";

interface ProfileData { id: string; name: string; role: string; country: string; club: { id: string; name: string } | null; player: { id: string; name: string; position: string; overall: number; matches: number; goals: number; assists: number; tackles: number; winRate: number } | null; }

export function CommunityProfilePage() {
  const id = useSearchParams().get("id") || "";
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState(id ? "" : "Perfil não informado.");
  useEffect(() => { if (!id) return; fetch(`/api/community/profiles/${encodeURIComponent(id)}`, { cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<ProfileData>; }).then(setProfile).catch(() => setError("Perfil não encontrado.")); }, [id]);
  return <main className="app-shell"><PlatformHeader />{profile ? <><section className="account-hero professional"><span className="account-avatar">{profile.name.slice(0, 1).toUpperCase()}</span><div><small>PERFIL DA COMUNIDADE</small><h1 className="profile-country-title">{profile.name} <CountryFlag country={profile.country} /></h1><p>{profile.role === "owner" ? "Dono de clube" : profile.role === "captain" ? "Capitão" : "Jogador"}</p></div></section><section className="community-player-profile">{profile.player ? <><header><Target /><div><small>JOGADOR OFICIAL VINCULADO</small><h2>{profile.player.name}</h2><p>{profile.player.position} · OVR {profile.player.overall}</p></div><Link href={`/jogador/${encodeURIComponent(profile.player.id)}`}>Ver estatísticas completas <ArrowRight /></Link></header><div><article><strong>{profile.player.matches}</strong><span>Jogos</span></article><article><strong>{profile.player.goals}</strong><span>Gols</span></article><article><strong>{profile.player.assists}</strong><span>Assistências</span></article><article><strong>{profile.player.tackles}</strong><span>Desarmes</span></article></div></> : <div className="community-profile-empty"><UserRound /><h2>Perfil comunitário</h2><p>Este usuário ainda não vinculou seu jogador oficial da EA.</p></div>}{profile.club && <Link className="community-profile-club" href={`/club/${profile.club.id}`}><Shield /> {profile.club.name}<ArrowRight /></Link>}</section></> : <section className="member-home-loading">{error ? <><UserRound /><span>{error}</span></> : <><Trophy /><span>Carregando perfil…</span></>}</section>}<MobileNav /></main>;
}
