import { CommunityRanking } from "@/components/community-ranking";
import { publicClubs } from "@/lib/public-data";

export const metadata = { title: "Ranking de times | Pro Clubs America" };
export default function TeamRankingPage() {
  const clubs = [...publicClubs].sort((a, b) => b.skillRating - a.skillRating || b.winRate - a.winRate).map((club) => ({ id: club.id, name: club.name, skillRating: club.skillRating, matches: club.matches, wins: club.wins, winRate: club.winRate, goals: club.goals }));
  return <CommunityRanking officialClubs={clubs} />;
}
