"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BriefcaseBusiness, Pause, Play, Shield, Swords } from "lucide-react";
import { useEffect, useState } from "react";
import type { CommunityProfile } from "@/lib/community-service";
import { BrandLogo } from "./brand-logo";

interface Slide {
  eyebrow: string;
  title: string;
  copy: string;
  href: string;
  cta: string;
  icon: typeof Shield;
}

export function CommunityWelcomeSlider({ profile }: { profile: CommunityProfile | null }) {
  const firstName = profile?.displayName?.split(" ")[0] || "jogador";
  const slides: Slide[] = [
    { eyebrow: "PRO CLUBS AMERICA", title: `Bem-vindo, ${firstName}.`, copy: profile?.clubName ? `${profile.clubName} já está em campo. Veja quem chegou à comunidade hoje.` : "Seu perfil é seu passe de entrada. Conheça clubes, jogadores e oportunidades reais.", href: profile?.clubName ? `/time?id=${encodeURIComponent(profile.clubId || "")}` : "/clubes", cta: profile?.clubName ? "Abrir meu clube" : "Explorar comunidade", icon: Shield },
    { eyebrow: "MERCADO DA COMUNIDADE", title: "O reforço certo está aqui.", copy: "Encontre jogadores livres, publique uma vaga e deixe seu elenco pronto para o próximo jogo.", href: "/mercado", cta: "Abrir mercado", icon: BriefcaseBusiness },
    { eyebrow: "AMISTOSOS", title: "Seu próximo rival está online.", copy: "Veja desafios abertos e marque um amistoso com clubes que também querem jogar agora.", href: "/partidas/amistosos#desafios-abertos", cta: "Encontrar rival", icon: Swords },
  ];
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [playing, slides.length]);

  const slide = slides[active];
  const Icon = slide.icon;
  return <section className="community-welcome-slider" aria-roledescription="carrossel" aria-label="Destaques do Pro Clubs America">
    <Image src="/brand/home-stadium.png" alt="" fill priority sizes="100vw" className="community-welcome-stadium" />
    <div className="community-welcome-content">
      <BrandLogo size={72} />
      <div className="community-welcome-copy"><small>{slide.eyebrow}</small><h1>{slide.title}</h1><p>{slide.copy}</p><Link href={slide.href}><Icon /> {slide.cta} <ArrowRight /></Link></div>
    </div>
    <div className="community-welcome-controls"><div role="tablist" aria-label="Escolher destaque">{slides.map((item, index) => <button key={item.eyebrow} type="button" role="tab" aria-selected={index === active} aria-label={`Ver ${item.eyebrow.toLowerCase()}`} className={index === active ? "active" : ""} onClick={() => setActive(index)} />)}</div><button type="button" className="community-slider-toggle" onClick={() => setPlaying((current) => !current)} aria-label={playing ? "Pausar carrossel" : "Retomar carrossel"}>{playing ? <Pause /> : <Play />}</button></div>
  </section>;
}
