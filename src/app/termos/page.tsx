import type { Metadata } from "next";
import Link from "next/link";
import { Scale, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Termos da Comunidade | Pro Clubs America",
  description: "Regras de uso da comunidade Pro Clubs America.",
};

export default function TermsPage() {
  return <main className="app-shell legal-page">
    <header className="legal-hero"><Scale /><small>PRO CLUBS AMERICA · ATUALIZADO EM 1º DE SETEMBRO DE 2026</small><h1>Termos da <em>Comunidade</em></h1><p>Regras para manter a busca por clubes, o mercado e os amistosos seguros e úteis para todos.</p></header>
    <article className="legal-content">
      <section><h2>1. A plataforma</h2><p>O Pro Clubs America é uma comunidade independente para jogadores e clubes de EA SPORTS FC Clubs. Não somos afiliados, endossados ou patrocinados pela Electronic Arts. Marcas e referências a jogos pertencem aos respectivos titulares.</p></section>
      <section><h2>2. Conta e perfil</h2><p>Você é responsável pelas informações, fotos, links e contatos que publicar. Use dados verdadeiros sobre seu perfil e clube, não se passe por terceiros e não publique material ilegal, ofensivo, enganoso ou que viole direitos de outras pessoas.</p></section>
      <section><h2>3. Mercado e amistosos</h2><p>Anúncios, candidaturas e desafios são publicados pela comunidade. O Pro Clubs America não garante contratação, participação em clube, resultado de partida ou conduta de outros usuários. Donos, capitães e administradores vinculados são os únicos autorizados a representar um clube nos recursos que exigem essa função.</p></section>
      <section><h2>4. Conteúdo e moderação</h2><p>Podemos remover conteúdo, limitar funcionalidades ou suspender contas que violem estes termos, prejudiquem a comunidade ou tentem contornar controles de segurança. Você mantém a responsabilidade pelo conteúdo que enviar e nos autoriza a hospedá-lo e exibí-lo para operar a plataforma.</p></section>
      <section><h2>5. Pagamentos</h2><p>Recursos pagos, quando disponibilizados, terão preço, renovação e condições informados antes da contratação. Processadores de pagamento podem aplicar seus próprios termos. Compras não são necessárias para utilizar os recursos gratuitos da comunidade.</p></section>
      <section><h2>6. Alterações e privacidade</h2><p>Podemos evoluir a plataforma e estes termos. O uso contínuo após uma atualização representa aceitação da versão vigente. Consulte nossa <Link href="/privacidade">Política de Privacidade</Link> para entender o tratamento de dados.</p></section>
      <footer><ShieldAlert /><span>Encontrou uma conduta inadequada? Use os canais de suporte da comunidade para reportar o caso.</span></footer>
    </article>
  </main>;
}
