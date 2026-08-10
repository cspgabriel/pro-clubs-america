"use client";

import Link from "next/link";
import { ExternalLink, Menu, Percent, ShoppingBag, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "./brand-logo";
import { navigationGroups } from "./desktop-sidebar";

export const mobileMenuEvent = "proclubs:open-mobile-menu";

export function openMobileMenu() {
  window.dispatchEvent(new Event(mobileMenuEvent));
}

export function MobileMenuButton({ label = "Menu", className = "" }: { label?: string; className?: string }) {
  return <button type="button" className={className} onClick={openMobileMenu} aria-label="Abrir menu completo"><Menu /><span>{label}</span></button>;
}

export function MobileSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(mobileMenuEvent, show);
    return () => window.removeEventListener(mobileMenuEvent, show);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  return <div className="mobile-sidebar-shell" role="dialog" aria-modal="true" aria-label="Menu completo">
    <button className="mobile-sidebar-backdrop" type="button" onClick={() => setOpen(false)} aria-label="Fechar menu" />
    <aside className="mobile-sidebar-panel">
      <header><Link href="/inicio" onClick={() => setOpen(false)}><BrandLogo size={54} /><span><strong>PRO CLUBS</strong><b>AMERICA</b></span></Link><button type="button" onClick={() => setOpen(false)} aria-label="Fechar"><X /></button></header>
      <nav>{navigationGroups.map((group) => <section key={group.label}><small>{group.label}</small><div>{group.items.map((item) => { const Icon = item.icon; const path = item.href.split("#")[0]; const active = !item.href.includes("#") && pathname === path; return <Link className={`${active ? "active " : ""}nav-tone-${item.tone}`} href={item.href} onClick={() => setOpen(false)} key={item.label}><Icon /><span>{item.label}</span></Link>; })}</div></section>)}</nav>
      <a className="mobile-sidebar-buy" href="https://www.ea.com/pt-br/games/ea-sports-fc/fc-26/buy" target="_blank" rel="noreferrer"><ShoppingBag /><span>Comprar EA FC 26</span><ExternalLink /></a>
      <footer><Percent /><span>EA SPORTS FC 26<strong>common-gen5 e common-gen4</strong></span></footer>
    </aside>
  </div>;
}
