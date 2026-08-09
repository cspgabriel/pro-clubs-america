import { TransferMarket } from "@/components/transfer-market";

export const metadata = { title: "Mercado de transferências | Clubs Brasil" };
export default async function MercadoPage({ searchParams }: { searchParams: Promise<{ tipo?: string | string[] }> }) {
  const query = await searchParams;
  const type = (Array.isArray(query.tipo) ? query.tipo[0] : query.tipo) === "jogador" ? "player_search" as const : "club_vacancy" as const;
  return <TransferMarket initialType={type} />;
}
