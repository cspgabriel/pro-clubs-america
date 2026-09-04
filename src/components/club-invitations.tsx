"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Check, Clock3, LogOut, MailPlus, ShieldCheck, UserPlus, X } from "lucide-react";
import { createClubInvitation, getClubInvitations, leaveCommunityClub, respondToClubInvitation, type ClubInvitationsSummary } from "@/lib/community-service";
import styles from "./club-invitations.module.css";

type Mode = "incoming" | "manage" | "club";

export function ClubInvitations({ mode, clubId, onMembershipChanged }: { mode: Mode; clubId?: string; onMembershipChanged?: () => void }) {
  const [data, setData] = useState<ClubInvitationsSummary | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const load = useCallback(() => getClubInvitations().then(setData).catch(() => setData(null)), []);
  useEffect(() => { void load(); }, [load]);

  const incoming = useMemo(() => (data?.incoming || []).filter((invitation) => !clubId || invitation.club.id === clubId), [clubId, data?.incoming]);
  if (!data || (mode !== "manage" && !incoming.length)) return null;

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const target = String(new FormData(form).get("target") || "");
    setBusy("create"); setMessage("");
    try {
      const result = await createClubInvitation(target);
      form.reset();
      setMessage(result.emailStatus === "sent" ? "Convite criado e e-mail enviado." : result.emailStatus === "failed" ? "Convite criado no site, mas o e-mail não pôde ser entregue." : "Convite criado no site. O envio de e-mail está desativado no momento.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível criar o convite."); }
    finally { setBusy(""); }
  }

  async function respond(id: string, action: "accept" | "decline" | "cancel") {
    setBusy(`${action}:${id}`); setMessage("");
    try {
      const result = await respondToClubInvitation(id, action);
      setMessage(action === "accept" ? `Você agora faz parte do ${result.clubName || "clube"}.` : action === "decline" ? "Convite recusado." : "Convite cancelado.");
      await load();
      if (action === "accept") onMembershipChanged?.();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível responder ao convite."); }
    finally { setBusy(""); }
  }

  async function leave() {
    if (!confirmLeave) { setConfirmLeave(true); return; }
    setBusy("leave"); setMessage("");
    try {
      const result = await leaveCommunityClub();
      setMessage(`Você saiu do ${result.clubName || "clube"}.`);
      setConfirmLeave(false);
      await load();
      onMembershipChanged?.();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível sair do clube."); }
    finally { setBusy(""); }
  }

  if (mode === "manage") return <section className={styles.panel} aria-label="Gestão de convites do elenco">
    <header className={styles.header}><div><span className={styles.eyebrow}><ShieldCheck /> CONVITES DO ELENCO</span><h2>Chame jogadores para o time</h2><p>Convide uma conta existente pelo @nick ou e-mail. Quem ainda não se cadastrou pode entrar pelo link geral acima.</p></div>{Boolean(data.outgoing.length) && <span className={styles.count}>{data.outgoing.length}</span>}</header>
    {data.membership?.canManage && <form className={styles.form} onSubmit={invite}><label htmlFor="club-invite-target">Jogador cadastrado</label><input id="club-invite-target" name="target" placeholder="@nick ou jogador@email.com" required autoComplete="off" /><button type="submit" disabled={Boolean(busy)}><UserPlus /> {busy === "create" ? "Enviando…" : "Enviar convite"}</button></form>}
    {data.membership?.canManage && <div className={styles.list}>{data.outgoing.length ? data.outgoing.map((invitation) => <article className={styles.card} key={invitation.id}><span className={styles.avatar}>{invitation.invitee.name.slice(0, 1).toUpperCase()}</span><div><strong>{invitation.invitee.name}</strong><small>{invitation.invitee.nickname ? `@${invitation.invitee.nickname} · ` : ""}expira em {new Date(invitation.expiresAt).toLocaleDateString("pt-BR")}</small></div><div className={styles.actions}><button className={styles.danger} disabled={Boolean(busy)} type="button" onClick={() => respond(invitation.id, "cancel")}><X /> Cancelar</button></div></article>) : <div className={styles.empty}>Nenhum convite aguardando resposta.</div>}</div>}
    {data.membership && data.membership.role !== "owner" && <div className={styles.leave}><span>Quer deixar de representar este clube na comunidade?</span><button className={confirmLeave ? styles.confirm : ""} type="button" disabled={Boolean(busy)} onClick={leave}><LogOut /> {busy === "leave" ? "Saindo…" : confirmLeave ? "Confirmar saída" : "Sair do clube"}</button></div>}
    {message && <p className={styles.message} aria-live="polite">{message}</p>}
  </section>;

  return <section className={styles.panel} aria-label="Convites recebidos">
    <header className={styles.header}><div><span className={styles.eyebrow}><MailPlus /> {mode === "club" ? "ESTE CLUBE TE CHAMOU" : "CONVITE PARA O ELENCO"}</span><h2>{mode === "club" ? incoming[0].club.name : "Você recebeu um convite"}</h2><p>{mode === "club" ? `${incoming[0].inviter.name} quer você neste elenco.` : "Confira o clube antes de decidir. Seu perfil só muda depois do aceite."}</p></div><span className={styles.count}>{incoming.length}</span></header>
    <div className={styles.list}>{incoming.map((invitation) => <article className={styles.card} key={invitation.id}><span className={styles.avatar}>{invitation.club.name.slice(0, 1).toUpperCase()}</span><div><strong>{invitation.club.name}</strong><small>Convite de {invitation.inviter.nickname ? `@${invitation.inviter.nickname}` : invitation.inviter.name} · <Clock3 size={11} /> expira em {new Date(invitation.expiresAt).toLocaleDateString("pt-BR")}</small></div><div className={styles.actions}><button disabled={Boolean(busy)} type="button" onClick={() => respond(invitation.id, "accept")}><Check /> Aceitar</button><button className={styles.secondary} disabled={Boolean(busy)} type="button" onClick={() => respond(invitation.id, "decline")}><X /> Recusar</button></div></article>)}</div>
    {message && <p className={styles.message} aria-live="polite">{message}</p>}
  </section>;
}
