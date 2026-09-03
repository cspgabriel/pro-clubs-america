"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ClubDataset } from "@/types/domain";
import { buildDashboard } from "@/lib/stats";
import { ClubDashboard } from "./club-dashboard";
import { MobileNav } from "./mobile-nav";
import { BrandLogo } from "./brand-logo";
import { PlayerProfile, type PlayerRecentMatch } from "./player-profile";

const noMatches: PlayerRecentMatch[] = [];

export function LiveClubDashboard({ id, playerName }: { id: string; playerName?: string }) {
  const [dataset, setDataset] = useState<ClubDataset | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/catalog/club-stats?clubId=${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("STATS_UNAVAILABLE"); return response.json() as Promise<ClubDataset>; })
      .then((data) => { setDataset(data); setError(""); })
      .catch(() => { if (!controller.signal.aborted) setError("Não foi possível carregar as estatísticas atualizadas."); });
    return () => controller.abort();
  }, [id, retry]);
  if (!dataset || dataset.club.id !== id) return <main className="member-home-loading"><BrandLogo size={72} /><p role={error ? "alert" : "status"}>{error || "Buscando estatísticas na base sincronizada…"}</p>{error && <button type="button" onClick={() => { setError(""); setRetry((value) => value + 1); }}>Tentar novamente</button>}<Link href="/clubes">Voltar à comunidade</Link><MobileNav /></main>;
  const dashboard = buildDashboard(dataset);
  if (playerName) {
    const player = dashboard.rankings.find((item) => item.name.toLocaleLowerCase("pt-BR") === playerName.toLocaleLowerCase("pt-BR"));
    if (!player) return <main className="member-home-loading"><p>Jogador não encontrado no elenco atualizado deste clube.</p><Link href={`/club?id=${encodeURIComponent(id)}`}>Abrir clube</Link><MobileNav /></main>;
    return <PlayerProfile player={player} club={dataset.club} recentMatches={noMatches} />;
  }
  return <><ClubDashboard data={dashboard} /><MobileNav /></>;
}
