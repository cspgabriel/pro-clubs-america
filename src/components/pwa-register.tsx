"use client";

import { useEffect } from "react";

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredInstallPrompt: InstallPromptEvent | null = null;

export function canPromptInstall() {
  return Boolean(deferredInstallPrompt);
}

export async function promptInstall() {
  if (!deferredInstallPrompt) return null;
  const prompt = deferredInstallPrompt;
  deferredInstallPrompt = null;
  window.dispatchEvent(new Event("proclubs:install-state"));
  await prompt.prompt();
  return prompt.userChoice;
}

export function PwaRegister() {
  useEffect(() => {
    let refreshing = false;
    const refreshForUpdate = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", refreshForUpdate);
      navigator.serviceWorker.register("/sw.js").then((registration) => registration.update()).catch(() => undefined);
    }
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      deferredInstallPrompt = event as InstallPromptEvent;
      window.dispatchEvent(new Event("proclubs:install-state"));
    };
    const clearPrompt = () => {
      deferredInstallPrompt = null;
      window.dispatchEvent(new Event("proclubs:install-state"));
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", clearPrompt);
    return () => {
      navigator.serviceWorker?.removeEventListener("controllerchange", refreshForUpdate);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", clearPrompt);
    };
  }, []);
  return null;
}
