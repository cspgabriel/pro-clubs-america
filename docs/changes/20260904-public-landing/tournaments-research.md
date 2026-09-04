# Campeonatos criados pelos usuários no plano pago

Pesquisa em 04/09/2026. Proposta de produto, não funcionalidade publicada. Sem criação de pagamentos, planos externos ou prêmios.

## Recomendação

Cobrar pelo painel do organizador, não pela participação: assinante cria e administra campeonatos; capitães inscrevem os clubes gratuitamente; espectadores veem tabela e jogos sem conta. Começar com competições online sem dinheiro/prêmio material. Isso reduz complexidade de pagamentos, mas não dispensa verificar regras da EA e das lojas antes de vender o recurso.

Expor uma capacidade `tournaments.organize` associada ao plano escolhido, validada no servidor. Sugestão comercial inicial: incluir no Clube Pro existente, sem alterar preço até aprovação. Hipótese de limite para piloto: um campeonato simultâneo e até 16 clubes; ajustar após medir suporte e adoção, não apresentar como limite já contratado.

## Jornada simples

1. Página Campeonatos: cards com inscrições abertas, meus torneios e botão **Criar campeonato**. O formulário só abre ao clicar.
2. Assistente curto: nome/capa/região/fuso/geração; formato/datas/regras; revisar/publicar. Configurações avançadas recolhidas.
3. Organizador compartilha convite; capitão escolhe clube já vinculado e confirma elenco. Uma inscrição por clube; bloqueio de geração incompatível e elenco congelado no início.
4. Check-in; sorteio registrado; tabela/chave gerada. Mudanças de regras após abertura exigem versão e aviso; após início, não alterar silenciosamente.
5. Partida tem horário, adversário, conversa e botão **Informar resultado**. Cada capitão envia placar e evidência.
6. Placares compatíveis confirmam resultado comunitário; divergência abre disputa com prazo. Organizador decide com justificativa e trilha de auditoria. Empate no mata-mata requer critério explícito, prorrogação/pênaltis quando aplicável.
7. Tabela/chave atualizada de forma atômica; notificações de confronto e resultado pendente; campeão e arquivo público ao encerrar.

Nunca rotular súmula bilateral como “verificada pela EA”. Estatísticas externas podem complementar a análise quando disponíveis, sem bloquear o campeonato pela indisponibilidade da fonte. Esse modo é separado da atual validação dos amistosos por histórico EA.

## Formatos e motor

MVP: mata-mata simples e pontos corridos. Fase seguinte: grupos + mata-mata. Adiar dupla eliminação, suíço, saldo agregado complexo e premiação financeira.

`brackets-manager.js` é uma biblioteca TypeScript com licença MIT, pontos corridos, eliminação simples/dupla, múltiplas fases, BYEs e W.O. Permite adaptar armazenamento, mas não entrega o painel completo nem as regras específicas do nosso produto. Proposta: usar apenas o motor no servidor, com versão fixada, teste de compatibilidade Cloudflare e adaptador transacional próprio; interface React/PCA. [Repositório e documentação](https://github.com/Drarig29/brackets-manager.js).

Alternativa: Toornament oferece API para torneios, inscrições, participantes e resultados. Reduz desenvolvimento do motor, porém adiciona fornecedor, autorização e condições comerciais de API a confirmar. Não assumir plano gratuito nem preço de API. [API Tournament](https://developer.toornament.com/v2/doc/tournament_overview), [Match API](https://developer.toornament.com/v2/doc/organizer_matches).

## Encaixe na base atual

O repositório já tem Next.js/Cloudflare Pages, identidade Firebase verificada no backend, comunidade Supabase e implementação Stripe em `functions/api/billing/checkout.ts`, `webhook.ts` e `functions/_lib/billing.ts`. Isso comprova código disponível, não operação comercial em produção. Não migrar de provedor só para implementar torneios.

Dados sugeridos: `tournaments`, `tournament_staff`, `tournament_registrations`, `tournament_rosters`, `tournament_stages`, `tournament_matches`, `match_reports`, `match_disputes`, `tournament_events` e outbox de notificações. IDs da comunidade reutilizados; elenco e regulamento versionados no campeonato. Esses são dados gerados pela comunidade, portanto pertencem ao Supabase, não ao cache EA.

API: criar/editar/publicar, inscrever/aceitar/rejeitar, check-in, sortear, lançar súmula, resolver disputa e finalizar. Rota pública proposta `/campeonatos/[slug]`, com abas Resumo, Jogos, Tabela e Regras. Nenhuma dessas rotas/tabelas foi criada nesta entrega.

## Autorização, integridade e assinatura

- Autenticação identifica a pessoa; assinatura habilita ferramenta; papel no campeonato autoriza ações. Nenhuma dessas verificações substitui as outras.
- Participante só informa resultado do próprio confronto; capitão só inscreve o clube que pode representar; organizador A não acessa dados privados nem edita torneio B.
- Não confiar em `organizerId`, plano ou resultado enviados pelo navegador. Firebase UID verificado resolve perfil no servidor. RLS/SQL compatíveis com a arquitetura existente: não pressupor `auth.uid()` do Supabase para uma sessão Firebase. Service role nunca no cliente.
- Chaveamento, avanço e confirmação de resultado em transação com versão/lock e idempotência. Reenvio de webhook ou súmula não pode duplicar classificação. Correções que afetem partidas seguintes exigem fluxo explícito, nunca sobrescrita silenciosa.
- Evidências em storage privado com URLs temporárias, limites de arquivo/tipo e acesso por participante/staff; denúncia e moderação. Nenhum telefone/e-mail público por padrão.
- Renovação/expiração de plano por estado confirmado no backend. Stripe documenta eventos de assinatura e `invoice.paid`; não liberar recurso apenas pelo retorno de sucesso do checkout. Cancelamento, inadimplência, eventos fora de ordem e duplicados precisam de testes. [Stripe: webhooks de assinaturas](https://docs.stripe.com/billing/subscriptions/webhooks).
- Plano expirado: bloquear criação de novos campeonatos; manter leitura e definir previamente continuidade/transferência do torneio em andamento para não prejudicar participantes. Política comercial ainda a aprovar.

## Limites importantes antes da comercialização

A página oficial encontrada tem FC 24 no endereço e descreve torneios comunitários não comerciais. Prevê Clubs somente online e restrições de marcas de clubes/ligas reais, além de limites de taxas e prêmios. Não assumir que uma assinatura de organizador comercial está automaticamente autorizada, nem que o texto resolve todos os países/edições. Confirmar enquadramento com EA e assessoria apropriada antes de lançar cobrança pelo módulo. [Diretrizes oficiais EA](https://www.ea.com/games/ea-sports-fc/fc-pro/ea-sports-fc-24-community-tournament-guidelines).

A política Google Play restringe apps que facilitam participação com dinheiro em troca de prêmios reais, incluindo navegação/WebViews. Portanto, inscrição paga com premiação não é uma extensão automática de um SaaS de organização. Não usar link externo como contorno. [Concursos e torneios com dinheiro real](https://support.google.com/googleplay/android-developer/answer/9877032?hl=pt-BR).

Assinatura de recurso digital dentro do app Android também exige analisar a política de faturamento e os programas aplicáveis a cada mercado, além do checkout web existente. Não presumir que Stripe embutido no APK esteja permitido. [Política de pagamentos Google Play](https://support.google.com/googleplay/android-developer/answer/9858738?hl=pt-BR).

## Etapas de implementação propostas

1. Aprovar capacidade/plano/limites e regras comerciais; confirmar enquadramento EA/lojas.
2. Modelo e autorização multi-organizador; rascunho, publicação, inscrições e papéis.
3. Motor de tabela/chave + fluxo de súmula bilateral/disputa com evidência.
4. Notificações e calendário; piloto sem cobrança por entrada nem premiação material.
5. Ativar comercialização só depois de testes de assinatura, antifraude, suporte e conformidade.

QA obrigatório: torneios 4/8/16 clubes e número ímpar/BYE; empate, W.O., desistência, duplicação de inscrição, prazo perdido; duas súmulas simultâneas iguais/divergentes; correção de resultado; geração incompatível; acesso cruzado de organizadores; conta free chamando API paga; webhook duplicado/atrasado; mobile 375px e navegador. Sem estimar prazo/preço antes dessa definição e do spike do motor.
