import clubData from "@/data/club.json";
import { DirectoryPage } from "@/components/directory-page";
import { buildDashboard } from "@/lib/stats";
import type { ClubDataset } from "@/types/domain";
import { publicClubs, publicPlayers } from "@/lib/public-data";

export const metadata = { title: "Jogadores | Clubs Brasil" };
export default function JogadoresPage() { return <DirectoryPage mode="players" players={[...buildDashboard(clubData as ClubDataset).rankings, ...publicPlayers]} availableClubs={publicClubs} />; }
