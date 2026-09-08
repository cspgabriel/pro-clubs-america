"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, CalendarCheck, CheckCircle2, ExternalLink, Link2, LogOut, Mail, Settings2, Shield, Target, Trash2, UserRound, Users } from "lucide-react";
import { logout, observeAuth, type AuthUserSnapshot } from "@/lib/auth-client";
import { getCommunityProfile, linkEaPlayer, requestAccountDeletion, type CommunityProfile } from "@/lib/community-service";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";
import { CountryFlag } from "./country-flag";
import { BillingPortalButton } from "./billing-actions";
import { NotificationSettings } from "./notification-settings";
import { ProfileShowcaseEditor } from "./profile-showcase-editor";
import { ClubInvitations } from "./club-invitations";

export function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserSnapshot | null>(null);
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [playerLinkBusy, setPlayerLinkBusy] = useState(false);
  const [playerLinkMessage, setPlayerLinkMessage] = useState("");
  const [deletionConfirming, setDeletionConfirming] = useState(false);
  const [deletionBusy, setDeletionBusy] = useState(false);
  const [deletionMessage, setDeletionMessage] = useState("");
  const trialActive = Boolean(profile?.premiumAccess && profile.plan === "free");
  const planLabel = profile?.plan === "club_premium" ? "Premium Pro" : profile?.plan === "club_pro" ? "Clube Pro" : profile?.plan === "player_pro" ? "Jogador Pro" : trialActive ? "Premium · teste grátis" : "Gratuito";
  useEffect(() => observeAuth((value) => { setUser(value); if (value) getCommunityProfile().then(setProfile).catch(() => setProfile(null)); else setProfile(null); }), []);
  async function exit() { await logout(); router.push("/"); }
  async function requestDeletion() { setDeletionBusy(true); setDeletionMessage(""); try { const result = await requestAccountDeletion(); setDeletionMessage(result.alreadyPending ? "Sua solicitação de exclusão já está em processamento." : "Solicitação recebida. O suporte processará a exclusão da conta e dos dados associados."); setDeletionConfirming(false); } catch (error) { setDeletionMessage(error instanceof Error ? error.message : "Não foi possível registrar a solicitação."); } finally { setDeletionBusy(false); } }
  async function linkPlayer(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); setPlayerLinkBusy(true); setPlayerLinkMessage(""); try { const linked = await linkEaPlayer({ eaUrl: String(form.get("eaUrl")), gamertag: String(form.get("gamertag")) }); setProfile((current) => current ? { ...current, playerId: linked.playerId, playerName: linked.playerName, playerGames: linked.matches, playerGoals: linked.goals, playerAssists: linked.assists, playerTackles: linked.tackles, playerEaUrl: linked.sourceUrl, playerEaLinkedAt: new Date().toISOString(), clubId: current.clubId || linked.clubId, clubName: current.clubName || linked.clubName } : current); setPlayerLinkMessage("Jogador vinculado. Carreira carregada e histórico do clube colocado na fila de atualização."); } catch (error) { setPlayerLinkMessage(error instanceof Error ? error.message : "Não foi possível vincular o jogador."); } finally { setPlayerLinkBusy(false); } }
  return <main className="app-shell"><PlatformHeader /><section className="account-hero professional"><span className="account-avatar">{(user?.name ?? "J").slice(0, 1).toUpperCase()}</span><div><small>MINHA CONTA</small><h1>{profile?.displayName || user?.name || "Você ainda não entrou"}</h1><p>{user?.email ?? "Entre para aceitar desafios e representar seu clube."}</p></div></section><div className="account-grid professional">{user ? <>
    <ClubInvitations mode="incoming" onMembershipChanged={() => getCommunityProfile().then(setProfile).catch(() => undefined)} />
    <article className="account-profile-card"><header><CheckCircle2 /><span>CONTA VERIFICADA</span></header><div className="account-identity"><span>{user.name.slice(0, 1).toUpperCase()}</span><div><h2 className="profile-country-title">{profile?.displayName || user.name} <CountryFlag country={profile?.country} /></h2><p><Mail /> {user.email}</p></div></div><dl><div><dt>Perfil</dt><dd>{profile?.role === "owner" ? "Dono" : profile?.role === "captain" ? "Capitão" : profile?.role === "player" ? "Jogador" : "Visitante"}</dd></div><div><dt>Plano</dt><dd>{planLabel}</dd></div>{profile?.bonusAccessUntil && <div><dt>Premium ativo até</dt><dd>{new Date(profile.bonusAccessUntil).toLocaleDateString("pt-BR")}</dd></div>}</dl><div className="account-card-actions"><Link href="/onboarding"><Settings2 /> Editar perfil e disponibilidade <ArrowRight /></Link>{profile?.id && <Link href={`/perfil?id=${encodeURIComponent(profile.nickname || profile.id)}`}><UserRound /> Ver meu perfil público <ArrowRight /></Link>}{profile?.plan === "player_pro" || profile?.plan === "club_pro" ? <BillingPortalButton /> : <Link href="/planos"><CalendarCheck /> {profile?.plan === "club_premium" ? "Ver benefícios Premium" : "Conhecer planos"} <ArrowRight /></Link>}</div></article>
    <article className="account-club-card"><header><Shield /><span>MEU CLUBE</span></header><h2 className="profile-country-title">{profile?.clubName ?? profile?.pendingClubName ?? "Vincule um time EA"}<CountryFlag country={profile?.country} /></h2><p>{profile?.clubId ? `Você faz parte deste clube como ${profile.role === "owner" ? "dono" : profile.role === "captain" ? "capitão" : "jogador"}.` : profile?.pendingClubId ? "O vínculo está sendo concluído automaticamente." : "Vincule o clube para aceitar desafios e convidar integrantes do elenco."}</p><div className="account-card-actions">{profile?.clubId && <Link href="/conta/time"><Users /> Gerenciar time <ArrowRight /></Link>}<Link href={profile?.clubId ? `/time?id=${encodeURIComponent(profile.clubId)}` : profile?.pendingClubId ? "/conta" : "/cadastro"}>{profile?.clubId ? "Abrir página do clube" : profile?.pendingClubId ? "Atualizar vínculo" : "Cadastrar meu time"} <ArrowRight /></Link></div></article>
    <article className="player-link-card"><header><Target /><span>MEU JOGADOR EA</span></header>{profile?.playerId ? <><h2>{profile.playerName}</h2><p>Sua carreira e as atuações publicadas no histórico do clube estão conectadas ao perfil da comunidade.</p><dl className="player-link-stats"><div><dt>Jogos</dt><dd>{profile.playerGames ?? "—"}</dd></div><div><dt>Gols</dt><dd>{profile.playerGoals ?? "—"}</dd></div><div><dt>Assist.</dt><dd>{profile.playerAssists ?? "—"}</dd></div><div><dt>Desarmes</dt><dd>{profile.playerTackles ?? "—"}</dd></div></dl><div className="player-link-actions"><Link href={`/jogador/${encodeURIComponent(profile.playerId)}`}>Ver carreira e histórico <ArrowRight /></Link>{profile.playerEaUrl && <a href={profile.playerEaUrl} target="_blank" rel="noreferrer">Abrir fonte EA <ExternalLink /></a>}</div>{profile.playerEaLinkedAt && <small>Fonte vinculada em {new Date(profile.playerEaLinkedAt).toLocaleString("pt-BR")}</small>}<form onSubmit={linkPlayer}><label>Atualizar pela URL pública de Histórico da EA<input required name="eaUrl" type="url" placeholder="https://www.ea.com/pt-br/.../match-history?clubId=..." /></label><input name="gamertag" type="hidden" value={profile.playerName || profile.playerId} /><button disabled={playerLinkBusy} type="submit"><Link2 /> {playerLinkBusy ? "Enviando…" : "Atualizar meu histórico"}</button>{playerLinkMessage && <small>{playerLinkMessage}</small>}</form></> : <form onSubmit={linkPlayer}><h2>Traga suas estatísticas</h2><p>Cole o link público de Integrantes ou Histórico do seu clube e informe seu nome exatamente como aparece na EA.</p><label>URL pública do clube na EA<input required name="eaUrl" type="url" placeholder="https://www.ea.com/pt-br/.../match-history?clubId=..." /></label><label>Nome do jogador na EA<input required name="gamertag" placeholder="Ex.: MatthewsMendesx" /></label><button disabled={playerLinkBusy} type="submit"><Link2 /> {playerLinkBusy ? "Vinculando…" : "Vincular e importar histórico"}</button>{playerLinkMessage && <small>{playerLinkMessage}</small>}</form>}</article>
    <ProfileShowcaseEditor />
    <NotificationSettings />
    <article className="account-profile-card">
      <header><AlertTriangle /><span>EXCLUSÃO DE CONTA</span></header>
      <h2>Encerrar minha conta</h2>
            <p>Esta solicitação inicia a exclusão da sua conta e dos dados associados. Depois de registrada, ela será processada pelo suporte e não poderá ser desfeita.</p>
      {deletionConfirming ? <div className="account-card-actions"><button type="button" onClick={requestDeletion} disabled={deletionBusy}><Trash2 /> {deletionBusy ? "Registrando…" : "Confirmar solicitação de exclusão"}</button><button type="button" onClick={() => setDeletionConfirming(false)} disabled={deletionBusy}>Cancelar</button></div> : <div className="account-card-actions"><button type="button" onClick={() => setDeletionConfirming(true)}><Trash2 /> Solicitar exclusão da conta</button></div>}
      {deletionMessage && <small>{deletionMessage}</small>}
    </article>
    <button className="account-logout" onClick={exit}><LogOut /> Sair da conta</button>
  </> : <article><h2>Identificação necessária</h2><p>Crie uma conta ou entre com Google/e-mail.</p><Link href="/entrar">Entrar <ArrowRight /></Link></article>}</div><MobileNav /></main>;
}
