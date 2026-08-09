import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pro Clubs America",
    short_name: "Clubs America",
    description: "Comunidade sul-americana de clubes, jogadores, estatísticas e amistosos de Pro Clubs.",
    start_url: "/",
    display: "standalone",
    background_color: "#061329",
    theme_color: "#0d2347",
    orientation: "portrait",
    icons: [
      { src: "/brand/pro-clubs-america-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/pro-clubs-america-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/pro-clubs-america-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
