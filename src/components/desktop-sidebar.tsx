"use client";

import Link from "next/link";
import { BarChart3, BriefcaseBusiness, Home, Search, Shield, Swords, UserPlus, Users } from "lucide-react";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Início", icon: Home },
  { href: "/buscar", label: "Buscar", icon: Search },
  { href: "/clubes", label: "Clubes", icon: Shield },
  { href: "/jogadores", label: "Jogadores", icon: Users },
  { href: "/mercado", label: "Mercado", icon: BriefcaseBusiness },
  { href: "/rankings/artilharia", label: "Rankings", icon: BarChart3 },
  { href: "/partidas", label: "Partidas", icon: Swords },
  { href: "/cadastro", label: "Cadastrar", icon: UserPlus },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  return <aside className="desktop-sidebar" aria-label="Navegação lateral">
    <Link className="sidebar-logo" href="/" aria-label="Clubs Brasil">CB</Link>
    <nav>{items.map((item) => { const Icon = item.icon; const active = item.href === "/" ? pathname === "/" : item.href.startsWith("/rankings") ? pathname.startsWith("/rankings") : item.href === "/partidas" ? pathname === "/partidas" || pathname === "/amistosos" : pathname === item.href; return <Link className={active ? "active" : ""} href={item.href} title={item.label} key={item.label}><Icon /><span>{item.label}</span></Link>; })}</nav>
  </aside>;
}
