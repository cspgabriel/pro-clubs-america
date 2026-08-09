import { FriendliesRoute } from "@/components/query-routes";
import clubData from "@/data/club.json";
import { getCommunityMatchClubs } from "@/lib/friendlies-data";
import type { ClubDataset } from "@/types/domain";
export const metadata = { title: "Marcar amistoso | Pro Clubs America" };
export default function Page() { return <FriendliesRoute matches={(clubData as ClubDataset).matches.map((match) => ({ ...match, mode: match.mode ?? "leagueMatch" }))} communityClubs={getCommunityMatchClubs()} />; }
