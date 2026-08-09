import { FriendliesBoard } from "@/components/friendlies-board";
import clubData from "@/data/club.json";
import { getCommunityMatchClubs } from "@/lib/friendlies-data";
import type { ClubDataset } from "@/types/domain";
export const metadata = { title: "Histórico de partidas | Pro Clubs America" };
export default function Page() { return <FriendliesBoard view="history" matches={(clubData as ClubDataset).matches.map((match) => ({ ...match, mode: match.mode ?? "leagueMatch" }))} communityClubs={getCommunityMatchClubs()} />; }
