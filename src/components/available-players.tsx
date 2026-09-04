"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, UserRoundSearch } from "lucide-react";
import { listCommunityMembers, type CommunityMemberCard } from "@/lib/community-service";
import { communityProfileUrl, deviceLabel } from "@/lib/player-identity";
import styles from "./available-players.module.css";

export function AvailablePlayers() {
  const [members, setMembers] = useState<CommunityMemberCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const load = () => listCommunityMembers(true).then((data) => { if (active) { setMembers(data.members); setError(false); } }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    const refresh = () => { if (!document.hidden) void load(); };
    void load(); document.addEventListener("visibilitychange", refresh);
    return () => { active = false; document.removeEventListener("visibilitychange", refresh); };
  }, [retry]);
  return <section className={styles.section} aria-label="Jogadores procurando clube"><header><div><small>VITRINE DA COMUNIDADE</small><h2>Prontos para entrar em campo</h2><p>Jogadores que marcaram disponibilidade no próprio perfil.</p></div><Link href="/onboarding">Minha disponibilidade <ArrowRight size={16} /></Link></header>
    {loading ? <p role="status">Buscando jogadores…</p> : error ? <p role="alert">Não foi possível carregar a vitrine. <button type="button" onClick={() => { setLoading(true); setRetry((value) => value + 1); }}>Tentar novamente</button></p> : members.length ? <div className={styles.grid}>{members.map((member) => <Link key={member.id} href={communityProfileUrl(member)}><UserRoundSearch size={24} /><span><strong>{member.name}</strong>{member.nickname && <small>@{member.nickname}</small>}<small>{[member.preferredPosition || member.player?.position, deviceLabel(member.gamingPlatform)].filter(Boolean).join(" · ") || "Procurando clube"}</small></span><ArrowRight size={18} /></Link>)}</div> : <p>A vitrine está aberta. Marque “Estou procurando clube” no seu perfil para aparecer aqui.</p>}
  </section>;
}
