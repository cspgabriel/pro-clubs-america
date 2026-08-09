"use client";

import Link from "next/link";
import { CheckCircle2, Clock3, ExternalLink, Link2, Search, ShieldCheck, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { parseEaClubUrl, registrationStorageKey, type TeamRegistration } from "@/lib/community";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";

export function RegistrationPage() {
  const [submitted, setSubmitted] = useState<TeamRegistration | null>(null);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const eaUrl = String(form.get("eaUrl") ?? "").trim();
    const parsed = parseEaClubUrl(eaUrl);
    if (!parsed) { setError("Cole uma URL pública válida de Overview, Integrantes ou Histórico da EA Clubs, contendo clubId e platform."); return; }
    const registration: TeamRegistration = { id: crypto.randomUUID(), responsibleName: String(form.get("responsibleName")), email: String(form.get("email")), clubName: String(form.get("clubName")), eaUrl: parsed.normalizedUrl, clubId: parsed.clubId, platform: parsed.platform, submittedAt: new Date().toISOString(), status: "pending_review" };
    let previous: TeamRegistration[] = [];
    try { previous = JSON.parse(localStorage.getItem(registrationStorageKey) ?? "[]"); } catch { previous = []; }
    localStorage.setItem(registrationStorageKey, JSON.stringify([registration, ...previous.filter((item) => item.clubId !== registration.clubId || item.platform !== registration.platform)]));
    setSubmitted(registration); setError("");
  }

  return <main className="app-shell registration-page"><PlatformHeader />
    <section className="registration-hero"><div><small>ENTRE PARA A COMUNIDADE</small><h1>Cadastre seu time</h1><p>Vincule um responsável ao clube público da EA. Após a validação, os dados esportivos entram nos diretórios e rankings da comunidade.</p></div><UserPlus /></section>
    <div className="registration-layout">
      {submitted ? <section className="registration-success"><CheckCircle2 /><small>SOLICITAÇÃO RECEBIDA</small><h2>{submitted.clubName}</h2><p>Clube EA ID <b>{submitted.clubId}</b> registrado para análise. A previsão exibida pela plataforma é de indexação em até 24 horas após uma coleta válida.</p><div><Clock3 /><span>STATUS ATUAL<strong>Aguardando validação e coleta</strong></span></div><Link href="/rankings/comunidade">Acompanhar ranking da comunidade</Link></section> : <form className="registration-form" onSubmit={submit}>
        <header><ShieldCheck /><div><small>CADASTRO DE USUÁRIO + TIME</small><h2>Identificação obrigatória</h2></div></header>
        <div className="registration-pair"><label>Nome do responsável<input required name="responsibleName" autoComplete="name" /></label><label>E-mail<input required name="email" type="email" autoComplete="email" /></label></div>
        <label>Nome do time<input required name="clubName" /></label>
        <label>Link público do time na EA Clubs <span>OBRIGATÓRIO</span><div className="url-field"><Link2 /><input required name="eaUrl" type="url" placeholder="https://www.ea.com/pt-br/games/ea-sports-fc/clubs/member-list?clubId=...&platform=common-gen5" /></div></label>
        {error && <p className="registration-error">{error}</p>}
        <label className="registration-consent"><input required type="checkbox" /> Confirmo que este é o link público do meu clube e autorizo a indexação das estatísticas esportivas publicadas pela EA.</label>
        <button type="submit">Enviar para indexação <UserPlus /></button>
      </form>}
      <aside className="registration-help"><Search /><small>NÃO SABE O LINK?</small><h2>Procure seu clube na EA</h2><p>Abra a página pública de Clubs, escolha a plataforma, encontre seu time e copie a URL de Overview, Integrantes ou Histórico.</p><a href="https://www.ea.com/pt-br/games/ea-sports-fc/clubs" target="_blank" rel="noreferrer">Abrir busca/ranking público da EA <ExternalLink /></a><ol><li><span>01</span> Encontre o clube</li><li><span>02</span> Abra a página dele</li><li><span>03</span> Copie a URL completa</li></ol><div className="sla-card"><Clock3 /><span>INDEXAÇÃO<strong>Em até 24 horas*</strong><small>*Após link válido e coleta pública disponível.</small></span></div></aside>
    </div><MobileNav /></main>;
}
