"use client";

import Image from "next/image";
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
    catch (error) { setMessage(error instanceof Error && error.message.includes("popup-closed") ? "A janela do Google foi fechada antes da conclusão." : "Não foi possível entrar com Google. Confira se pop-ups estão liberados e tente novamente."); }
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
    <section className="auth-pitch"><Image className="auth-pitch-bg" src="/brand/home-stadium.png" alt="Estádio iluminado" fill sizes="(max-width: 800px) 100vw, 55vw" priority /><span className="auth-pitch-overlay" /><div className="auth-pitch-content"><BrandLogo size={112} className="auth-brand-logo" /><small>PRO CLUBS AMERICA</small><h1>Seu clube.<br />Seu próximo jogo.</h1><p>Uma identidade para encontrar adversários, fortalecer o elenco e transformar desempenho em reconhecimento.</p><div className="auth-trust"><ShieldCheck /><span>Conta vinculada ao seu clube<strong>Desafios, mercado e estatísticas em um só lugar</strong></span></div></div></section>
    <form className="auth-card" onSubmit={submit}><small>{copy.eyebrow}</small><h2>{copy.title}</h2><p>{copy.text}</p>
      {!isFirebaseConfigured && <div className="demo-badge"><CheckCircle2 /> Firebase indisponível neste ambiente</div>}
      {mode !== "reset" && <button className="google-button" type="button" onClick={google} disabled={busy || !isFirebaseConfigured}><svg className="google-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.32 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.64-2.42l-3.24-2.54c-.9.6-2.05.96-3.4.96-2.6 0-4.81-1.76-5.6-4.13H3.05v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.87A6 6 0 0 1 6.08 12c0-.65.11-1.28.32-1.87V7.51H3.05A10 10 0 0 0 2 12c0 1.61.39 3.14 1.05 4.49l3.35-2.62Z"/><path fill="#EA4335" d="M12 6c1.47 0 2.8.51 3.84 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.95 5.51l3.35 2.62C7.19 7.76 9.4 6 12 6Z"/></svg> Continuar com Google</button>}
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
