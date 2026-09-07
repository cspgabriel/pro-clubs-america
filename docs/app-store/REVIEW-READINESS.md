# Pro Clubs America — preparação da ficha Apple

Data: 2026-09-07. Escopo: copy em português e verificação das fontes do repositório. Este documento não comprova upload, revisão ou aprovação Apple.

## Ficha preparada

`pt-BR.json` contém nome, subtítulo, palavras-chave, texto promocional, descrição, URLs conhecidas, categorias sugeridas e notas de revisão. É um documento editorial; não é um payload direto da API Apple. As categorias ainda precisam ser selecionadas no App Store Connect. As notas devem ser finalizadas depois dos testes do binário e das contas de revisão.

Fontes: `README.md`, `docs/DEPLOYMENT.md`, `src/lib/seo.ts`, `src/app/privacidade/page.tsx`, `src/app/termos/page.tsx`, `src/components/auth-screen.tsx` e `src/lib/auth-client.ts`. A copy evita contagens de usuários e promessas de atualização em tempo real. Ela informa a independência do projeto e as limitações das fontes esportivas.

| Campo | Evidência em 2026-09-07 |
| --- | --- |
| Privacidade | GET público sem cookies em https://proclubsamerica.com/privacidade retornou HTTP 200, com URL final https://proclubsamerica.com/privacidade/. A página existe no código. |
| Suporte | `support_url` está nulo. Não foi localizada página com orientação de suporte geral. `/privacidade` publica gabriel@proclubsamerica.com especificamente para solicitação de exclusão de conta/dados; isso não comprova cobertura de atendimento geral. Confirmar um canal de ajuda e a URL pública que o apresenta, aproveitando uma página existente se adequado. |

O HTTP 200 comprova resposta pública, não renderização completa, entrega de e-mail ou correspondência entre o SHA local e o publicado. Não utilizar uma URL de suporte inventada para completar a ficha.

## Campos e evidências ainda necessários

| Item | Estado observado e próximo passo |
| --- | --- |
| App Privacy | Não preenchido nesta tarefa. Inventariar coleta real do binário, web e SDKs: conta, perfis públicos, fotos, contatos opcionais, anúncios, candidaturas, notificações, diagnóstico e analytics. Confirmar finalidade, vínculo com identidade e tracking; não inferir rótulos apenas do manifesto ou da política. |
| Classificação etária | Questionário não verificado no App Store Connect. Considerar o conteúdo efetivamente acessível, perfis públicos, textos/imagens enviados e interações comunitárias. Não presumir idade mínima. |
| Conta e contato de revisão | Validar contas e clubes fictícios autorizados, com papéis de jogador e responsável pelo clube quando necessário. Preparar dados de teste e contato do responsável. Fornecer credenciais somente no campo privado de revisão. Testes não devem enviar convites ou mensagens a usuários reais. |
| Direitos sobre conteúdo | Confirmar direitos de marca, ícone, screenshots, escudos, dados esportivos e conteúdo exibido. Acesso público à fonte e aviso de não afiliação não comprovam licença. Conferir a declaração de direitos no App Store Connect. |
| Conteúdo da comunidade | O produto inclui perfis, anúncios, imagens, candidaturas e desafios. Testar o comportamento de denúncia, bloqueio e moderação disponível na versão final e documentar canais de atendimento; a existência dos termos não comprova essas funções. |
| Screenshots e versão | Produzir capturas reais do binário candidato e conferir identidade, versão, dispositivos e telas com o build carregado. Usar perfis autorizados ou fictícios, sem dados privados. |
| Login | Web oferece e-mail/senha e Google. Validar ambos no wrapper e registrar o fluxo final. Não há comprovação nesta tarefa de Sign in with Apple; avaliar o fluxo e regras aplicáveis antes de fechar a submissão. |
| Exclusão da conta | A política aponta solicitação por e-mail. Não foi comprovado fluxo de exclusão dentro do binário. Testar o caminho real e documentar o tratamento de conta, imagens e anúncios. |
| Pagamentos | README descreve `/planos` como mockups com pagamentos desativados, enquanto a política menciona Stripe de forma condicional. Confirmar o estado do serviço e das telas acessíveis na versão iOS; não anunciar assinaturas, IAP ou gratuidade permanente sem validação. |
| Dados e recursos nativos | Testar indisponibilidade/atraso da fonte esportiva, abertura de links, imagens, compartilhamento e permissões no binário. Push nativo e funcionamento offline não foram comprovados e não são prometidos na copy. |
| Identidade e declarações comerciais | Confirmar vendedor, copyright, disponibilidade territorial, preço, conformidade de exportação e demais declarações na conta Apple; não foram preenchidos por inferência. |

Próximo passo: confirmar uma URL de suporte, validar o binário e os roteiros com contas fictícias, completar as declarações na conta Apple e atualizar as notas de revisão com o comportamento confirmado.
