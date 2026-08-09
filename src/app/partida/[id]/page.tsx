import { MatchDetail } from "@/components/match-detail";
import clubData from "@/data/club.json";
import { getCommunityMatchClubs } from "@/lib/friendlies-data";
import type { ClubDataset } from "@/types/domain";
export function generateStaticParams() { return (clubData as ClubDataset).matches.map((match) => ({ id: match.id })); }
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const dataset = clubData as ClubDataset; return <MatchDetail id={id} official={dataset.matches.find((match) => match.id === id)} clubs={getCommunityMatchClubs()} />; }
