"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import clubData from "@/data/club.json";
import { catalogClubs } from "@/data/catalog";
import { buildDashboard } from "@/lib/stats";
import { findPublicClub, findPublicPlayer, publicPlayers } from "@/lib/public-data";
import { getCommunityMatchClubs } from "@/lib/friendlies-data";
import type { ClubDataset } from "@/types/domain";
import { ClubDashboard } from "./club-dashboard";
import { PublicClubProfile } from "./public-club-profile";
import { PlayerProfile } from "./player-profile";
import { MatchDetail } from "./match-detail";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";

const dataset = clubData as ClubDataset;
const dashboard = buildDashboard(dataset);
const lastSegment = (pathname: string) => decodeURIComponent(pathname.split("/").filter(Boolean).at(-1) ?? "");

export function ClubRouteResolver() {
  const id = lastSegment(usePathname());
  if (id === "171630") return <><ClubDashboard data={dashboard} /><MobileNav /></>;
  const club = findPublicClub(id);
  if (club) return <PublicClubProfile club={club} players={publicPlayers.filter((player) => player.clubId === id)} />;
  const catalog = catalogClubs.find((item) => item.id === id);
  return <main className="app-shell"><PlatformHeader /><section className="match-not-found"><h1>{catalog?.name ?? "Clube não encontrado"}</h1><p>Este clube ainda não faz parte da coleta comunitária.</p><Link href="/clubes">Voltar aos clubes</Link></section><MobileNav /></main>;
}

export function PlayerRouteResolver() {
  const id = lastSegment(usePathname());
  const local = dashboard.rankings.find((player) => player.id.toLocaleLowerCase("pt-BR") === id.toLocaleLowerCase("pt-BR"));
  const player = local ?? findPublicPlayer(id);
  if (!player) return <main className="app-shell"><PlatformHeader /><section className="match-not-found"><h1>Jogador não encontrado</h1><Link href="/jogadores">Voltar aos jogadores</Link></section><MobileNav /></main>;
  const publicPlayer = local ? null : findPublicPlayer(id);
  const club = publicPlayer ? findPublicClub(publicPlayer.clubId) : null;
  return <PlayerProfile player={player} club={local ? dataset.club : { id: publicPlayer!.clubId, name: publicPlayer!.clubName, crestUrl: club?.crestUrl, sourceUrl: publicPlayer!.sourceUrl }} recentMatches={[]} limitedData={!local} />;
}

export function MatchRouteResolver() {
  const id = lastSegment(usePathname());
  return <MatchDetail id={id} official={dataset.matches.find((match) => match.id === id)} clubs={getCommunityMatchClubs()} />;
}
