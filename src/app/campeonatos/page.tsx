import type { Metadata } from "next";
import { TournamentsPage } from "@/components/tournaments-page";

export const metadata: Metadata = {
  title: "Campeonatos | Pro Clubs America",
  description:
    "Campeonatos oficiais da comunidade Pro Clubs America: fase de grupos, mata-mata e pontos corridos. Inscreva seu clube e acompanhe a tabela.",
};

export default function CampeonatosPage() {
  return <TournamentsPage />;
}
