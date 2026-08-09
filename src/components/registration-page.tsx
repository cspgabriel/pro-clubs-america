"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock3, ExternalLink, Link2, Search, ShieldCheck, UserPlus, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { parseEaClubUrl, type TeamRegistration } from "@/lib/community";
import { countries } from "@/lib/i18n";
import { observeAuth, type AuthUserSnapshot } from "@/lib/auth-client";
import { registerCommunityClub } from "@/lib/community-service";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";

interface IndexedClubOption { id: string; rawClubId: string; name: string; platform: string; crestUrl: string; sourceUrl: string; skillRating: number; rank: number; }

export function RegistrationPage({ indexedClubs }: { indexedClubs: IndexedClubOption[] }) {
  const [submitted, setSubmitted] = useState<TeamRegistration | null>(null);
  const [error, setError] = useState("");
  const [user, setUser] = useState<AuthUserSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [clubQuery, setClubQuery] = useState("");
  const [clubName, setClubName] = useState("");
  const [eaUrl, setEaUrl] = useState("");
  const [selectedClub, setSelectedClub] = useState<IndexedClubOption | null>(null);
  const clubMatches = useMemo(() => {
    const term = clubQuery.trim().toLocaleLowerCase("pt-BR");
    if (term.length < 2) return [];
    return indexedClubs.filter((club) => club.name.toLocaleLowerCase("pt-BR").includes(term) || club.id.includes(term) || club.rawClubId.includes(term)).slice(0, 8);
  }, [clubQuery, indexedClubs]);
  useEffect(() => observeAuth(setUser), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) { setError("Entre ou crie sua conta antes de cadastrar um time."); return; }
    const form = new FormData(event.currentTarget);
    const submittedEaUrl = String(form.get("eaUrl") ?? "").trim();
    const parsed = parseEaClubUrl(submittedEaUrl);
    if (!parsed) { setError("Cole uma URL pública válida de Overview, Integrantes ou Histórico da EA Clubs, contendo clubId e platform."); return; }
    setBusy(true); setError("");
    try {
      const registration = await registerCommunityClub({ responsibleName: String(form.get("responsibleName")), email: String(form.get("email")), clubName: String(form.get("clubName")), country: String(form.get("country")), eaUrl: parsed.normalizedUrl, clubId: parsed.clubId, platform: parsed.platform });
      setSubmitted(registration);
    } catch { setError("Não foi possível vincular o clube. Verifique se sua conta já possui um time ou tente novamente."); }
    finally { setBusy(false); }
  }

  return <main className="app-shell registration-page"><PlatformHeader />
    <section className="registration-hero"><div><small>ENTRE PARA A COMUNIDADE</small><h1>Cadastre seu time</h1><p>Vincule um responsável ao clube público da EA. Após a validação, os dados esportivos entram nos diretórios e rankings da comunidade.</p></div><UserPlus /></section>
    <div className="registration-layout">
      {submitted ? <section className="registration-success"><CheckCircle2 /><small>SOLICITAÇÃO RECEBIDA</small><h2>{submitted.clubName}</h2><p>Clube EA ID <b>{submitted.clubId}</b> registrado para análise. A previsão exibida pela plataforma é de indexação em até 24 horas após uma coleta válida.</p><div><Clock3 /><span>STATUS ATUAL<strong>Aguardando validação e coleta</strong></span></div><Link href="/rankings/times">Acompanhar ranking de times</Link></section> : <form className="registration-form" onSubmit={submit}>
        <header><ShieldCheck /><div><small>CADASTRO DE USUÁRIO + TIME</small><h2>Identificação obrigatória</h2></div></header>
        {!user && <p className="registration-error">Você precisa <Link href="/entrar">entrar ou criar uma conta</Link> antes de vincular o clube.</p>}
        <div className="registration-pair"><label>Nome do responsável<input required name="responsibleName" autoComplete="name" defaultValue={user?.name ?? ""} /></label><label>E-mail<input required name="email" type="email" autoComplete="email" defaultValue={user?.email ?? ""} /></label></div>
        <label className="indexed-club-search">Seu clube já está indexado?<div className="url-field"><Search /><input value={clubQuery} onChange={(event) => { setClubQuery(event.target.value); setSelectedClub(null); }} placeholder="Busque pelo nome ou ID do clube" /></div>{clubMatches.length > 0 && !selectedClub && <div className="indexed-club-results">{clubMatches.map((club) => <button type="button" onClick={() => { setSelectedClub(club); setClubQuery(club.name); setClubName(club.name); setEaUrl(club.sourceUrl); }} key={`${club.platform}-${club.rawClubId}`}><Image src={club.crestUrl} alt="" width={38} height={38} unoptimized /><span><strong>{club.name}</strong><small>{club.platform} · ID {club.rawClubId} · SR {club.skillRating || "—"}</small></span></button>)}</div>}{selectedClub && <div className="selected-indexed-club"><Image src={selectedClub.crestUrl} alt={`Escudo ${selectedClub.name}`} width={44} height={44} unoptimized /><span><small>CLUBE INDEXADO SELECIONADO</small><strong>{selectedClub.name}</strong><b>EA ID {selectedClub.rawClubId} · {selectedClub.platform}</b></span><button type="button" onClick={() => { setSelectedClub(null); setClubQuery(""); setClubName(""); setEaUrl(""); }} aria-label="Remover seleção"><X /></button></div>}</label>
        <div className="registration-pair"><label>Nome do time<input required name="clubName" value={clubName} onChange={(event) => setClubName(event.target.value)} /></label><label>País do clube<select required name="country" defaultValue="brasil">{countries.map((country) => <option value={country.slug} key={country.code}>{country.flag} {country.name.pt}</option>)}</select></label></div>
        <label>Link público do time na EA Clubs <span>OBRIGATÓRIO</span><div className="url-field"><Link2 /><input required name="eaUrl" type="url" value={eaUrl} onChange={(event) => setEaUrl(event.target.value)} placeholder="https://www.ea.com/pt-br/games/ea-sports-fc/clubs/member-list?clubId=...&platform=common-gen5" /></div></label>
        {error && <p className="registration-error">{error}</p>}
        <label className="registration-consent"><input required type="checkbox" /> Confirmo que este é o link público do meu clube e autorizo a indexação das estatísticas esportivas publicadas pela EA.</label>
        <button type="submit" disabled={!user || busy}>{busy ? "Enviando…" : "Enviar para indexação"} <UserPlus /></button>
      </form>}
      <aside className="registration-help"><Search /><small>NÃO SABE O LINK?</small><h2>Procure seu clube na EA</h2><p>Abra a página pública de Clubs, escolha a plataforma, encontre seu time e copie a URL de Overview, Integrantes ou Histórico.</p><a href="https://www.ea.com/pt-br/games/ea-sports-fc/clubs" target="_blank" rel="noreferrer">Abrir busca/ranking público da EA <ExternalLink /></a><ol><li><span>01</span> Encontre o clube</li><li><span>02</span> Abra a página dele</li><li><span>03</span> Copie a URL completa</li></ol><div className="sla-card"><Clock3 /><span>INDEXAÇÃO<strong>Em até 24 horas*</strong><small>*Após link válido e coleta pública disponível.</small></span></div></aside>
    </div><MobileNav /></main>;
}
