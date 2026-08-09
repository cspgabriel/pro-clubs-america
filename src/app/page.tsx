import clubData from "@/data/club.json";
import { buildDashboard } from "@/lib/stats";
import { MarketHome } from "@/components/market-home";
import type { ClubDataset } from "@/types/domain";
import { publicClubs, publicPlayers } from "@/lib/public-data";
import { catalogClubs } from "@/data/catalog";

export default function Home() {
  const dashboard = buildDashboard(clubData as ClubDataset);
  const clubs = [...publicClubs.slice(0, 6), ...catalogClubs.filter((club) => !publicClubs.some((item) => item.id === club.id)).slice(0, 3)];
  return <MarketHome players={[...dashboard.rankings.map((player) => ({ ...player, clubName: (clubData as ClubDataset).club.name })), ...publicPlayers]} availableClubs={clubs} />;
}
