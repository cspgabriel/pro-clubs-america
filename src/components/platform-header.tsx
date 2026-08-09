import Link from "next/link";
import { BarChart3, BriefcaseBusiness, Search, Swords, UserPlus } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function PlatformHeader() {
  return (
    <header className="platform-header">
      <Link className="platform-brand" href="/">
        <span>CB</span><strong>CLUBS BRASIL</strong>
      </Link>
      <nav>
        <Link href="/buscar"><Search size={16} /> Buscar</Link>
        <Link href="/rankings/artilharia"><BarChart3 size={16} /> Rankings</Link>
        <Link href="/mercado"><BriefcaseBusiness size={16} /> Mercado</Link>
        <Link href="/partidas"><Swords size={16} /> Partidas</Link>
        <Link href="/cadastro"><UserPlus size={16} /> Cadastrar time</Link>
      </nav>
      <ThemeToggle />
    </header>
  );
}
