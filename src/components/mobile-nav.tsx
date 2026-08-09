"use client";

import Link from "next/link";
import { BarChart3, BriefcaseBusiness, Home, Plus, Search, ShieldPlus, Swords, UserPlus, X } from "lucide-react";
import { useState } from "react";

const actions = [
  { href: "/mercado#nova-vaga", icon: BriefcaseBusiness, title: "Divulgar nova vaga", text: "Clube procurando jogador" },
  { href: "/mercado?tipo=jogador#nova-vaga", icon: UserPlus, title: "Jogador procurando clube", text: "Publicar disponibilidade" },
  { href: "/partidas#buscar-amistoso", icon: Swords, title: "Criar novo amistoso", text: "Buscar ou desafiar adversário" },
  { href: "/cadastro", icon: ShieldPlus, title: "Cadastrar meu time", text: "Vincular URL pública da EA" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return <>
    <nav className="mobile-nav" aria-label="Navegação do aplicativo">
      <Link href="/"><Home /><span>Início</span></Link>
      <Link href="/buscar"><Search /><span>Buscar</span></Link>
      <button className="mobile-market-action" type="button" onClick={() => setOpen(true)} aria-label="Criar novo"><Plus /><span>Novo</span></button>
      <Link href="/rankings/artilharia"><BarChart3 /><span>Rankings</span></Link>
      <Link href="/partidas"><Swords /><span>Partidas</span></Link>
    </nav>
    {open && <div className="create-sheet" role="dialog" aria-modal="true" aria-label="Criar novo">
      <button className="create-sheet-backdrop" onClick={() => setOpen(false)} aria-label="Fechar menu" />
      <section><header><div><small>PUBLICAR NA COMUNIDADE</small><h2>Criar novo</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Fechar"><X /></button></header>
        <nav>{actions.map((action) => { const Icon = action.icon; return <Link href={action.href} onClick={() => setOpen(false)} key={action.title}><Icon /><span><strong>{action.title}</strong><small>{action.text}</small></span></Link>; })}</nav>
      </section>
    </div>}
  </>;
}
