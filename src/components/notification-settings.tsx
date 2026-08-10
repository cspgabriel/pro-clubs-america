"use client";

import { Bell, BellOff, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getPushConfig, removePushSubscription, savePushSubscription, sendPushTest } from "@/lib/community-service";

type PushState = "checking" | "unsupported" | "off" | "denied" | "on";

function applicationServerKey(value: string) {
  const padded = `${value}${"=".repeat((4 - value.length % 4) % 4)}`.replaceAll("-", "+").replaceAll("_", "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function NotificationSettings() {
  const [state, setState] = useState<PushState>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.resolve().then(() => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) { setState("unsupported"); return; }
      if (Notification.permission === "denied") { setState("denied"); return; }
      navigator.serviceWorker.ready.then((registration) => registration.pushManager.getSubscription()).then((subscription) => setState(subscription ? "on" : "off")).catch(() => setState("off"));
    });
  }, []);

  async function enable() {
    setBusy(true); setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState(permission === "denied" ? "denied" : "off"); return; }
      const [registration, config] = await Promise.all([navigator.serviceWorker.ready, getPushConfig()]);
      const current = await registration.pushManager.getSubscription();
      const subscription = current || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(config.publicKey) });
      await savePushSubscription(subscription.toJSON());
      await sendPushTest();
      setState("on"); setMessage("Ativadas. Enviamos uma notificação de teste.");
    } catch { setMessage("Não foi possível ativar agora. Verifique a permissão do navegador."); }
    finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true); setMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) { await removePushSubscription(subscription.endpoint); await subscription.unsubscribe(); }
      setState("off"); setMessage("Notificações desativadas neste aparelho.");
    } catch { setMessage("Não foi possível desativar agora."); }
    finally { setBusy(false); }
  }

  return <article className="notification-card">
    <header>{state === "on" ? <CheckCircle2 /> : <Bell />}<span>NOTIFICAÇÕES PWA</span></header>
    <h2>{state === "on" ? "Alertas ativados" : "Não perca um desafio"}</h2>
    <p>Receba gratuitamente avisos de convites, partidas e novidades do seu clube, mesmo com o app fechado.</p>
    {state === "unsupported" ? <span className="notification-message"><BellOff /> Este navegador não oferece Web Push.</span> : state === "denied" ? <span className="notification-message"><BellOff /> Libere as notificações nas configurações do navegador.</span> : <button type="button" disabled={busy || state === "checking"} onClick={state === "on" ? disable : enable}>{busy || state === "checking" ? "Verificando…" : state === "on" ? "Desativar neste aparelho" : "Ativar notificações grátis"}</button>}
    {message && <small>{message}</small>}
  </article>;
}
