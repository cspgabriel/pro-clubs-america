import { CommunityHome } from "@/components/community-home";

export const metadata = {
  title: { absolute: "Pro Clubs America | Encontre seu clube e entre no jogo" },
  alternates: { canonical: "/" },
};

/**
 * A raiz e a mesma HOME do app (`/inicio`), e nao mais a landing de
 * marketing · decisao do dono do produto em 06/09/2026.
 *
 * A diferenca para `/inicio` e uma so: aqui **nao** passamos `requireAuth`.
 * A raiz e a porta de entrada publica — mandar visitante deslogado para
 * `/entrar` mataria o trafego organico. Sem login o componente ja degrada
 * sozinho: mostra clubes, jogadores e campeonatos, e esconde o que depende
 * de sessao.
 */
export default function Home() {
  return <CommunityHome />;
}
