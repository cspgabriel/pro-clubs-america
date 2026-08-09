import { FriendliesBoard } from "@/components/friendlies-board";
import clubData from "@/data/club.json";
import type { ClubDataset } from "@/types/domain";

export const metadata = { title: "Partidas e amistosos | Clubs Brasil" };

export default async function PartidasPage({ searchParams }: { searchParams: Promise<{ desafiar?: string | string[]; nome?: string | string[] }> }) {
  const query = await searchParams;
  const clubId = Array.isArray(query.desafiar) ? query.desafiar[0] : query.desafiar;
  const clubName = Array.isArray(query.nome) ? query.nome[0] : query.nome;
  const target = clubId ? { id: clubId, name: clubName ?? `Clube ${clubId}` } : null;
  return <FriendliesBoard matches={(clubData as ClubDataset).matches.map((match) => ({ ...match, mode: match.mode ?? "leagueMatch" }))} initialChallengeTarget={target} />;
}
