import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import { PwaRegister } from "@/components/pwa-register";
import { AppChrome } from "@/components/app-chrome";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://proclubsamerica.com"),
  title: "Pro Clubs America | EA SPORTS FC Clubs",
  description: "Comunidade sul-americana de Pro Clubs: clubes, jogadores, amistosos e rankings.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Pro Clubs America", statusBarStyle: "black-translucent" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-theme="dark">
      <body>
        <PwaRegister />
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
