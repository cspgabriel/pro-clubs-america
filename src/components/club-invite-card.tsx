"use client";

import { Check, Copy, Gift, Share2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { getClubReferral, type ClubReferralSummary } from "@/lib/community-service";

export function ClubInviteCard({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<ClubReferralSummary | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { getClubReferral().then(setData).catch(() => setData(null)); }, []);
  if (!data?.clubName || !data.inviteUrl) return null;

  async function share() {
    const text = `Entre para o ${data?.clubName} no Pro Clubs America. Ao concluir o cadastro, você será adicionado automaticamente ao time.`;
    if (navigator.share) await navigator.share({ title: `Convite do ${data?.clubName}`, text, url: data?.inviteUrl });
    else {
      await navigator.clipboard.writeText(data?.inviteUrl || "");
      setCopied(true); window.setTimeout(() => setCopied(false), 1800);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(data?.inviteUrl || "");
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }

  return <section className={`club-invite-card${compact ? " compact" : ""}`}>
    <div className="club-invite-icon"><Gift /></div>
    <div><small>CONVIDE SEU ELENCO</small><h2>15 dias para você e para o {data.clubName}</h2><p>Cada amigo que criar a conta pelo seu link entra automaticamente no time e libera 15 dias extras para o membro que convidou e para a equipe.</p><span><Users /> {data.invitedCount} convite{data.invitedCount === 1 ? " convertido" : "s convertidos"}</span></div>
    <aside><button type="button" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? "Link copiado" : "Copiar convite"}</button><button type="button" onClick={share}><Share2 /> Compartilhar</button></aside>
  </section>;
}
