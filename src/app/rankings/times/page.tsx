import clubData from "@/data/club.json";
import { CommunityRanking } from "@/components/community-ranking";
import { buildDashboard } from "@/lib/stats";
import type { ClubDataset } from "@/types/domain";

export const metadata = { title: "Ranking de times | Clubs Brasil" };
export default function TeamRankingPage() {
  const dataset = clubData as ClubDataset;
  const dashboard = buildDashboard(dataset);
  return <CommunityRanking officialClubs={[{ id: dataset.club.id, name: dataset.club.name, skillRating: dataset.club.overview?.skillRating ?? 0, matches: dashboard.summary.matches, wins: dashboard.summary.wins, winRate: dashboard.summary.winRate, goals: dashboard.summary.goalsFor }]} />;
}
