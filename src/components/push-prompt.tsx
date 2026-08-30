"use client";

import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePush } from "@/lib/use-push";

const DISMISS_KEY = "pca:push-prompt-dismissed";

/**
 * Pede a permissao de push no momento de valor (logo apos uma acao que gera
 * resposta de outra pessoa), e nao enterrado em configuracoes.
 * Fica invisivel se o push ja estiver ativo, negado ou dispensado.
 */
export function PushPrompt({ reason, visible }: { reason: string; visible: boolean }) {
  const { state, busy, message, enable } = usePush();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try { setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1"); } catch { setDismissed(false); }
  }, []);

  function dismiss() {
    setDismissed(true);
    try { window.localStorage.setItem(DISMISS_KEY, "1"); } catch { /* modo privado: so nao persiste */ }
  }

  if (!visible || dismissed || state === "on" || state === "denied" || state === "unsupported" || state === "checking") return null;

  return (
    <aside className="push-prompt">
      <Bell />
      <div>
        <strong>Quer ser avisado?</strong>
        <p>{reason}</p>
        {message && <small>{message}</small>}
      </div>
      <button type="button" onClick={() => enable()} disabled={busy}>{busy ? "Ativando…" : "Ativar avisos"}</button>
      <button type="button" className="push-prompt-close" onClick={dismiss} aria-label="Dispensar">
        <X />
      </button>
    </aside>
  );
}
