import clubData from "@/data/club.json";
import { catalogClubs } from "@/data/catalog";
import { SearchHub } from "@/components/search-hub";
import { buildDashboard } from "@/lib/stats";
import { publicClubs, publicPlayers } from "@/lib/public-data";
import type { ClubDataset } from "@/types/domain";

export const metadata = { title: "Buscar | Clubs Brasil" };
export default function BuscarPage() {
  const localPlayers = buildDashboard(clubData as ClubDataset).rankings.length;
  const extraClubs = catalogClubs.filter((club) => !publicClubs.some((item) => item.id === club.id)).length;
  return <SearchHub clubCount={publicClubs.length + extraClubs} playerCount={publicPlayers.length + localPlayers} />;
}
