import clubData from "@/data/club.json";
import { buildDashboard } from "@/lib/stats";
import { PublicLanding } from "@/components/public-landing";
import type { ClubDataset } from "@/types/domain";
import { publicClubs, publicPlayers } from "@/lib/public-data";

export default function Home() {
  const dashboard = buildDashboard(clubData as ClubDataset);
  const localPlayers = dashboard.rankings.map((player) => ({ ...player, clubName: (clubData as ClubDataset).club.name }));
  const leaders = [...localPlayers, ...publicPlayers].filter((player) => player.goals != null).sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0)).slice(0, 4);
  return <PublicLanding clubs={[...publicClubs].sort((a, b) => b.skillRating - a.skillRating).slice(0, 4)} players={leaders} clubCount={publicClubs.length} playerCount={publicPlayers.length + localPlayers.length} />;
}
