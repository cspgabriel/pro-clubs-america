import Image from "next/image";
import clubData from "@/data/club.json";
import { catalogClubs } from "@/data/catalog";
import { buildDashboard } from "@/lib/stats";
import { ClubDashboard } from "@/components/club-dashboard";
import { PlatformHeader } from "@/components/platform-header";
import { MobileNav } from "@/components/mobile-nav";
import type { ClubDataset } from "@/types/domain";
import { findPublicClub, publicPlayers } from "@/lib/public-data";
import { PublicClubProfile } from "@/components/public-club-profile";

export default async function ClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "171630") return <><ClubDashboard data={buildDashboard(clubData as ClubDataset)} /><MobileNav /></>;
  const publicClub = findPublicClub(id);
  if (publicClub) return <PublicClubProfile club={publicClub} players={publicPlayers.filter((player) => player.clubId === id)} />;
  const club = catalogClubs.find((item) => item.id === id);
  const name = club?.name ?? `Clube ID ${id}`;
  const crest = club?.crestUrl ?? "/icon.svg";
  return <main className="app-shell"><PlatformHeader /><section className="lite-profile"><Image src={crest} alt={`Escudo ${name}`} width={140} height={140} unoptimized /><small>{club ? "CLUBE ENCONTRADO NO HISTÓRICO" : "AGUARDANDO PRIMEIRA COLETA"}</small><h1>{name}</h1><p>ID {id} · common-gen5</p><a href={`https://www.ea.com/pt-br/games/ea-sports-fc/clubs/overview?clubId=${id}&platform=common-gen5`} target="_blank" rel="noreferrer">Abrir página pública</a></section><MobileNav /></main>;
}
