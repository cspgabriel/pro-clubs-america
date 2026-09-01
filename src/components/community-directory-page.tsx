"use client";

import Link from "next/link";
import { ArrowRight, Shield, UserRound, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { listCommunityMembers, type CommunityDirectory } from "@/lib/community-service";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";

export function CommunityDirectoryPage() {
  const [directory, setDirectory] = useState<CommunityDirectory>({ members: [], clubs: [] });
  const [loading, setLoading] = useState(true);
  useEffect(() => { listCommunityMembers().then(setDirectory).catch(() => setDirectory({ members: [], clubs: [] })).finally(() => setLoading(false)); }, []);
  return <main className="app-shell"><PlatformHeader /><section className="community-directory-hero"><small>CADASTROS DA PLATAFORMA</small><h1>Clubes e jogadores<br />da <em>nossa comunidade.</em></h1><p>Aqui aparecem apenas contas e times cadastrados no Pro Clubs America.</p></section><section className="community-directory-grid"><section><header><div><Shield /><span><small>CLUBES CADASTRADOS</small><h2>{directory.clubs.length} times</h2></span></div><Link href="/cadastro">Cadastrar meu time <ArrowRight /></Link></header><div>{directory.clubs.map((club) => <Link href={`/club/${club.id}`} key={club.id}><b>{club.name.slice(0, 2).toUpperCase()}</b><span><strong>{club.name}</strong><small>{club.memberCount} membro{club.memberCount === 1 ? "" : "s"} cadastrado{club.memberCount === 1 ? "" : "s"}</small></span><ArrowRight /></Link>)}{!loading && !directory.clubs.length && <p className="community-directory-empty">Ainda não há clubes cadastrados. Seja o primeiro.</p>}</div></section><section><header><div><Users /><span><small>JOGADORES CADASTRADOS</small><h2>{directory.members.length} perfis</h2></span></div><Link href="/mercado">Abrir mercado <ArrowRight /></Link></header><div>{directory.members.map((member) => <Link href={`/perfil?id=${member.id}`} key={member.id}>{member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : <b>{member.name.slice(0, 1).toUpperCase()}</b>}<span><strong>{member.name}</strong><small>{member.player ? `${member.player.position} · OVR ${member.player.overall}` : member.club?.name || "Perfil da comunidade"}</small></span><ArrowRight /></Link>)}{!loading && !directory.members.length && <p className="community-directory-empty">Ainda não há perfis visíveis.</p>}</div></section></section><section className="community-directory-note"><UserRound /><p>Perfis, vitrines e clubes são construídos pela própria comunidade. A EA é usada somente para validar um vínculo quando o usuário informar a URL pública.</p></section><MobileNav /></main>;
}
