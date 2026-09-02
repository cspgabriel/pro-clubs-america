"use client";

import Link from "next/link";
import { BriefcaseBusiness, Home, Swords, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import { MobileMenuButton } from "./mobile-sidebar";

export function MobileNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || (href !== "/inicio" && pathname.startsWith(href));

  return <nav className="mobile-nav" aria-label="Navegação do aplicativo">
    <Link className={isActive("/inicio") ? "active" : ""} aria-current={isActive("/inicio") ? "page" : undefined} href="/inicio"><Home /><span>Início</span></Link>
    <Link className={isActive("/clubes") ? "active" : ""} aria-current={isActive("/clubes") ? "page" : undefined} href="/clubes"><Users /><span>Comunidade</span></Link>
    <Link className={isActive("/mercado") ? "active" : ""} aria-current={isActive("/mercado") ? "page" : undefined} href="/mercado"><BriefcaseBusiness /><span>Mercado</span></Link>
    <Link className={isActive("/partidas") ? "active" : ""} aria-current={isActive("/partidas") ? "page" : undefined} href="/partidas"><Swords /><span>Partidas</span></Link>
    <MobileMenuButton className="mobile-nav-menu" />
  </nav>;
}
