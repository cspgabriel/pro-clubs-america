"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { CommunityMatchClub } from "@/lib/friendlies-data";
import { FriendliesBoard, type PublicMatch } from "./friendlies-board";
import { TransferMarket } from "./transfer-market";

function MarketContent() {
  const params = useSearchParams();
  return <TransferMarket initialType={params.get("tipo") === "jogador" ? "player_search" : "club_vacancy"} />;
}

export function MarketRoute() {
  return <Suspense fallback={null}><MarketContent /></Suspense>;
}

function FriendliesContent({ matches, communityClubs }: { matches: PublicMatch[]; communityClubs: CommunityMatchClub[] }) {
  const params = useSearchParams();
  const id = params.get("desafiar");
  const target = id ? { id, name: params.get("nome") ?? `Clube ${id}` } : null;
  return <FriendliesBoard view="friendlies" matches={matches} communityClubs={communityClubs} initialChallengeTarget={target} />;
}

export function FriendliesRoute(props: { matches: PublicMatch[]; communityClubs: CommunityMatchClub[] }) {
  return <Suspense fallback={null}><FriendliesContent {...props} /></Suspense>;
}
