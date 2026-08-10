"use client";

import Link from "next/link";
import { BriefcaseBusiness, Home, Plus, ShieldPlus, Swords, User, UserPlus, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MobileMenuButton } from "./mobile-sidebar";

const actions = [
  { href: "/mercado#nova-vaga", icon: BriefcaseBusiness, title: "Divulgar nova vaga", text: "Clube procurando jogador" },
  { href: "/mercado?tipo=jogador#nova-vaga", icon: UserPlus, title: "Jogador procurando clube", text: "Publicar disponibilidade" },
  { href: "/partidas/amistosos#buscar-amistoso", icon: Swords, title: "Criar novo amistoso", text: "Buscar ou desafiar adversário" },
  { href: "/cadastro", icon: ShieldPlus, title: "Cadastrar meu time", text: "Vincular URL pública da EA" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || (href !== "/inicio" && pathname.startsWith(href));

  return <>
    <nav className="mobile-nav" aria-label="Navegação do aplicativo">
      <Link className={isActive("/inicio") ? "active" : ""} aria-current={isActive("/inicio") ? "page" : undefined} href="/inicio"><Home /><span>Início</span></Link>
      <MobileMenuButton className="mobile-nav-menu" />
      <button className="mobile-market-action" type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-haspopup="dialog" aria-label="Abrir menu para criar"><Plus /><span>Criar</span></button>
      <Link className={isActive("/partidas") ? "active" : ""} aria-current={isActive("/partidas") ? "page" : undefined} href="/partidas"><Swords /><span>Partidas</span></Link>
      <Link className={isActive("/conta") ? "active" : ""} aria-current={isActive("/conta") ? "page" : undefined} href="/conta"><User /><span>Minha conta</span></Link>
    </nav>
    {open && <div className="create-sheet" role="dialog" aria-modal="true" aria-label="Criar novo">
      <button className="create-sheet-backdrop" onClick={() => setOpen(false)} aria-label="Fechar menu" />
      <section><header><div><small>PUBLICAR NA COMUNIDADE</small><h2>Criar novo</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Fechar"><X /></button></header>
        <nav>{actions.map((action) => { const Icon = action.icon; return <Link href={action.href} onClick={() => setOpen(false)} key={action.title}><Icon /><span><strong>{action.title}</strong><small>{action.text}</small></span></Link>; })}</nav>
      </section>
    </div>}
  </>;
}
