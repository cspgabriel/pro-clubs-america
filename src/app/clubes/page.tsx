import clubData from "@/data/club.json";
import { DirectoryPage } from "@/components/directory-page";
import { buildDashboard } from "@/lib/stats";
import type { ClubDataset } from "@/types/domain";
import { publicClubs, publicPlayers } from "@/lib/public-data";
import { catalogClubs } from "@/data/catalog";

export const metadata = { title: "Clubes | Clubs Brasil" };
export default function ClubesPage() { const local = buildDashboard(clubData as ClubDataset).rankings; const clubs = [...publicClubs, ...catalogClubs.filter((club) => !publicClubs.some((item) => item.id === club.id))]; return <DirectoryPage mode="clubs" players={[...local, ...publicPlayers]} availableClubs={clubs} />; }
