"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, Gamepad2, Globe2, Search, Shield, Smartphone, Sparkles, Swords, UserRound, Users } from "lucide-react";
import type { CommunityDirectory } from "@/lib/community-service";
import { BrandLogo } from "./brand-logo";
import styles from "./public-home.module.css";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

export function PublicHome() {
  const [directory, setDirectory] = useState<CommunityDirectory>({ clubs: [], members: [] });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const results = useRef<HTMLElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    let active = true;
    fetch("/api/community/profiles", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Directory unavailable");
        const data: CommunityDirectory = await response.json();
        if (!Array.isArray(data.clubs) || !Array.isArray(data.members)) throw new Error("Invalid directory");
        if (active) { setDirectory(data); setStatus("ready"); }
      })
      .catch(() => { if (active) setStatus("error"); })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [attempt]);

  const term = normalize(query.trim());
  const clubs = directory.clubs.filter((club) => normalize(club.name).includes(term));
  const members = directory.members.filter((member) => normalize(`${member.name} ${member.nickname || ""} ${member.club?.name || ""}`).includes(term));
  const visibleClubs = term ? clubs : clubs.slice(0, 4);
  const visibleMembers = term ? members : members.slice(0, 4);
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(input.trim());
    results.current?.focus({ preventScroll: true });
    results.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  return <div className={`public-landing ${styles.page}`}>
    <a className={styles.skip} href="#conteudo">Pular para o conteúdo</a>
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="Pro Clubs America, início"><BrandLogo size={44} /><span>PRO CLUBS<strong>AMERICA</strong></span></Link>
      <nav aria-label="Navegação pública"><a href="#mercado">Mercado</a><a href="#comunidade">Comunidade</a><a href="#amistosos">Amistosos</a></nav>
      <Link href="/entrar" className={styles.login}>Entrar <ArrowUpRight size={16} aria-hidden="true" /></Link>
    </header>
    <main id="conteudo">
      <section className={styles.hero} aria-labelledby="landing-title">
        <div className={styles.heroArt} aria-hidden="true"><Image src="/brand/home-stadium.png" alt="" fill priority sizes="100vw" /></div>
        <div className={styles.heroContent}>
          <span className={styles.pill}><Globe2 size={14} aria-hidden="true" /> A sua comunidade de Clubs</span>
          <h1 id="landing-title">Seu clube merece<br />uma <em>história maior.</em></h1>
          <p>Encontre seu time, conheça jogadores e combine o próximo amistoso. O jogo continua fora de campo.</p>
          <form className={styles.search} onSubmit={search} role="search" aria-label="Buscar na comunidade">
            <label className={styles.searchField}><Search size={21} aria-hidden="true" /><span className={styles.srOnly}>Nome do clube ou jogador</span><input type="search" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Buscar clube ou jogador…" maxLength={100} aria-describedby="search-scope" /></label>
            <button type="submit">Buscar <ArrowRight size={18} aria-hidden="true" /></button>
          </form>
          <small id="search-scope">Explore os cadastros mais recentes da comunidade, sem precisar entrar.</small>
          <div className={styles.heroLinks}><Link href="/criar-conta">Criar meu perfil <ArrowUpRight size={15} aria-hidden="true" /></Link><a href="#comunidade">Conhecer a comunidade <ArrowDown size={15} aria-hidden="true" /></a></div>
        </div>
      </section>
      <div className={styles.container}>
        <section className={styles.market} id="mercado" aria-labelledby="market-title">
          <div className={styles.marketIntro}><span className={styles.eyebrow}><Sparkles size={14} aria-hidden="true" /> MERCADO DE JOGADORES</span><h2 id="market-title">O próximo reforço<br />pode ser <em>você.</em></h2><p>Um lugar para encontrar seu elenco.<br />Ou a peça que falta nele.</p></div>
          <div className={styles.roleGrid}>
            <Link href="/mercado" className={styles.roleCard}><span className={styles.icon}><Gamepad2 aria-hidden="true" /></span><small>SOU JOGADOR</small><h3>Encontre seu clube</h3><p>Explore vagas e mostre que está pronto para jogar.</p><b>Explorar o mercado <ArrowUpRight size={18} aria-hidden="true" /></b></Link>
            <Link href="/clubes#jogadores-cadastrados" className={styles.roleCard}><span className={styles.icon}><Shield aria-hidden="true" /></span><small>SOU CAPITÃO</small><h3>Monte seu elenco</h3><p>Conheça jogadores e encontre novos nomes para o time.</p><b>Conhecer jogadores <ArrowUpRight size={18} aria-hidden="true" /></b></Link>
          </div>
        </section>
        <section className={styles.community} id="comunidade" ref={results} tabIndex={-1} aria-labelledby="community-title">
          <header className={styles.sectionHeader}><div><span className={styles.eyebrow}>FEITO POR QUEM JOGA</span><h2 id="community-title">Conheça quem já<br className={styles.mobileBreak} /> está por aqui.</h2></div><Link href="/clubes">Explorar comunidade <ArrowUpRight size={17} aria-hidden="true" /></Link></header>
          <p className={styles.sectionDescription}>Clubes e perfis cadastrados no Pro Clubs America. Encontre uma conexão para o próximo jogo.</p>
          <div role="status" aria-live="polite" className={styles.resultStatus}>
            {status === "loading" && "Carregando clubes e jogadores…"}
            {status === "ready" && term && <><span>{clubs.length + members.length} resultado(s) para “{query}” nos cadastros exibidos.</span><button type="button" onClick={() => { setInput(""); setQuery(""); }}>Limpar busca</button></>}
          </div>
          {status === "error" ? <div className={styles.error}><p>Não conseguimos carregar a comunidade agora.</p><button type="button" onClick={() => { setStatus("loading"); setAttempt((value) => value + 1); }}>Tentar novamente <ArrowRight size={16} aria-hidden="true" /></button></div> : <div className={styles.directoryGrid}>
            <div className={styles.directoryColumn}><h3><Shield size={17} aria-hidden="true" /> Clubes da comunidade</h3>
              {status === "loading" ? <div className={styles.skeleton} aria-hidden="true" /> : visibleClubs.map((club) => <Link className={styles.memberCard} href={`/time?id=${encodeURIComponent(club.id)}`} key={club.id}><span className={styles.clubBadge}>{club.name.slice(0, 2).toUpperCase()}</span><span className={styles.memberName}><strong>{club.name}</strong><small>Conhecer o clube</small></span><ArrowUpRight size={18} aria-hidden="true" /></Link>)}
              {status === "ready" && !visibleClubs.length && <p className={styles.empty}>{term ? "Nenhum clube encontrado nesta seleção." : "Os próximos clubes da comunidade vão aparecer aqui."}</p>}
              <Link className={styles.directoryFooter} href="/clubes">Ver clubes cadastrados <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <div className={styles.directoryColumn}><h3><Users size={17} aria-hidden="true" /> Jogadores para conhecer</h3>
              {status === "loading" ? <div className={styles.skeleton} aria-hidden="true" /> : visibleMembers.map((member) => <Link className={styles.memberCard} href={`/perfil?id=${encodeURIComponent(member.id)}`} key={member.id}><span className={styles.playerBadge}>{member.name.slice(0, 1).toUpperCase()}</span><span className={styles.memberName}><strong>{member.name}</strong><small>{[member.preferredPosition, member.club?.name || (member.lookingForClub ? "Procurando clube" : "Perfil da comunidade")].filter(Boolean).join(" · ")}</small></span><ArrowUpRight size={18} aria-hidden="true" /></Link>)}
              {status === "ready" && !visibleMembers.length && <p className={styles.empty}>{term ? "Nenhum jogador encontrado nesta seleção." : "Crie seu perfil e entre para a comunidade."}</p>}
              <Link className={styles.directoryFooter} href="/clubes#jogadores-cadastrados">Ver jogadores cadastrados <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </div>}
          <small className={styles.dataNote}>Seleção dos últimos cadastros públicos, limitada a 100 perfis. Esta busca não consulta o catálogo da EA.</small>
        </section>
        <section className={styles.featureGrid} aria-label="Mais formas de entrar no jogo">
          <article className={styles.friendly} id="amistosos"><div className={styles.featureSymbol} aria-hidden="true"><Swords size={58} strokeWidth={1.2} /></div><span className={styles.eyebrow}>AMISTOSOS</span><h2>Seu próximo rival<br />está a um convite.</h2><p>Encontre desafios abertos e combine uma partida com outro clube da comunidade.</p><Link href="/partidas/amistosos#desafios-abertos">Ver desafios abertos <ArrowUpRight size={19} aria-hidden="true" /></Link></article>
          <article className={styles.showcase}><div className={styles.featureSymbol} aria-hidden="true"><UserRound size={58} strokeWidth={1.2} /></div><span className={styles.eyebrow}>SEU PERFIL, SEU FUTEBOL</span><h2>Mostre<br />o seu jogo.</h2><p>Fotos do seu Pro, posições, arquétipos e vídeos do YouTube. Seus melhores momentos têm lugar aqui.</p><Link href="/criar-conta">Criar meu perfil <ArrowUpRight size={19} aria-hidden="true" /></Link></article>
        </section>
        <section className={styles.how} id="como-funciona" aria-labelledby="how-title"><span className={styles.eyebrow}>DO CADASTRO AO CAMPO</span><h2 id="how-title">Simples de entrar.<br /><em>Melhor de fazer parte.</em></h2><ol><li><span>01</span><div><h3>Crie sua conta</h3><p>Escolha seu nick, posição e onde você joga.</p></div></li><li><span>02</span><div><h3>Encontre sua comunidade</h3><p>Escolha seu idioma e vincule seu clube no cadastro.</p></div></li><li><span>03</span><div><h3>Entre no jogo</h3><p>Complete seu perfil, explore o mercado e conheça rivais.</p></div></li></ol><Link href="/criar-conta" className={styles.primary}>Criar minha conta <ArrowRight size={19} aria-hidden="true" /></Link><small><Check size={14} aria-hidden="true" /> Cadastro gratuito</small></section>
        <section className={styles.faq} aria-labelledby="faq-title"><div><span className={styles.eyebrow}>SEM COMPLICAÇÃO</span><h2 id="faq-title">Antes do<br />primeiro apito.</h2><Link href="/instalar"><Smartphone size={18} aria-hidden="true" /> Leve a comunidade no bolso <ArrowUpRight size={16} aria-hidden="true" /></Link></div><div className={styles.questions}>
          <details><summary>Preciso criar conta para explorar? <ChevronDown size={18} aria-hidden="true" /></summary><p>Você pode conhecer esta página e explorar os cadastros públicos sem entrar. Para participar do mercado, gerenciar seu perfil e combinar amistosos, crie sua conta.</p></details>
          <details><summary>Quais clubes e jogadores aparecem aqui? <ChevronDown size={18} aria-hidden="true" /></summary><p>Esta página mostra uma seleção dos cadastros recentes da nossa comunidade, não um ranking ou o catálogo completo da EA. A busca filtra esses cadastros pelo nome, nick ou nome do clube vinculado.</p></details>
          <details><summary>Como mostro meu Pro e meus melhores momentos? <ChevronDown size={18} aria-hidden="true" /></summary><p>Depois de entrar, complete a vitrine do seu perfil com fotos, overall, posições, arquétipos e links de vídeos do YouTube.</p></details>
          <details><summary>O Pro Clubs America é oficial da EA? <ChevronDown size={18} aria-hidden="true" /></summary><p>Não. Somos uma plataforma comunitária independente, sem afiliação, patrocínio ou endosso da Electronic Arts.</p></details>
        </div></section>
      </div>
    </main>
    <footer className={styles.footer}><div className={styles.footerTop}><Link href="/" className={styles.brand}><BrandLogo size={40} /><span>PRO CLUBS<strong>AMERICA</strong></span></Link><p>O jogo conecta.<br />A comunidade fica.</p><nav aria-label="Links institucionais"><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos de uso</Link><Link href="/instalar">Instalar app</Link></nav></div><div className={styles.footerBottom}><span>Comunidade independente. Não afiliada à Electronic Arts.</span><a href="https://gui.marketing/?utm_source=esc-skills&utm_medium=deliverable&utm_campaign=guimkt-landing-page&utm_content=footer">Design workflow: gui.marketing</a></div></footer>
  </div>;
}
