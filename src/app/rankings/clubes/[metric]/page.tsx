import { notFound } from "next/navigation";
import { RankingsPage } from "@/components/rankings-page";
import { getClubRankingRows, rankingMetrics, type RankingMetric } from "@/lib/ranking-data";

export function generateStaticParams() { return rankingMetrics.map((metric) => ({ metric })); }

export async function generateMetadata({ params }: { params: Promise<{ metric: string }> }) {
  const { metric } = await params;
  return { title: `Ranking de clubes: ${metric} | Clubs Brasil` };
}

export default async function ClubRankingRoute({ params }: { params: Promise<{ metric: string }> }) {
  const { metric } = await params;
  if (!rankingMetrics.includes(metric as RankingMetric)) notFound();
  return <RankingsPage metric={metric as RankingMetric} entity="clubs" clubs={getClubRankingRows(metric as RankingMetric)} />;
}
