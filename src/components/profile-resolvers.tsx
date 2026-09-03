"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import clubData from "@/data/club.json";
import { buildDashboard } from "@/lib/stats";
import { findPublicPlayer } from "@/lib/public-data";
import { getCommunityMatchClubs } from "@/lib/friendlies-data";
import type { ClubDataset } from "@/types/domain";
import { LiveClubDashboard } from "./live-club-dashboard";
import { MatchDetail } from "./match-detail";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";

const dataset = clubData as ClubDataset;
const dashboard = buildDashboard(dataset);
const lastSegment = (pathname: string) => decodeURIComponent(pathname.split("/").filter(Boolean).at(-1) ?? "");

export function ClubRouteResolver() {
  const pathnameId = lastSegment(usePathname());
  const id = useSearchParams().get("id") || pathnameId;
  return <LiveClubDashboard id={id} />;
}

export function PlayerRouteResolver() {
  const pathnameId = lastSegment(usePathname());
  const search = useSearchParams();
  const id = search.get("id") || pathnameId;
  const local = dashboard.rankings.find((player) => player.id.toLocaleLowerCase("pt-BR") === id.toLocaleLowerCase("pt-BR"));
  const player = local ?? findPublicPlayer(id);
  if (search.get("clubId")) return <LiveClubDashboard id={search.get("clubId")!} playerName={player?.name || id} />;
  if (!player) return <main className="app-shell"><PlatformHeader /><section className="match-not-found"><h1>Jogador não encontrado</h1><Link href="/jogadores">Voltar aos jogadores</Link></section><MobileNav /></main>;
  const publicPlayer = local ? null : findPublicPlayer(id);
  return <LiveClubDashboard id={local ? dataset.club.id : publicPlayer!.clubId} playerName={player.name} />;
}

export function MatchRouteResolver() {
  const id = lastSegment(usePathname());
  return <MatchDetail id={id} official={dataset.matches.find((match) => match.id === id)} clubs={getCommunityMatchClubs()} />;
}
