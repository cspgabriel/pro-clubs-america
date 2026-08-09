"use client";

import Link from "next/link";
import { BarChart3, BriefcaseBusiness, Crosshair, Crown, Goal, Handshake, Home, Percent, Search, Shield, ShieldCheck, Swords, UserPlus, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import { BrandLogo } from "./brand-logo";

const groups = [
  { label: "EXPLORAR", items: [
    { href: "/inicio", label: "Início", icon: Home },
    { href: "/buscar", label: "Buscar", icon: Search },
    { href: "/clubes", label: "Clubes", icon: Shield },
    { href: "/jogadores", label: "Jogadores", icon: Users },
  ] },
  { label: "COMPETIÇÃO", items: [
    { href: "/rankings/jogadores/artilharia", label: "Ranking jogadores", icon: Goal },
    { href: "/rankings/clubes/artilharia", label: "Ranking clubes", icon: BarChart3 },
    { href: "/rankings/times", label: "Ranking de times", icon: ShieldCheck },
    { href: "/partidas", label: "Partidas", icon: Swords },
    { href: "/partidas/amistosos", label: "Amistosos", icon: Handshake },
  ] },
  { label: "COMUNIDADE", items: [
    { href: "/mercado", label: "Mercado", icon: BriefcaseBusiness },
    { href: "/partidas/amistosos#buscar-amistoso", label: "Marcar amistoso", icon: Crosshair },
    { href: "/cadastro", label: "Cadastrar time", icon: UserPlus },
    { href: "/planos", label: "Planos", icon: Crown },
  ] },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  return <aside className="desktop-sidebar" aria-label="Menu completo">
    <Link className="sidebar-logo" href="/inicio" aria-label="Pro Clubs America"><BrandLogo size={58} /><span>PRO CLUBS AMERICA</span></Link>
    <nav>{groups.map((group) => <section key={group.label}><small>{group.label}</small>{group.items.map((item) => { const Icon = item.icon; const path = item.href.split("#")[0]; const active = !item.href.includes("#") && pathname === path; return <Link className={active ? "active" : ""} href={item.href} key={item.label}><Icon /><span>{item.label}</span></Link>; })}</section>)}</nav>
    <div className="sidebar-season"><Percent /><span>EAFC 26<strong>common-gen5</strong></span></div>
  </aside>;
}
