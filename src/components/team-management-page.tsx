"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Crown, Shield, UserRound, Users } from "lucide-react";
import { observeAuth, type AuthUserSnapshot } from "@/lib/auth-client";
import { getClubReferral, type ClubReferralSummary } from "@/lib/community-service";
import { ClubInviteCard } from "./club-invite-card";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";

export function TeamManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserSnapshot | null>(null);
  const [data, setData] = useState<ClubReferralSummary | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => observeAuth((value) => {
    setUser(value); setReady(true);
    if (!value) router.replace("/entrar?next=/conta/time");
    else getClubReferral().then(setData).catch(() => setData(null));
  }), [router]);
  if (!ready || !user) return <main className="member-home-loading"><Shield /><span>Carregando seu time…</span></main>;
  return <main className="app-shell"><PlatformHeader />
    <section className="team-management-hero"><Link href="/conta"><ArrowLeft /> Minha conta</Link><small>GESTÃO DO CLUBE</small><h1>{data?.clubName ?? "Vincule seu clube"}</h1><p>Gerencie os integrantes conectados à equipe e convide o elenco por um link individual.</p></section>
    <div className="team-management-content">
      {data?.clubName ? <><ClubInviteCard /><section className="team-members-panel"><header><Users /><div><small>ELENCO CADASTRADO</small><h2>{data.members.length} integrante{data.members.length === 1 ? "" : "s"}</h2></div></header><div>{data.members.map((member) => <article key={member.id}><span><UserRound /></span><div><strong>{member.name}</strong><small>{member.role === "owner" ? "Dono do clube" : member.role === "captain" ? "Capitão" : "Jogador"}</small></div>{member.role === "owner" || member.role === "captain" ? <Crown /> : <Shield />}</article>)}</div></section></> : <section className="team-empty"><Shield /><h2>Seu perfil ainda não representa um clube</h2><p>Vincule a URL pública do time na EA para liberar convites e gestão do elenco.</p><Link href="/cadastro">Vincular meu clube</Link></section>}
    </div><MobileNav />
  </main>;
}
