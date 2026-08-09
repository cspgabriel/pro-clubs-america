import Link from "next/link";
import { BarChart3, BriefcaseBusiness, Search, Swords, UserPlus } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { AuthStatus } from "./auth-status";

export function PlatformHeader() {
  return (
    <header className="platform-header">
      <Link className="platform-brand" href="/">
        <span>PA</span><strong>PRO CLUBS AMERICA</strong>
      </Link>
      <nav>
        <Link href="/buscar"><Search size={16} /> Buscar</Link>
        <Link href="/rankings/jogadores/artilharia"><BarChart3 size={16} /> Rankings</Link>
        <Link href="/mercado"><BriefcaseBusiness size={16} /> Mercado</Link>
        <Link href="/partidas"><Swords size={16} /> Partidas</Link>
        <Link href="/cadastro"><UserPlus size={16} /> Cadastrar time</Link>
      </nav>
      <div className="header-actions"><AuthStatus /><ThemeToggle /></div>
    </header>
  );
}
