import type { MetadataRoute } from "next";
import { indexablePlayers, publicClubs } from "@/lib/public-data";
import { canonical } from "@/lib/seo";

export const dynamic = "force-static";

const STATIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/clubes", priority: 0.9, changeFrequency: "daily" },
  { path: "/jogadores", priority: 0.9, changeFrequency: "daily" },
  { path: "/rankings/times", priority: 0.8, changeFrequency: "daily" },
  { path: "/rankings/comunidade", priority: 0.7, changeFrequency: "daily" },
  { path: "/amistosos", priority: 0.7, changeFrequency: "hourly" },
  { path: "/mercado", priority: 0.7, changeFrequency: "hourly" },
  { path: "/partidas", priority: 0.6, changeFrequency: "daily" },
  { path: "/buscar", priority: 0.5, changeFrequency: "weekly" },
  { path: "/planos", priority: 0.5, changeFrequency: "monthly" },
];

const RANKING_METRICS = ["artilharia", "assistencias", "desarmes", "aproveitamento"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    ...STATIC_ROUTES.map((route) => ({ url: canonical(route.path), lastModified, changeFrequency: route.changeFrequency, priority: route.priority })),
    ...RANKING_METRICS.flatMap((metric) => [
      { url: canonical(`/rankings/jogadores/${metric}`), lastModified, changeFrequency: "daily" as const, priority: 0.6 },
      { url: canonical(`/rankings/clubes/${metric}`), lastModified, changeFrequency: "daily" as const, priority: 0.6 },
    ]),
    ...publicClubs.map((club) => ({ url: canonical(`/club/${club.id}`), lastModified, changeFrequency: "daily" as const, priority: 0.8 })),
    ...indexablePlayers.map((player) => ({ url: canonical(`/jogador/${player.id}`), lastModified, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
