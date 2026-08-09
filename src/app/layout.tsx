import type { Metadata } from "next";
import "@fontsource/chakra-petch/400.css";
import "@fontsource/chakra-petch/500.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource/russo-one/400.css";
import { PwaRegister } from "@/components/pwa-register";
import { DesktopSidebar } from "@/components/desktop-sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clubs Brasil | EA SPORTS FC Clubs",
  description: "Estatísticas independentes de Pro Clubs: partidas, jogadores, gols e rankings.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Clubs Brasil", statusBarStyle: "black-translucent" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `try{const t=localStorage.getItem('clubs-brasil-theme');document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark')}catch{}` }} /></head><body><PwaRegister /><DesktopSidebar />{children}</body></html>;
}
