"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Globe2, LogOut, Shield, UserRound } from "lucide-react";
import { getStoredAuthUser, logout, observeAuth, type AuthUserSnapshot } from "@/lib/auth-client";
import { countries, locales, regionalPreferenceKey } from "@/lib/i18n";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";

export function AccountPage() {
  const router = useRouter(); const [user, setUser] = useState<AuthUserSnapshot | null>(null);
  useEffect(() => observeAuth(setUser), []);
  async function exit() { await logout(); router.push("/"); }
  return <main className="app-shell"><PlatformHeader /><section className="account-hero"><UserRound /><div><small>MINHA CONTA</small><h1>{user?.name ?? "Você ainda não entrou"}</h1><p>{user?.email ?? "Entre para aceitar desafios e representar seu clube."}</p></div></section><div className="account-grid">{user ? <><article><header><CheckCircle2 /><span>SESSÃO ATIVA</span></header><h2>Perfil da comunidade</h2><dl><div><dt>Provedor</dt><dd>{user.provider}</dd></div><div><dt>ID</dt><dd>{user.uid}</dd></div></dl><Link href="/onboarding">Editar país e idioma <ArrowRight /></Link></article><article><header><Shield /><span>MEU CLUBE</span></header><h2>Vincule um time EA</h2><p>O vínculo público permite publicar e aceitar desafios em nome do clube.</p><Link href="/cadastro">Cadastrar meu time <ArrowRight /></Link></article><button className="account-logout" onClick={exit}><LogOut /> Sair da conta</button></> : <article><h2>Identificação necessária</h2><p>Crie uma conta ou entre com Google/e-mail.</p><Link href="/entrar">Entrar <ArrowRight /></Link></article>}</div><MobileNav /></main>;
}

export function OnboardingPage() {
  const router = useRouter(); const [user] = useState(() => getStoredAuthUser()); const [country, setCountry] = useState("brasil"); const [locale, setLocale] = useState("pt-br"); const [role, setRole] = useState("player");
  function submit(event: FormEvent) { event.preventDefault(); localStorage.setItem(regionalPreferenceKey, JSON.stringify({ country, locale, role })); router.push(`/${locale}/comunidade/${country}`); }
  return <main className="app-shell"><PlatformHeader /><div className="onboarding-layout"><section><Globe2 /><small>PERSONALIZE SUA EXPERIÊNCIA</small><h1>Onde você joga?</h1><p>Usaremos país, idioma e função no clube para preparar sua comunidade. Permissões críticas dependerão de validação no servidor.</p></section><form onSubmit={submit}><span>01 DE 02</span><h2>Olá, {user?.name ?? "jogador"}</h2><label>País da comunidade<select value={country} onChange={(event) => setCountry(event.target.value)}>{countries.map((item) => <option value={item.slug} key={item.code}>{item.flag} {item.name.pt}</option>)}</select></label><label>Idioma<select value={locale} onChange={(event) => setLocale(event.target.value)}>{locales.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label><label>Função no clube<select value={role} onChange={(event) => setRole(event.target.value)}><option value="player">Jogador</option><option value="captain">Capitão</option><option value="owner">Dono do clube</option><option value="visitor">Visitante</option></select></label><button type="submit">Continuar para a comunidade <ArrowRight /></button><Link href="/cadastro">Já quero vincular meu clube</Link></form></div><MobileNav /></main>;
}
