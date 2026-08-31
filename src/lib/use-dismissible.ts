"use client";

import { useCallback, useSyncExternalStore } from "react";

type Scope = "local" | "session";

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function store(scope: Scope) {
  return scope === "local" ? window.localStorage : window.sessionStorage;
}

/**
 * Le a flag de "dispensado" do storage sem setState em efeito.
 *
 * O snapshot do servidor e `true` de proposito: no HTML estatico o aviso nunca
 * aparece, e so surge apos a hidratacao se o usuario ainda nao dispensou.
 * Evita hydration mismatch e piscada do banner.
 */
export function useDismissible(key: string, scope: Scope = "local") {
  const getSnapshot = useCallback(() => {
    try { return store(scope).getItem(key) === "1"; } catch { return false; }
  }, [key, scope]);

  const dismissed = useSyncExternalStore(subscribe, getSnapshot, () => true);

  const dismiss = useCallback(() => {
    try { store(scope).setItem(key, "1"); } catch { /* modo privado: so nao persiste */ }
    notify();
  }, [key, scope]);

  return [dismissed, dismiss] as const;
}
