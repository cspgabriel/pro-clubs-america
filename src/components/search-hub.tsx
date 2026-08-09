import Link from "next/link";
import { ArrowRight, Search, Shield, Users } from "lucide-react";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";

export function SearchHub({ clubCount, playerCount }: { clubCount: number; playerCount: number }) {
  return <main className="app-shell search-hub"><PlatformHeader /><section className="directory-hero"><div><small>BUSCA DA COMUNIDADE</small><h1>O que você procura?</h1><p>Escolha um diretório. Clubes e jogadores têm páginas independentes, filtros e resultados próprios.</p></div><Search /></section><div className="search-hub-grid"><Link href="/clubes"><span><Shield /></span><small>DIRETÓRIO 01</small><h2>Buscar clubes</h2><p>Pesquise por nome ou EA Club ID entre {clubCount} times indexados.</p><b>Abrir clubes <ArrowRight /></b></Link><Link href="/jogadores"><span><Users /></span><small>DIRETÓRIO 02</small><h2>Buscar jogadores</h2><p>Encontre atletas, posições e desempenho entre {playerCount} perfis.</p><b>Abrir jogadores <ArrowRight /></b></Link></div><MobileNav /></main>;
}
