import clubData from "@/data/club.json";
import { catalogClubs } from "@/data/catalog";
import { MarketHome } from "@/components/market-home";
import { publicClubs, publicPlayers } from "@/lib/public-data";
import { buildDashboard } from "@/lib/stats";
import type { ClubDataset } from "@/types/domain";

export const metadata = { title: "Início | Pro Clubs America" };

export default function MemberHomePage() {
  const dashboard = buildDashboard(clubData as ClubDataset);
  const clubs = [...publicClubs.slice(0, 6), ...catalogClubs.filter((club) => !publicClubs.some((item) => item.id === club.id)).slice(0, 3)];
  return <MarketHome players={[...dashboard.rankings.map((player) => ({ ...player, clubName: (clubData as ClubDataset).club.name })), ...publicPlayers]} availableClubs={clubs} />;
}
