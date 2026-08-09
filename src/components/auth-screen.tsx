"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { isFirebaseConfigured, loginWithEmail, loginWithGoogle, registerWithEmail, requestPasswordReset } from "@/lib/auth-client";
import { MobileNav } from "./mobile-nav";
import { BrandLogo } from "./brand-logo";
import { PlatformHeader } from "./platform-header";

export function AuthScreen({ mode }: { mode: "login" | "register" | "reset" }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function google() {
    setBusy(true); setMessage("");
    try { await loginWithGoogle(); router.push(mode === "register" ? "/onboarding" : "/inicio"); }
    catch { setMessage("Não foi possível entrar com Google. Tente novamente."); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    try {
      if (mode === "reset") { await requestPasswordReset(email); setMessage("Confira seu e-mail para redefinir a senha."); }
      else if (mode === "register") { await registerWithEmail(String(form.get("name") ?? ""), email, password); router.push("/onboarding"); }
      else { await loginWithEmail(email, password); router.push("/inicio"); }
    } catch { setMessage("Não foi possível concluir. Confira os dados e tente novamente."); }
    finally { setBusy(false); }
  }

  const copy = mode === "login"
    ? { eyebrow: "BEM-VINDO DE VOLTA", title: "Entre na sua conta", text: "Aceite desafios, represente seu time e publique no mercado." }
    : mode === "register"
      ? { eyebrow: "FAÇA PARTE", title: "Crie sua conta", text: "Vincule seu perfil a um clube público da EA Clubs." }
      : { eyebrow: "RECUPERAR ACESSO", title: "Redefina sua senha", text: "Enviaremos as instruções para o e-mail cadastrado." };

  return <main className="app-shell auth-page"><PlatformHeader /><div className="auth-layout">
    <section className="auth-pitch"><BrandLogo size={112} className="auth-brand-logo" /><small>PRO CLUBS AMERICA</small><h1>Uma conta.<br />Toda a comunidade.</h1><p>Amistosos, rankings, mercado e estatísticas oficiais em uma identidade única.</p><div><ShieldCheck /><span>Conta vinculada ao time<strong>Aceites e publicações identificados</strong></span></div></section>
    <form className="auth-card" onSubmit={submit}><small>{copy.eyebrow}</small><h2>{copy.title}</h2><p>{copy.text}</p>
      {!isFirebaseConfigured && <div className="demo-badge"><CheckCircle2 /> Firebase indisponível neste ambiente</div>}
      {mode !== "reset" && <button className="google-button" type="button" onClick={google} disabled={busy || !isFirebaseConfigured}><b>G</b> Continuar com Google</button>}
      {mode !== "reset" && <div className="auth-divider"><span>ou continue com e-mail</span></div>}
      {mode === "register" && <label>Nome ou gamertag<input required name="name" autoComplete="name" /></label>}
      <label>E-mail<div className="auth-input"><Mail /><input required type="email" name="email" autoComplete="email" placeholder="voce@email.com" /></div></label>
      {mode !== "reset" && <label>Senha<div className="auth-input"><LockKeyhole /><input required minLength={6} type={showPassword ? "text" : "password"} name="password" autoComplete={mode === "register" ? "new-password" : "current-password"} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>}
      {mode === "register" && <label className="auth-consent"><input required type="checkbox" /> Aceito os termos da comunidade e a política de privacidade.</label>}
      <button className="auth-submit" disabled={busy || !isFirebaseConfigured} type="submit">{busy ? "Aguarde…" : mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Enviar recuperação"}<ArrowRight /></button>
      {message && <p className="auth-message" role={message.startsWith("Não") ? "alert" : "status"}>{message}</p>}
      <footer>{mode === "login" ? <><Link href="/recuperar-senha">Esqueci minha senha</Link><span>Não tem conta? <Link href="/criar-conta">Criar agora</Link></span></> : mode === "register" ? <span>Já tem conta? <Link href="/entrar">Entrar</Link></span> : <Link href="/entrar">Voltar para entrar</Link>}</footer>
    </form>
  </div><MobileNav /></main>;
}
