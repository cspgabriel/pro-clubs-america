import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Clubs Brasil",
    short_name: "Clubs Brasil",
    description: "Clubes, jogadores, estatísticas e amistosos de Pro Clubs.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#00e676",
    orientation: "portrait",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
