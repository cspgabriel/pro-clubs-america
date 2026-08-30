"use client";

import { useCallback, useEffect, useState } from "react";
import { getPushConfig, removePushSubscription, savePushSubscription, sendPushTest } from "@/lib/community-service";

export type PushState = "checking" | "unsupported" | "off" | "denied" | "on";

function applicationServerKey(value: string) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`.replaceAll("-", "+").replaceAll("_", "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

/** Estado e acoes de Web Push. Compartilhado entre /conta e os prompts contextuais. */
export function usePush() {
  const [state, setState] = useState<PushState>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.resolve().then(() => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) { setState("unsupported"); return; }
      if (Notification.permission === "denied") { setState("denied"); return; }
      navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((subscription) => setState(subscription ? "on" : "off"))
        .catch(() => setState("off"));
    });
  }, []);

  const enable = useCallback(async (options: { withTest?: boolean } = {}) => {
    setBusy(true); setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState(permission === "denied" ? "denied" : "off"); return false; }
      const [registration, config] = await Promise.all([navigator.serviceWorker.ready, getPushConfig()]);
      const current = await registration.pushManager.getSubscription();
      const subscription = current || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(config.publicKey) });
      await savePushSubscription(subscription.toJSON());
      if (options.withTest) await sendPushTest();
      setState("on");
      setMessage(options.withTest ? "Ativadas. Enviamos uma notificação de teste." : "Pronto! Avisaremos assim que houver resposta.");
      return true;
    } catch {
      setMessage("Não foi possível ativar agora. Verifique a permissão do navegador.");
      return false;
    } finally { setBusy(false); }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true); setMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) { await removePushSubscription(subscription.endpoint); await subscription.unsubscribe(); }
      setState("off"); setMessage("Notificações desativadas neste aparelho.");
    } catch { setMessage("Não foi possível desativar agora."); }
    finally { setBusy(false); }
  }, []);

  return { state, busy, message, enable, disable };
}
