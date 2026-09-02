"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, ShieldCheck, Swords, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { CountryFlag } from "./country-flag";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";

interface ClubMember {
  id: string;
  name: string;
  role: string;
  country: string;
  avatarUrl?: string;
  player?: { id: string; name: string; position: string; overall: number };
}

interface CommunityClub {
  id: string;
  name: string;
  platform: string;
  verified: boolean;
  members: ClubMember[];
}

const roleLabel = (role: string) => role === "owner" ? "Dono" : role === "captain" ? "Capitão" : "Jogador";

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

  return <main className="app-shell">
    <PlatformHeader />
    {club ? <>
      <section className="community-club-hero">
        <Link href="/clubes" className="community-back"><ArrowLeft /> Comunidade</Link>
        <div className="community-club-badge">{club.name.slice(0, 2).toUpperCase()}</div>
        <div><small>CLUBE DA COMUNIDADE</small><h1>{club.name}</h1><p>{club.verified ? <><ShieldCheck /> Clube vinculado e verificado</> : <><Users /> Clube cadastrado na plataforma</>}</p></div>
        <Link href="/partidas/amistosos#buscar-amistoso" className="community-club-challenge"><Swords /> Desafiar este clube</Link>
      </section>
      <section className="community-club-roster">
        <header><div><small>ELENCO NA PLATAFORMA</small><h2>{club.members.length} {club.members.length === 1 ? "membro" : "membros"} cadastrados</h2></div><span>{club.platform === "common-gen4" ? "PS4 / Xbox One" : "PS5 / Xbox Series / PC"}</span></header>
        {club.members.length ? <div>{club.members.map((member) => <Link href={`/perfil?id=${encodeURIComponent(member.id)}`} key={member.id}>
          {member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : <b>{member.name.slice(0, 1).toUpperCase()}</b>}
          <span><strong>{member.name} <CountryFlag country={member.country} /></strong><small>{roleLabel(member.role)}{member.player ? ` · ${member.player.position} · OVR ${member.player.overall}` : " · Perfil da comunidade"}</small></span><ArrowRight />
        </Link>)}</div> : <div className="community-club-empty"><Users /><strong>O elenco ainda está sendo montado</strong><span>Este clube já está na plataforma. Os jogadores aparecerão aqui conforme entrarem no time.</span></div>}
      </section>
    </> : <section className="member-home-loading"><Users /><span>{error || "Carregando clube…"}</span>{error && <Link href="/clubes">Voltar para a comunidade</Link>}</section>}
    <MobileNav />
  </main>;
}
