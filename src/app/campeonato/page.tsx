import type { Metadata } from "next";
import { Suspense } from "react";
import { TournamentRoute } from "@/components/tournament-route";

export const metadata: Metadata = {
  title: "Campeonato | Pro Clubs America",
  description: "Tabela, chave e resultados do campeonato da comunidade Pro Clubs America.",
};

/**
 * O detalhe mora numa rota com query (`/campeonato/?id=slug`) e nao em
 * `/campeonatos/[slug]` porque `next.config.ts` usa `output: "export"` ·
 * rota dinamica exigiria conhecer todos os slugs em tempo de build, e
 * campeonato novo nasce depois do deploy. E o mesmo padrao ja usado em
 * `/time/?id=` e `/perfil?id=`.
 */
export default function CampeonatoPage() {
  return (
    <Suspense fallback={null}>
      <TournamentRoute />
    </Suspense>
  );
}
