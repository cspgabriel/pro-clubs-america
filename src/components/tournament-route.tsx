"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Trophy } from "lucide-react";
import { MobileNav } from "./mobile-nav";
import { PlatformHeader } from "./platform-header";
import { TournamentDetail } from "./tournament-detail";
import styles from "./tournaments.module.css";

/**
 * Ponte entre a rota estatica e o detalhe · o `useSearchParams` precisa
 * de um Client Component, e o `page.tsx` fica servidor para manter o
 * `metadata` da rota.
 */
export function TournamentRoute() {
  const slug = useSearchParams().get("id")?.trim();

  if (!slug) {
    return (
      <main className="app-shell">
        <PlatformHeader />
        <div className="content">
          <div className={styles.empty}>
            <Trophy />
            <strong>Nenhum campeonato informado</strong>
            <Link href="/campeonatos">Ver todos os campeonatos</Link>
          </div>
        </div>
        <MobileNav />
      </main>
    );
  }

  return <TournamentDetail slug={slug} />;
}
