"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Check, Crown, Sparkles, Zap } from "lucide-react";
import { planCatalog } from "@/lib/plans";
import { CheckoutButton } from "./billing-actions";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";
const icons = { free: Zap, player_pro: Sparkles, club_pro: Crown, club_premium: Crown };

function isIosStoreShell() {
  return /PWAShell/i.test(navigator.userAgent) || /(?:^|;\s*)app-platform=iOS(?:%20|\s)App(?:%20|\s)Store/i.test(document.cookie);
}

export function PlansPage() {
  const iosStoreShell = useSyncExternalStore(() => () => undefined, isIosStoreShell, () => false);

  return <main className="app-shell"><PlatformHeader /><section className="plans-hero"><small>PLANOS DA COMUNIDADE</small><h1>Comece grátis.<br />Evolua com seu clube.</h1><p>{iosStoreShell ? "Planos pagos não estão disponíveis nesta versão do app." : "Pagamento seguro no Stripe pela Web. O acesso fica ligado à mesma conta usada no PWA."}</p></section><section className="plans-grid">{planCatalog.map((plan) => { const Icon = icons[plan.id]; return <article className={plan.featured ? "featured" : ""} key={plan.id}><Icon /><small>{plan.name.toUpperCase()}</small><h2>{plan.monthlyLabel}</h2>{plan.annualLabel && <b className="plan-annual">{plan.annualLabel}</b>}<p>{plan.audience}</p><ul>{plan.features.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul>{plan.id === "free" ? <Link href="/criar-conta">Criar conta grátis</Link> : iosStoreShell ? <div className="plan-checkout-actions"><span>Assinaturas estarão disponíveis em uma atualização futura.</span></div> : <div className="plan-checkout-actions"><CheckoutButton entitlement={plan.id} cadence="monthly" label="Assinar mensal" />{plan.id === "player_pro" && <CheckoutButton entitlement={plan.id} cadence="annual" label="Assinar anual — economize" />}</div>}</article>; })}</section><p className="plans-disclaimer">{iosStoreShell ? "Nesta versão iOS não há compra de conteúdo ou recursos pagos." : "Cobrança recorrente processada pelo Stripe. Cancele ou atualize seus dados a qualquer momento em Minha conta."}</p><MobileNav /></main>;
}
