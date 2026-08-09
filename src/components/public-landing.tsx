import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, Check, CheckCircle2, Globe2, Shield, Sparkles, Swords, Trophy, UserPlus, Users } from "lucide-react";
import { planCatalog } from "@/lib/plans";
import { BrandLogo } from "./brand-logo";
import { ThemeToggle } from "./theme-toggle";

interface LandingClub { id: string; name: string; crestUrl: string; skillRating: number; }
interface LandingPlayer { id: string; name: string; clubName: string; goals: number | null; }

export function PublicLanding({ clubs, players, clubCount, playerCount }: { clubs: LandingClub[]; players: LandingPlayer[]; clubCount: number; playerCount: number }) {
  return <main className="public-landing">
    <header className="landing-header">
      <Link href="/" className="landing-brand"><BrandLogo size={52} /><span>PRO CLUBS<strong>AMERICA</strong></span></Link>
      <nav aria-label="Navegação pública"><a href="#recursos">Recursos</a><a href="#como-funciona">Como funciona</a><Link href="/rankings/jogadores/artilharia">Rankings</Link></nav>
      <div><ThemeToggle /><Link className="landing-login" href="/entrar">Entrar</Link><Link className="landing-join" href="/criar-conta">Criar conta <ArrowRight /></Link></div>
    </header>

    <section className="landing-hero">
      <Image src="/brand/home-stadium.png" alt="Jogador fictício em um estádio iluminado" fill priority sizes="100vw" />
      <div className="landing-hero-shade" />
      <div className="landing-hero-copy">
        <span><Sparkles /> A CASA DO PRO CLUBS NA AMÉRICA DO SUL</span>
        <h1>Seu clube merece<br />uma história maior.</h1>
        <p>Encontre adversários, compare estatísticas e coloque seu time no mapa da maior comunidade independente de Pro Clubs da América.</p>
        <div className="landing-hero-actions"><Link href="/criar-conta">Entrar para a comunidade <ArrowRight /></Link><Link href="/clubes">Explorar clubes</Link></div>
        <small><CheckCircle2 /> Conta gratuita · dados públicos da EA · sem placar manual</small>
      </div>
    </section>

    <section className="landing-proof" aria-label="Base indexada">
      <article><strong>{clubCount.toLocaleString("pt-BR")}</strong><span>clubes indexados</span></article>
      <article><strong>{playerCount.toLocaleString("pt-BR")}</strong><span>jogadores na base</span></article>
      <article><strong>12</strong><span>países sul-americanos</span></article>
      <article><strong>EAFC 26</strong><span>common-gen5 e gen4</span></article>
    </section>

    <section className="landing-section landing-resources" id="recursos">
      <header><span>UMA COMUNIDADE, QUATRO VANTAGENS</span><h2>Tudo que seu time precisa para jogar mais.</h2><p>Menos grupos dispersos. Mais partidas, visibilidade e contexto para competir.</p></header>
      <div>
        <Link href="/partidas/amistosos"><Swords /><small>01 · MATCHMAKING</small><h3>Marque amistosos</h3><p>Convide um clube específico ou publique um desafio aberto para a comunidade.</p><b>Buscar adversário <ArrowRight /></b></Link>
        <Link href="/rankings/jogadores/artilharia"><Trophy /><small>02 · PERFORMANCE</small><h3>Compare rankings</h3><p>Artilharia, assistências, desarmes e aproveitamento em páginas dedicadas.</p><b>Ver líderes <ArrowRight /></b></Link>
        <Link href="/mercado"><Users /><small>03 · ELENCO</small><h3>Reforce seu time</h3><p>Publique vagas ou mostre sua disponibilidade no mercado de jogadores.</p><b>Abrir mercado <ArrowRight /></b></Link>
        <Link href="/cadastro"><Shield /><small>04 · IDENTIDADE</small><h3>Cadastre seu clube</h3><p>Vincule o perfil público da EA e apareça na comunidade em até 24 horas.</p><b>Cadastrar clube <ArrowRight /></b></Link>
      </div>
    </section>

    <section className="landing-section landing-preview">
      <div className="landing-preview-copy"><span>DADOS QUE CRIAM REPUTAÇÃO</span><h2>Desempenho que fala pelo seu clube.</h2><p>Os perfis organizam os dados públicos disponíveis para transformar partidas em contexto, rivalidade e descoberta.</p><Link href="/rankings/times">Abrir ranking de times <ArrowRight /></Link></div>
      <div className="landing-leaderboard"><header><BarChart3 /><span>DESTAQUES DA BASE</span></header>{clubs.map((club, index) => <Link href={`/club/${club.id}`} key={club.id}><b>{String(index + 1).padStart(2,"0")}</b><Image src={club.crestUrl} alt="" width={42} height={42} unoptimized /><span><strong>{club.name}</strong><small>Skill Rating</small></span><em>{club.skillRating || "—"}</em></Link>)}</div>
      <div className="landing-scorers"><header><Trophy /><span>ARTILHEIROS</span></header>{players.map((player, index) => <Link href={`/jogador/${encodeURIComponent(player.id)}`} key={player.id}><b>{index + 1}</b><span><strong>{player.name}</strong><small>{player.clubName}</small></span><em>{player.goals ?? "—"} G</em></Link>)}</div>
    </section>

    <section className="landing-section landing-how" id="como-funciona">
      <header><span>COMECE SEM COMPLICAÇÃO</span><h2>Do cadastro ao primeiro desafio.</h2></header>
      <div><article><b>01</b><UserPlus /><h3>Crie sua conta</h3><p>Entre com Google ou e-mail e escolha sua comunidade.</p></article><article><b>02</b><Shield /><h3>Vincule seu clube</h3><p>Informe obrigatoriamente a URL pública do time na EA Clubs.</p></article><article><b>03</b><Swords /><h3>Entre em campo</h3><p>Marque confrontos e acompanhe a publicação oficial do resultado.</p></article></div>
    </section>

    <section className="landing-section landing-pricing" id="planos">
      <header><span>COMECE GRÁTIS, CRESÇA QUANDO FIZER SENTIDO</span><h2>Um plano para cada momento.</h2><p>O acesso será unificado por conta entre Web, iOS e Android. Os preços abaixo são a proposta comercial; o checkout ainda não está ativo.</p></header>
      <div>{planCatalog.map((plan) => <article className={plan.featured ? "featured" : ""} key={plan.id}><small>{plan.name.toUpperCase()}</small><h3>{plan.monthlyLabel}</h3>{plan.annualLabel && <b>{plan.annualLabel}</b>}<p>{plan.audience}</p><ul>{plan.features.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul><Link href={plan.id === "free" ? "/criar-conta" : "/planos"}>{plan.id === "free" ? "Começar grátis" : "Conhecer o plano"}<ArrowRight /></Link></article>)}</div>
    </section>

    <section className="landing-final"><Globe2 /><span>BRASIL · ARGENTINA · CHILE · COLÔMBIA · URUGUAI · PERU · E MAIS</span><h2>Seu próximo rival já pode estar aqui.</h2><p>Crie seu perfil gratuitamente e ajude a construir a comunidade Pro Clubs da América.</p><Link href="/criar-conta">Criar minha conta <ArrowRight /></Link></section>
    <footer className="landing-footer"><BrandLogo size={46} /><p>Plataforma comunitária independente. Sem afiliação ou patrocínio da Electronic Arts Inc.</p><nav><Link href="/clubes">Clubes</Link><Link href="/jogadores">Jogadores</Link><Link href="/entrar">Entrar</Link></nav></footer>
  </main>;
}
