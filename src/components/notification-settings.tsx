"use client";

import { Bell, BellOff, CheckCircle2 } from "lucide-react";
import { usePush } from "@/lib/use-push";

export function NotificationSettings() {
  const { state, busy, message, enable, disable } = usePush();

  return <article className="notification-card">
    <header>{state === "on" ? <CheckCircle2 /> : <Bell />}<span>NOTIFICAÇÕES PWA</span></header>
    <h2>{state === "on" ? "Alertas ativados" : "Não perca um desafio"}</h2>
    <p>Receba gratuitamente avisos de convites, partidas e novidades do seu clube, mesmo com o app fechado.</p>
    {state === "unsupported" ? <span className="notification-message"><BellOff /> Este navegador não oferece Web Push.</span>
      : state === "denied" ? <span className="notification-message"><BellOff /> Libere as notificações nas configurações do navegador.</span>
      : <button type="button" disabled={busy || state === "checking"} onClick={state === "on" ? disable : () => enable({ withTest: true })}>{busy || state === "checking" ? "Verificando…" : state === "on" ? "Desativar neste aparelho" : "Ativar notificações grátis"}</button>}
    {message && <small>{message}</small>}
  </article>;
}
