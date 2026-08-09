"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Globe2, LogOut, Shield, UserRound } from "lucide-react";
import { getStoredAuthUser, logout, observeAuth, type AuthUserSnapshot } from "@/lib/auth-client";
import { getCommunityProfile, saveCommunityPreferences, type CommunityProfile } from "@/lib/community-service";
import { countries, locales } from "@/lib/i18n";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";
import { CountryFlag } from "./country-flag";
import { BillingPortalButton } from "./billing-actions";

export function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserSnapshot | null>(null);
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  useEffect(() => observeAuth((value) => { setUser(value); if (value) getCommunityProfile().then(setProfile); else setProfile(null); }), []);
  async function exit() { await logout(); router.push("/"); }
  return <main className="app-shell"><PlatformHeader /><section className="account-hero"><UserRound /><div><small>MINHA CONTA</small><h1>{user?.name ?? "Você ainda não entrou"}</h1><p>{user?.email ?? "Entre para aceitar desafios e representar seu clube."}</p></div></section><div className="account-grid">{user ? <>
    <article><header><CheckCircle2 /><span>SESSÃO FIREBASE ATIVA</span></header><h2 className="profile-country-title">Perfil da comunidade <CountryFlag country={profile?.country} /></h2><dl><div><dt>Função</dt><dd>{profile?.role ?? "visitante"}</dd></div><div><dt>Plano</dt><dd>{profile?.plan ?? "free"}</dd></div><div><dt>ELO</dt><dd>{profile?.elo ?? 1000}</dd></div><div><dt>Confiabilidade</dt><dd>{profile?.reliability ?? 100}%</dd></div></dl><Link href="/onboarding">Editar país e idioma <ArrowRight /></Link>{profile?.plan && profile.plan !== "free" ? <BillingPortalButton /> : <Link href="/planos">Conhecer planos Pro <ArrowRight /></Link>}</article>
    <article><header><Shield /><span>MEU CLUBE</span></header><h2 className="profile-country-title">{profile?.clubName ?? profile?.pendingClubName ?? "Vincule um time EA"}<CountryFlag country={profile?.country} /></h2><p>{profile?.clubId ? `Você representa este clube como ${profile.role}.` : profile?.pendingClubId ? "Solicitação enviada. O vínculo será liberado após a validação da comunidade." : "O vínculo público permite publicar e aceitar desafios em nome do clube."}</p><Link href={profile?.clubId ? `/club/${profile.clubId}` : profile?.pendingClubId ? "/rankings/times" : "/cadastro"}>{profile?.clubId ? "Abrir meu clube" : profile?.pendingClubId ? "Acompanhar validação" : "Cadastrar meu time"} <ArrowRight /></Link></article>
    <button className="account-logout" onClick={exit}><LogOut /> Sair da conta</button>
  </> : <article><h2>Identificação necessária</h2><p>Crie uma conta ou entre com Google/e-mail.</p><Link href="/entrar">Entrar <ArrowRight /></Link></article>}</div><MobileNav /></main>;
}

export function OnboardingPage() {
  const router = useRouter();
  const [user] = useState(() => getStoredAuthUser());
  const [country, setCountry] = useState("brasil");
  const [locale, setLocale] = useState("pt-br");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (!user) router.replace("/entrar"); else getCommunityProfile().then((profile) => { if (profile) { setCountry(profile.country || "brasil"); setLocale(profile.locale || "pt-br"); } }); }, [router, user]);
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(""); try { await saveCommunityPreferences({ country, locale }); router.push("/inicio"); } catch { setError("Não foi possível salvar seu perfil. Entre novamente e tente de novo."); } finally { setBusy(false); } }
  return <main className="app-shell"><PlatformHeader /><div className="onboarding-layout"><section><Globe2 /><small>PERSONALIZE SUA EXPERIÊNCIA</small><h1>Onde você joga?</h1><p>País e idioma ficam sincronizados na sua conta. Cargos de dono e capitão são concedidos pelo vínculo real com o clube.</p></section><form onSubmit={submit}><span>PERFIL FIREBASE</span><h2>Olá, {user?.name ?? "jogador"}</h2><label>País da comunidade<select value={country} onChange={(event) => setCountry(event.target.value)}>{countries.map((item) => <option value={item.slug} key={item.code}>{item.flag} {item.name.pt}</option>)}</select></label><label>Idioma<select value={locale} onChange={(event) => setLocale(event.target.value)}>{locales.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>{error && <p className="registration-error">{error}</p>}<button disabled={busy} type="submit">{busy ? "Salvando…" : "Continuar para a comunidade"} <ArrowRight /></button><Link href="/cadastro">Já quero vincular meu clube</Link></form></div><MobileNav /></main>;
}
