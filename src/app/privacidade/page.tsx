import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidade | Pro Clubs America",
  description: "Como o Pro Clubs America trata os dados da comunidade de clubes e jogadores.",
};

export default function PrivacyPage() {
  return <main className="app-shell legal-page">
    <header className="legal-hero"><LockKeyhole /><small>PRO CLUBS AMERICA · ATUALIZADO EM 4 DE SETEMBRO DE 2026</small><h1>Política de <em>Privacidade</em></h1><p>Transparência sobre os dados usados para manter a comunidade, os perfis e os recursos de mercado e amistosos funcionando.</p></header>
    <article className="legal-content">
      <section><h2>1. Dados tratados</h2><p>Ao criar uma conta, tratamos nome de exibição, e-mail, identificador da conta e foto de perfil fornecida pelo provedor de login ou pelo próprio usuário. Para os recursos comunitários, podemos tratar país, função no clube, vínculo com jogador ou clube, disponibilidade, contatos publicados em anúncios e mensagens de candidatura.</p><p>O perfil de jogador pode incluir OVR, posições, arquétipos, imagens enviadas e links de vídeos do YouTube. Esses itens são opcionais e podem ficar visíveis publicamente quando adicionados ao perfil ou a um anúncio.</p></section>
      <section><h2>2. Finalidades</h2><p>Usamos os dados para autenticar a conta, criar e exibir perfis e clubes, viabilizar amizades, amistosos, anúncios do mercado, notificações solicitadas e a segurança da plataforma. Não vendemos dados pessoais.</p><p>No onboarding, nick, plataforma e posição ajudam a identificar seu perfil público. A opção “Estou procurando clube” inclui seu perfil na vitrine do mercado enquanto estiver ativada. O telefone é opcional, usado para contato administrativo e suporte à conta, e fica separado dos dados públicos.</p></section>
      <section><h2>3. Serviços que processam dados</h2><p>A autenticação é operada pelo Firebase. Os dados comunitários e imagens de vitrine são armazenados no Supabase. A aplicação é entregue pela Cloudflare. Caso recursos pagos estejam habilitados, a cobrança é processada pelo Stripe; dados completos de cartão não são recebidos pelo Pro Clubs America.</p></section>
      <section><h2>4. Exclusão de conta e dados</h2><p>Em <Link href="/conta">Minha conta</Link>, use “Solicitar exclusão da conta” e confirme a solicitação. Processaremos a exclusão da conta e dos dados associados que não precisem ser mantidos por obrigação legal ou prevenção a fraude.</p><p>Se você não conseguir entrar, escreva para <a href="mailto:gabriel@proclubsamerica.com">gabriel@proclubsamerica.com</a> usando o e-mail cadastrado.</p></section>
      <section><h2>5. Compartilhamento e visibilidade</h2><p>Nome de exibição, nick, plataforma, posição, disponibilidade, clube vinculado, função, país, dados esportivos publicados, fotos da vitrine, links de vídeo, anúncios e desafios podem ser exibidos a outros usuários. E-mail e telefone do onboarding não são expostos no diretório público. O telefone pode ser consultado pelo titular da conta e pela administração autorizada, não por outros jogadores.</p></section>
      <section><h2>6. Retenção e segurança</h2><p>Conservamos os dados pelo tempo necessário para operar a conta e cumprir obrigações legais. Aplicamos autenticação, autorização por função, políticas de acesso ao banco e transporte criptografado. Nenhuma medida de segurança elimina todos os riscos, por isso não publique informações que não queira tornar públicas.</p></section>
      <section><h2>7. Seus controles</h2><p>Você pode editar as informações públicas da conta, retirar fotos, links e anúncios publicados e desativar notificações no próprio portal. Em Minha conta, “Editar perfil e disponibilidade” permite alterar os dados do onboarding, apagar o telefone e retirar seu perfil da vitrine de jogadores disponíveis. Para dúvidas de privacidade ou solicitações relacionadas à conta, utilize os canais oficiais disponibilizados dentro da plataforma.</p></section>
      <section><h2>8. Menores e alterações</h2><p>O serviço é destinado a usuários que atendam à idade mínima exigida na sua região e pelas regras da Google Play. Esta política pode ser atualizada quando os recursos ou serviços utilizados mudarem; a data no topo indicará a revisão vigente.</p></section>
      <footer><ShieldCheck /><span>Ao usar a plataforma, você também concorda com os <Link href="/termos">Termos da Comunidade</Link>.</span></footer>
    </article>
  </main>;
}
