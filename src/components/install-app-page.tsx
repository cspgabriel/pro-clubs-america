"use client";

import Link from "next/link";
import { Check, Download, MonitorSmartphone, Share2, Smartphone, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { canPromptInstall, promptInstall } from "./pwa-register";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallAppPage() {
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const refresh = () => {
      setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
      setIos(isIos());
      setReady(canPromptInstall());
    };
    refresh();
    window.addEventListener("proclubs:install-state", refresh);
    window.addEventListener("appinstalled", refresh);
    return () => {
      window.removeEventListener("proclubs:install-state", refresh);
      window.removeEventListener("appinstalled", refresh);
    };
  }, []);

  const install = async () => {
    const choice = await promptInstall();
    if (!choice) return;
    setMessage(choice.outcome === "accepted" ? "Instalação iniciada. O Pro Clubs America vai aparecer na tela inicial." : "Instalação cancelada. Você pode tentar novamente quando quiser.");
  };

  return <main className="app-shell"><PlatformHeader /><section className="install-hero"><div className="install-icon"><Smartphone /></div><small>PRO CLUBS AMERICA NO SEU CELULAR</small><h1>Entre em campo<br /><em>sem abrir o navegador.</em></h1><p>Instale a experiência oficial para abrir mais rápido, receber notificações e acompanhar o mercado e os amistosos como um app nativo.</p>{installed ? <div className="install-status"><Check /> App já instalado neste aparelho.</div> : ios ? <div className="install-ios"><Share2 /><span>No Safari, toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.</span></div> : ready ? <button className="install-primary" type="button" onClick={install}><Download /> Instalar app oficial</button> : <div className="install-browser-hint"><MonitorSmartphone /><span>Abra o menu do navegador e escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</span></div>}{message && <p className="install-message">{message}</p>}</section><section className="install-benefits"><article><Sparkles /><h2>Abertura instantânea</h2><p>Seu acesso direto à comunidade, sem procurar aba ou digitar endereço.</p></article><article><Download /><h2>Pronto para jogo</h2><p>As telas essenciais ficam disponíveis mesmo com conexão instável.</p></article><article><Smartphone /><h2>Seu app, seu clube</h2><p>Ícone oficial e navegação de aplicativo no Android e no iPhone.</p></article></section><section className="install-native-note"><div><small>ANDROID</small><h2>Versão nativa pronta</h2><p>O pacote oficial está assinado e preparado para publicação na Google Play.</p></div><Link href="/conta">Voltar para minha conta</Link></section><MobileNav /></main>;
}
