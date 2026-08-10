"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Link2, LoaderCircle, ShieldCheck } from "lucide-react";
import { observeAuth } from "@/lib/auth-client";
import { getCommunityProfile, submitEaMatchSource, type CommunityProfile } from "@/lib/community-service";
import type { FriendlyRequest } from "@/lib/friendlies";

export function EaSourceSubmission({ match }: { match: FriendlyRequest }) {
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [sent, setSent] = useState(false);
  useEffect(() => observeAuth((user) => { if (!user) { setProfile(null); return; } getCommunityProfile().then(setProfile).catch(() => setProfile(null)); }), []);
  const participant = Boolean(profile?.clubId && [match.hostClubId, match.opponentClubId].includes(profile.clubId) && ["owner", "captain", "admin"].includes(profile.role));

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setNotice("");
    try { const result = await submitEaMatchSource(match.id, url); setSent(true); setNotice(result.message); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível enviar a URL."); }
    finally { setBusy(false); }
  }

  return <article className="ea-source-card"><header><span><Link2 /></span><div><small>FONTE OFICIAL DA PARTIDA</small><h2>Envie a URL pública da EA</h2></div>{sent ? <CheckCircle2 /> : <ShieldCheck />}</header><p>Quando o jogo aparecer no histórico do seu clube na EA, cole a URL aqui. Ela entra na fila prioritária; o placar só será confirmado se os dois times e a janela do confronto coincidirem.</p>{participant ? <form onSubmit={submit}><label>URL do histórico EA<input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.ea.com/pt-br/games/ea-sports-fc/clubs/match-history?clubId=...&platform=common-gen5" /></label><button disabled={busy || sent}>{busy ? <LoaderCircle className="spin" /> : sent ? <CheckCircle2 /> : <ExternalLink />}{busy ? "Enviando…" : sent ? "URL enviada" : "Enviar para validação"}</button></form> : <small className="ea-source-lock">Disponível para dono ou capitão de um dos dois clubes.</small>}{notice && <strong className="ea-source-notice" role="status">{notice}</strong>}<footer><ShieldCheck /> Sem placar manual: a URL somente prioriza a verificação da fonte.</footer></article>;
}
