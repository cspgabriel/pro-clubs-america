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
import { Analytics } from "@/components/analytics";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://proclubsamerica.com"),
  title: { default: "Pro Clubs America | Comunidade de Pro Clubs", template: "%s | Pro Clubs America" },
  description: "Comunidade latino-americana de Pro Clubs para encontrar clubes, jogadores, mercado de transferências e amistosos no EA SPORTS FC.",
  manifest: "/manifest.webmanifest",
  verification: { google: "oiUqm-7SwP9_PLm3GuSpfS96JVW8GFpbIhD8etY9mgY" },
  icons: { icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/brand/pro-clubs-america-192.png", type: "image/png", sizes: "192x192" }], apple: "/brand/pro-clubs-america-192.png" },
  appleWebApp: { capable: true, title: "Pro Clubs America", statusBarStyle: "black-translucent" },
  applicationName: "Pro Clubs America",
  category: "sports",
  openGraph: { type: "website", locale: "pt_BR", siteName: "Pro Clubs America", title: "Pro Clubs America | Comunidade de Pro Clubs", description: "Clubes, jogadores, mercado e amistosos para a comunidade latino-americana de Pro Clubs.", images: [{ url: "/brand/pro-clubs-america-512.png", width: 512, height: 512, alt: "Pro Clubs America" }] },
  twitter: { card: "summary", title: "Pro Clubs America", description: "Clubes, jogadores, mercado e amistosos para Pro Clubs.", images: ["/brand/pro-clubs-america-512.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-theme="dark">
      <body>
        <Analytics />
        <PwaRegister />
        <AppChrome>{children}</AppChrome>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "Pro Clubs America", url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://proclubsamerica.com", inLanguage: "pt-BR", description: "Comunidade latino-americana de Pro Clubs para clubes, jogadores, mercado e amistosos." }) }} />
      </body>
    </html>
  );
}
