"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreditCard, ExternalLink, LoaderCircle } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase";
import type { EntitlementId } from "@/lib/plans";

async function billingRequest(path: string, body?: unknown) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase não está configurado neste ambiente.");
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error("AUTH_REQUIRED");
  const token = await auth.currentUser.getIdToken(true);
  const response = await fetch(path, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json() as { url?: string; error?: string };
  if (!response.ok || !payload.url) throw new Error(payload.error ?? "Não foi possível abrir o Stripe.");
  window.location.assign(payload.url);
}

export function CheckoutButton({ entitlement, cadence, label }: { entitlement: EntitlementId; cadence: "monthly" | "annual"; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function checkout() {
    setBusy(true);
    setError("");
    try {
      await billingRequest("/api/billing/checkout", { entitlement, cadence });
    } catch (caught) {
      if (caught instanceof Error && caught.message === "AUTH_REQUIRED") {
        router.push("/entrar?next=/planos");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Não foi possível iniciar o pagamento.");
      setBusy(false);
    }
  }

  return <div className="billing-action"><button type="button" onClick={checkout} disabled={busy}>{busy ? <LoaderCircle className="billing-spinner" /> : <CreditCard />}{busy ? "Abrindo checkout…" : label}</button>{error && <small role="alert">{error}</small>}</div>;
}

export function BillingPortalButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function openPortal() {
    setBusy(true);
    setError("");
    try {
      await billingRequest("/api/billing/portal");
    } catch (caught) {
      if (caught instanceof Error && caught.message === "AUTH_REQUIRED") router.push("/entrar?next=/conta");
      else setError(caught instanceof Error ? caught.message : "Não foi possível abrir a assinatura.");
      setBusy(false);
    }
  }

  return <div className="billing-action billing-portal"><button type="button" onClick={openPortal} disabled={busy}>{busy ? <LoaderCircle className="billing-spinner" /> : <ExternalLink />}{busy ? "Abrindo Stripe…" : "Gerenciar assinatura"}</button>{error && <small role="alert">{error}</small>}</div>;
}
