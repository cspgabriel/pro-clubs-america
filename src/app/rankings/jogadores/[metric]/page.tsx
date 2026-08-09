import { notFound } from "next/navigation";
import { RankingsPage } from "@/components/rankings-page";
import { getPlayerRankingRows, rankingMetrics, type RankingMetric } from "@/lib/ranking-data";

export function generateStaticParams() { return rankingMetrics.map((metric) => ({ metric })); }

export async function generateMetadata({ params }: { params: Promise<{ metric: string }> }) {
  const { metric } = await params;
  return { title: `Ranking de jogadores: ${metric} | Clubs Brasil` };
}

export default async function PlayerRankingRoute({ params }: { params: Promise<{ metric: string }> }) {
  const { metric } = await params;
  if (!rankingMetrics.includes(metric as RankingMetric)) notFound();
  return <RankingsPage metric={metric as RankingMetric} entity="players" players={getPlayerRankingRows()} />;
}
