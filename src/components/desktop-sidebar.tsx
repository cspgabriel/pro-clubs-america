"use client";

import Link from "next/link";
import { BarChart3, BriefcaseBusiness, Crosshair, Crown, ExternalLink, Globe2, Goal, Handshake, Home, Percent, Search, Shield, ShieldCheck, ShoppingBag, Swords, UserPlus, UserRound, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import { BrandLogo } from "./brand-logo";

export const navigationGroups = [
  { label: "EXPLORAR", items: [
    { href: "/inicio", label: "Início", icon: Home, tone: "gold" },
    { href: "/buscar", label: "Buscar", icon: Search, tone: "cyan" },
    { href: "/clubes", label: "Clubes", icon: Shield, tone: "blue" },
    { href: "/jogadores", label: "Jogadores", icon: Users, tone: "violet" },
  ] },
  { label: "COMPETIÇÃO", items: [
    { href: "/rankings/jogadores/artilharia", label: "Ranking jogadores", icon: Goal, tone: "rose" },
    { href: "/rankings/clubes/artilharia", label: "Ranking clubes", icon: BarChart3, tone: "green" },
    { href: "/rankings/times", label: "Ranking de times", icon: ShieldCheck, tone: "gold" },
    { href: "/partidas", label: "Partidas", icon: Swords, tone: "orange" },
    { href: "/partidas/amistosos", label: "Amistosos", icon: Handshake, tone: "cyan" },
  ] },
  { label: "COMUNIDADE", items: [
    { href: "/mercado", label: "Mercado", icon: BriefcaseBusiness, tone: "violet" },
    { href: "/partidas/amistosos#buscar-amistoso", label: "Marcar amistoso", icon: Crosshair, tone: "rose" },
    { href: "/cadastro", label: "Cadastrar time", icon: UserPlus, tone: "green" },
    { href: "/pt-br/comunidade/brasil", label: "Comunidades por país", icon: Globe2, tone: "blue" },
  ] },
  { label: "CONTA E PLANOS", items: [
    { href: "/conta", label: "Minha conta", icon: UserRound, tone: "cyan" },
    { href: "/planos", label: "Planos", icon: Crown, tone: "gold" },
  ] },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  return <aside className="desktop-sidebar" aria-label="Menu completo">
    <Link className="sidebar-logo" href="/inicio" aria-label="Pro Clubs America"><BrandLogo size={58} /><span>PRO CLUBS AMERICA</span></Link>
    <nav>{navigationGroups.map((group) => <section key={group.label}><small>{group.label}</small>{group.items.map((item) => { const Icon = item.icon; const path = item.href.split("#")[0]; const active = !item.href.includes("#") && pathname === path; return <Link className={`${active ? "active " : ""}nav-tone-${item.tone}`} href={item.href} key={item.label}><Icon /><span>{item.label}</span></Link>; })}</section>)}</nav>
    <a className="sidebar-buy" href="https://www.ea.com/pt-br/games/ea-sports-fc/fc-26/buy" target="_blank" rel="noreferrer"><ShoppingBag /><span>Comprar EA FC 26</span><ExternalLink /></a>
    <div className="sidebar-season"><Percent /><span>EAFC 26<strong>common-gen5</strong></span></div>
  </aside>;
}
