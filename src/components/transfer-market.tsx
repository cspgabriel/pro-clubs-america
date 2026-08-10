"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Check, ChevronDown, Clock3, Search, Shield, UserCheck, UserRoundSearch, Users } from "lucide-react";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";
import { observeAuth, type AuthUserSnapshot } from "@/lib/auth-client";
import { applyToTransferPost, getCommunityProfile, getTransferApplications, publishTransferPost, watchTransferPosts, type CommunityProfile, type MarketApplicationRecord, type TransferPostRecord } from "@/lib/community-service";

type TransferPost = TransferPostRecord;
const planPriority = (plan: TransferPost["plan"]) => ({ free: 0, pro: 1, player_pro: 1, vip: 2, club_pro: 2, club_premium: 3 }[plan]);

export function TransferMarket({ initialType = "club_vacancy" }: { initialType?: TransferPost["type"] }) {
  const [posts, setPosts] = useState<TransferPost[]>([]);
  const [type, setType] = useState<TransferPost["type"]>(initialType);
  const [filter, setFilter] = useState<"all" | TransferPost["type"]>("all");
  const [user, setUser] = useState<AuthUserSnapshot | null>(null);
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [applications, setApplications] = useState<Record<string, MarketApplicationRecord[]>>({});
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const visible = useMemo(() => posts.filter((post) => filter === "all" || post.type === filter).sort((a, b) => planPriority(b.plan) - planPriority(a.plan) || b.createdAt.localeCompare(a.createdAt)), [filter, posts]);
  useEffect(() => { const stopAuth = observeAuth((value) => { setUser(value); if (value) getCommunityProfile().then(setProfile).catch(() => setProfile(null)); else setProfile(null); }); const stopPosts = watchTransferPosts(setPosts, () => setNotice("Não foi possível carregar o mercado em tempo real.")); return () => { stopAuth(); stopPosts(); }; }, []);

  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!user) { setNotice("Entre na sua conta para publicar no mercado."); return; } if (type === "club_vacancy" && (!profile?.clubId || !["owner", "captain"].includes(profile.role))) { setNotice("Vincule seu clube e entre como dono ou capitão para anunciar uma vaga."); return; } const formElement = event.currentTarget; const form = new FormData(formElement); const minimumOvr = Number(form.get("minimumOvr") || 0) || undefined; setBusy(true); setNotice(""); try { const created = await publishTransferPost({ type, title: String(form.get("title")), owner: type === "club_vacancy" ? profile?.clubName || "" : String(form.get("owner")), position: String(form.get("position")), minimumOvr, platform: String(form.get("platform")), availability: String(form.get("availability")), contact: String(form.get("contact")) }); setPosts((current) => [created, ...current.filter((post) => post.id !== created.id)]); formElement.reset(); setNotice("Anúncio publicado para toda a comunidade."); } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível publicar o anúncio."); } finally { setBusy(false); } }

  async function apply(post: TransferPost) {
    if (!user) { setNotice("Entre na sua conta para se candidatar."); return; }
    setActionBusy(post.id); setNotice("");
    try { await applyToTransferPost(post.id); setPosts((current) => current.map((item) => item.id === post.id ? { ...item, hasApplied: true, applicationCount: (item.applicationCount || 0) + 1 } : item)); setNotice(`Candidatura enviada para ${post.owner}.`); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível enviar a candidatura."); }
    finally { setActionBusy(null); }
  }

  async function toggleCandidates(post: TransferPost) {
    if (expandedId === post.id) { setExpandedId(null); return; }
    setExpandedId(post.id); setActionBusy(post.id);
    try { const next = await getTransferApplications(post.id); setApplications((current) => ({ ...current, [post.id]: next })); }
    catch { setNotice("Não foi possível carregar os candidatos."); }
    finally { setActionBusy(null); }
  }

  return <main className="app-shell transfer-page"><PlatformHeader />
    <section className="transfer-hero"><div><small>MERCADO DA COMUNIDADE</small><h1>Encontre seu próximo time</h1><p>Clubes divulgam vagas abertas. Jogadores publicam disponibilidade e posição para receber propostas.</p></div><BriefcaseBusiness /></section>
    <div className="transfer-layout"><form className="transfer-form" id="nova-vaga" onSubmit={submit}><header><div><small>PUBLICAR ANÚNCIO</small><h2>{type === "club_vacancy" ? "Meu clube procura jogador" : "Sou jogador e procuro clube"}</h2></div></header>{!user && <p className="registration-error">Para publicar, <Link href="/entrar">entre na sua conta</Link>.</p>}{user && type === "club_vacancy" && !profile?.clubId && <p className="registration-error">Antes de anunciar uma vaga, <Link href="/cadastro">vincule o seu clube EA</Link>.</p>}<div className="transfer-type"><button className={type === "club_vacancy" ? "active" : ""} type="button" onClick={() => setType("club_vacancy")}><Shield /> Vaga em clube</button><button className={type === "player_search" ? "active" : ""} type="button" onClick={() => setType("player_search")}><UserRoundSearch /> Jogador livre</button></div><label>{type === "club_vacancy" ? "Título da vaga" : "Nome público do jogador"}<input required name="title" placeholder={type === "club_vacancy" ? "Ex.: Procuramos volante" : "Ex.: Gabriel_CDM"} /></label><label>{type === "club_vacancy" ? "Clube vinculado à sua conta" : "Clube atual ou Livre"}<input required name="owner" value={type === "club_vacancy" ? profile?.clubName || "Vincule seu clube" : undefined} readOnly={type === "club_vacancy"} /></label><div className="registration-pair"><label>Posição<select required name="position"><option>Qualquer</option><option>Goleiro</option><option>Defensor</option><option>Meio-campo</option><option>Atacante</option></select></label><label>OVR mínimo<input name="minimumOvr" type="number" min="1" max="99" placeholder="Ex.: 85" /></label></div><label>Plataforma<select required name="platform"><option value="common-gen5">PS5 / Xbox Series / PC</option><option value="common-gen4">PS4 / Xbox One</option><option value="nx">Nintendo Switch</option></select></label><label>Disponibilidade<input required name="availability" placeholder="Ex.: Seg–Qui, 21h às 00h" /></label><label>Contato público<input required name="contact" placeholder="Discord, PSN ou gamertag" /></label><button type="submit" disabled={!user || busy || (type === "club_vacancy" && (!profile?.clubId || !["owner", "captain"].includes(profile.role)))}>{busy ? "Publicando…" : "Publicar no mercado"} <BriefcaseBusiness /></button>{notice && <small className="local-note" role="status">{notice}</small>}</form>
      <section className="transfer-list"><div className="market-title"><div><small>OPORTUNIDADES</small><h2>Mercado de transferências</h2></div><span>{visible.length} anúncios</span></div><div className="match-filters"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todos</button><button className={filter === "club_vacancy" ? "active" : ""} onClick={() => setFilter("club_vacancy")}>Vagas em clubes</button><button className={filter === "player_search" ? "active" : ""} onClick={() => setFilter("player_search")}>Jogadores livres</button></div>{visible.length ? visible.map((post) => <article className="transfer-card actionable" key={post.id}><span>{post.type === "club_vacancy" ? <Shield /> : <UserRoundSearch />}</span><div><small>{post.type === "club_vacancy" ? "CLUBE RECRUTANDO" : "JOGADOR DISPONÍVEL"}{post.plan !== "free" ? ` · ${post.plan.toUpperCase()}` : ""}</small><h3>{post.title}</h3><p>{post.owner}{post.minimumOvr ? ` · OVR ${post.minimumOvr}+` : ""}</p><dl><span><Users /> {post.position}</span><span><Clock3 /> {post.availability}</span></dl></div><aside><small>{post.platform}</small><strong>{post.contact}</strong><time>{new Date(post.createdAt).toLocaleDateString("pt-BR")}</time></aside><footer className="transfer-card-actions">{post.isOwner ? <button type="button" onClick={() => toggleCandidates(post)} disabled={actionBusy === post.id}><Users /> Ver candidatos ({post.applicationCount || 0}) <ChevronDown /></button> : <button type="button" onClick={() => apply(post)} disabled={actionBusy === post.id || post.hasApplied}>{post.hasApplied ? <Check /> : <UserCheck />}{post.hasApplied ? "Candidatura enviada" : "Quero me candidatar"}</button>}</footer>{post.isOwner && expandedId === post.id && <section className="transfer-candidates">{applications[post.id]?.length ? applications[post.id].map((application) => <div key={application.id}><span><UserRoundSearch /></span><div><strong>{application.name}</strong><small>{application.clubName || "Sem clube"} · {application.role}</small><p>{application.message}</p><Link className="candidate-profile-link" href={`/perfil?id=${encodeURIComponent(application.profileId)}`}>Ver perfil na comunidade <ChevronDown /></Link>{application.playerId && <Link className="candidate-player-link" href={`/jogador/${encodeURIComponent(application.playerId)}`}>Estatísticas oficiais EA <ChevronDown /></Link>}</div><aside><b>{application.contact || application.email}</b><small>{new Date(application.createdAt).toLocaleDateString("pt-BR")}</small></aside></div>) : <p>Nenhuma candidatura recebida até agora.</p>}</section>}</article>) : <div className="transfer-empty"><Search /><strong>Nenhum anúncio neste filtro</strong><span>Publique a primeira oportunidade real da comunidade.</span></div>}</section>
    </div><MobileNav /></main>;
}
