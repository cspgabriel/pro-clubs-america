"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, CalendarCheck, CheckCircle2, Globe2, LogOut, Mail, Settings2, Shield, UserRound, Users } from "lucide-react";
import { logout, observeAuth, type AuthUserSnapshot } from "@/lib/auth-client";
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
  const trialActive = Boolean(profile?.premiumAccess && profile.plan === "free");
  const planLabel = profile?.plan === "club_premium" ? "Premium Pro" : profile?.plan === "club_pro" ? "Clube Pro" : profile?.plan === "player_pro" ? "Jogador Pro" : trialActive ? "Premium · teste grátis" : "Gratuito";
  useEffect(() => observeAuth((value) => { setUser(value); if (value) getCommunityProfile().then(setProfile).catch(() => setProfile(null)); else setProfile(null); }), []);
  async function exit() { await logout(); router.push("/"); }
  return <main className="app-shell"><PlatformHeader /><section className="account-hero professional"><span className="account-avatar">{(user?.name ?? "J").slice(0, 1).toUpperCase()}</span><div><small>MINHA CONTA</small><h1>{user?.name ?? "Você ainda não entrou"}</h1><p>{user?.email ?? "Entre para aceitar desafios e representar seu clube."}</p></div></section><div className="account-grid professional">{user ? <>
    <article className="account-profile-card"><header><CheckCircle2 /><span>CONTA VERIFICADA</span></header><div className="account-identity"><span>{user.name.slice(0, 1).toUpperCase()}</span><div><h2 className="profile-country-title">{user.name} <CountryFlag country={profile?.country} /></h2><p><Mail /> {user.email}</p></div></div><dl><div><dt>Perfil</dt><dd>{profile?.role === "owner" ? "Dono" : profile?.role === "captain" ? "Capitão" : profile?.role === "player" ? "Jogador" : "Visitante"}</dd></div><div><dt>Plano</dt><dd>{planLabel}</dd></div>{profile?.bonusAccessUntil && <div><dt>Premium ativo até</dt><dd>{new Date(profile.bonusAccessUntil).toLocaleDateString("pt-BR")}</dd></div>}</dl><div className="account-card-actions"><Link href="/onboarding"><Settings2 /> País e idioma <ArrowRight /></Link>{profile?.plan === "player_pro" || profile?.plan === "club_pro" ? <BillingPortalButton /> : <Link href="/planos"><CalendarCheck /> {profile?.plan === "club_premium" ? "Ver benefícios Premium" : "Conhecer planos"} <ArrowRight /></Link>}</div></article>
    <article className="account-club-card"><header><Shield /><span>MEU CLUBE</span></header><h2 className="profile-country-title">{profile?.clubName ?? profile?.pendingClubName ?? "Vincule um time EA"}<CountryFlag country={profile?.country} /></h2><p>{profile?.clubId ? `Você faz parte deste clube como ${profile.role === "owner" ? "dono" : profile.role === "captain" ? "capitão" : "jogador"}.` : profile?.pendingClubId ? "O vínculo está sendo concluído automaticamente." : "Vincule o clube para aceitar desafios e convidar integrantes do elenco."}</p><div className="account-card-actions">{profile?.clubId && <Link href="/conta/time"><Users /> Gerenciar time <ArrowRight /></Link>}<Link href={profile?.clubId ? `/club/${profile.clubId}` : profile?.pendingClubId ? "/conta" : "/cadastro"}>{profile?.clubId ? "Abrir página do clube" : profile?.pendingClubId ? "Atualizar vínculo" : "Cadastrar meu time"} <ArrowRight /></Link></div></article>
    <button className="account-logout" onClick={exit}><LogOut /> Sair da conta</button>
  </> : <article><h2>Identificação necessária</h2><p>Crie uma conta ou entre com Google/e-mail.</p><Link href="/entrar">Entrar <ArrowRight /></Link></article>}</div><MobileNav /></main>;
}

export function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUserSnapshot | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [country, setCountry] = useState("brasil");
  const [locale, setLocale] = useState("pt-br");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => observeAuth((value) => { setUser(value); setAuthReady(true); if (!value) router.replace("/entrar"); else getCommunityProfile().then((profile) => { if (profile) { setCountry(profile.country || "brasil"); setLocale(profile.locale || "pt-br"); } }).catch(() => undefined); }), [router]);
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(""); try { await saveCommunityPreferences({ country, locale }); router.push("/inicio"); } catch { setError("Não foi possível salvar seu perfil. Entre novamente e tente de novo."); } finally { setBusy(false); } }
  if (!authReady || !user) return <main className="member-home-loading"><UserRound /><span>Carregando sua conta…</span></main>;
  return <main className="app-shell"><PlatformHeader /><div className="onboarding-layout"><section><Globe2 /><small>PERSONALIZE SUA EXPERIÊNCIA</small><h1>Onde você joga?</h1><p>País e idioma ficam sincronizados na sua conta. Cargos de dono e capitão são concedidos pelo vínculo real com o clube.</p></section><form onSubmit={submit}><span>PERFIL FIREBASE</span><h2>Olá, {user.name}</h2><label>País da comunidade<select value={country} onChange={(event) => setCountry(event.target.value)}>{countries.map((item) => <option value={item.slug} key={item.code}>{item.flag} {item.name.pt}</option>)}</select></label><label>Idioma<select value={locale} onChange={(event) => setLocale(event.target.value)}>{locales.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>{error && <p className="registration-error">{error}</p>}<button disabled={busy} type="submit">{busy ? "Salvando…" : "Continuar para a comunidade"} <ArrowRight /></button><Link href="/cadastro">Já quero vincular meu clube</Link></form></div><MobileNav /></main>;
}
