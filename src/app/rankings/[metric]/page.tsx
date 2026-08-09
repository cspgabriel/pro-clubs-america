import { notFound, redirect } from "next/navigation";
import { rankingMetrics, type RankingMetric } from "@/lib/ranking-data";

export function generateStaticParams() { return rankingMetrics.map((metric) => ({ metric })); }

export async function generateMetadata({ params }: { params: Promise<{ metric: string }> }) {
  const { metric } = await params;
  const titles: Record<string, string> = { artilharia: "Artilharia", assistencias: "Assistências", desarmes: "Tackles", aproveitamento: "Win rate" };
  return { title: `${titles[metric] ?? "Rankings"} | Clubs Brasil` };
}

export default async function RankingRoute({ params }: { params: Promise<{ metric: string }> }) {
  const { metric } = await params;
  if (!rankingMetrics.includes(metric as RankingMetric)) notFound();
  redirect(`/rankings/jogadores/${metric}`);
}
