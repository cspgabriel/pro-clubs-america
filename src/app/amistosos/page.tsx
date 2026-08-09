import { FriendliesBoard } from "@/components/friendlies-board";
import clubData from "@/data/club.json";
import type { ClubDataset } from "@/types/domain";

export default function AmistososPage() {
  return <FriendliesBoard matches={(clubData as ClubDataset).matches.map((match) => ({ ...match, mode: match.mode ?? "leagueMatch" }))} />;
}
