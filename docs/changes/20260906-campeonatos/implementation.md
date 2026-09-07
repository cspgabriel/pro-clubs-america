# Campeonatos

Entrega de 06/09/2026. Primeira fatia vertical do módulo de campeonatos, inspirada no
GGClubs (`ggclubs-web`, repo local e `cspgabriel/ggclubs`).

Complementa — e diverge em pontos declarados abaixo — de
[`../20260904-public-landing/tournaments-research.md`](../20260904-public-landing/tournaments-research.md),
que continua sendo a referência de produto para as fases seguintes.

## Decisões do dono do produto (06/09/2026)

1. **Inscrição gratuita agora, paga depois.** A coluna `price_cents` existe e é sempre `0`;
   nenhum checkout a lê. Evita migration nova quando a cobrança entrar — e a pesquisa
   anterior já registra que cobrar exige antes confirmar enquadramento EA e Google Play.
2. **Admin cria; dono de clube propõe e o admin aprova.** Proposta de clube nasce em
   `pending_approval`; a do admin nasce em `draft`.
3. **Formato configurável por edição**, e não um formato único do produto.

## O que foi construído

### Banco — `supabase/migrations/`

- `20260906190000_tournaments.sql` — tabelas `tournaments`, `tournament_registrations`,
  `tournament_matches`. RLS ligada, `revoke all` de `anon`/`authenticated`, acesso só por
  `service_role`: mesma postura de `club_invitations`, porque a sessão é Firebase e não
  existe `auth.uid()` do Supabase.
- `20260906190100_tournament_functions.sql` — `can_manage_club`,
  `register_club_in_tournament`, `withdraw_club_from_tournament`, `review_tournament`,
  `apply_tournament_draw`, `seed_tournament_knockout`, `recalc_tournament_standings`,
  `report_tournament_match`. Tudo `security definer` com `for update`, para chaveamento e
  avanço acontecerem em transação.
- `20260906200000_tournament_match_reports.sql` — súmula bilateral (ver abaixo). Adiciona
  `tournament_match_reports`, o estado `disputed`, as colunas `result_source`,
  `disputed_at`, `resolved_by_profile_id` e `resolution_note`, mais
  `apply_tournament_match_result`, `submit_tournament_match_report` e
  `resolve_tournament_match`. **Derruba `report_tournament_match`**, que era o modelo
  unilateral.

### Súmula bilateral

O primeiro desenho deixava o primeiro capitão a lançar o placar defini-lo, e o adversário
sem como contestar. Num ambiente competitivo isso é explorável: quem perde tem incentivo
para lançar antes e mentir.

Agora **cada clube lança a sua súmula**, sempre na perspectiva do confronto
(mandante × visitante), nunca na de quem está lançando — é o que permite comparar as duas
sem inverter nada.

- Súmulas iguais confirmam o resultado sozinhas (`result_source = 'agreed'`), sem ninguém
  no meio, e disparam a progressão da chave na mesma transação.
- Súmulas diferentes põem o confronto em `disputed`. Ninguém avança até a organização
  decidir.
- A arbitragem (`resolve_tournament_match`) exige **justificativa de no mínimo 5
  caracteres**, gravada em `resolution_note` e exibida na tela. Decisão de árbitro sem
  motivo escrito é o que transforma disputa de placar em disputa de confiança.
- Admin não lança súmula por ninguém: para corrigir existe a arbitragem, que deixa rastro.
- O mesmo caminho serve para registrar W.O. (`p_walkover`), que era outra lacuna.

`apply_tournament_match_result` é o núcleo compartilhado pelo acordo automático e pela
arbitragem — os dois caminhos gravam placar, recalculam a tabela e avançam a chave pelo
mesmo código, para nunca divergirem.

As duas súmulas ficam visíveis para todo mundo na tela do campeonato: é o que deixa claro
por que um jogo está em disputa, sem ninguém ter de perguntar.

**Aplicadas em produção em 07/09/2026** (projeto Supabase `mdqtlkvkpacjouwgtibr`,
`proclubsamerica`). O workflow de deploy não aplica migrations neste repositório — foram
rodadas à mão, depois do push. Estado conferido no banco: 4 tabelas, 10 funções, RLS
ligada nas 4, e nenhum resíduo de `report_tournament_match`.

Duas observações para quem replicar do zero:

- `report_tournament_match` **não chegou a ser criada em produção**. Ela nasce na migration
  2 e morre na 3; criá-la para derrubá-la segundos depois abriria uma janela em que o
  modelo unilateral — o furo que a súmula bilateral corrige — estaria vivo e chamável se a
  migration 3 falhasse. Um replay do zero cria e derruba; o estado final é o mesmo.
- `can_manage_club` ganhou `set search_path = public` depois que o linter de segurança do
  Supabase acusou `function_search_path_mutable`. O arquivo já está corrigido; em produção
  isso entrou como uma quarta migration.

### Motor — `functions/_lib/tournaments.ts`

A ideia central copiada do GGClubs é a **escada elástica**: em vez de fixar 16 vagas e
cancelar a edição quando aparecem 13 clubes, o admin declara vários tamanhos e o sorteio
desce até o degrau que cabe nos inscritos.

- `validateFormat` / `isPlayableBracket` — um degrau só vale se `grupos × classificados
  + melhores terceiros` for potência de dois.
- `buildKnockoutSkeleton` — árvore com `next_match_id` já resolvido no sorteio, para a
  progressão não ser recalculada a cada resultado.
- `buildDraw` — grupos (rodízio pelo método do círculo), mata-mata direto e pontos
  corridos com turno e returno.
- `buildKnockoutSeeding` — classificados ordenados por posição no grupo, chave montada
  cabeça-contra-lanterna, com troca quando o par sairia do mesmo grupo.
- `compareStandings` — pontos, saldo, gols pró, vitórias, nome. **Confronto direto não
  entra**: com grupos de 3 ou 4 em rodada única o critério vira ambíguo em triplo empate.

Optamos por escrever o motor em vez de usar `brackets-manager.js`, como a pesquisa
sugeria: a biblioteca exigiria adaptador de armazenamento próprio e spike de
compatibilidade com Workers, e não cobre a escada elástica, que é justamente a parte que
queríamos do GGClubs.

### API — `functions/api/community/`

- `tournaments.ts` — `GET` (lista pública; admin enxerga rascunho e fila) e `POST`
  (criar/propor).
- `tournaments/[id].ts` — `GET` detalhe (inclui as súmulas de cada confronto); `POST` ações
  de participante (`register`, `withdraw`, `report`); `PATCH` ações de organização
  (`approve`, `reject`, `publish`, `close`, `draw`, `seed_knockout`, `resolve`, `cancel`).

### Front — `src/`

- `lib/tournaments-service.ts`, `components/tournaments-page.tsx`,
  `components/tournament-detail.tsx`, `components/tournament-route.tsx`,
  `components/tournaments.module.css`.
- Rotas `/campeonatos` e `/campeonato/?id=slug`. A query em vez de `/campeonatos/[slug]`
  é imposição do `output: "export"` do `next.config.ts`: rota dinâmica exigiria conhecer
  todos os slugs em build, e campeonato novo nasce depois do deploy. Mesmo padrão de
  `/time/?id=`.
- Link "Campeonatos" no grupo COMPETIÇÃO de `navigationGroups`. O `mobile-nav` ficou
  intacto porque o CSS o fixa em `repeat(4,1fr)`.
- Toda data é exibida em `America/Sao_Paulo` e a tela diz o fuso: "começa 21:00" é uma
  frase sobre um instante só, combinada entre gente que joga junto.

### Integração com a HOME do app (06-07/09/2026)

Tudo abaixo vive em `CommunityHome`, ou seja em **`/inicio`**:

- **Aba "Meu time"** no bloco de atalhos: leva a `/conta/time` para quem já tem clube
  (mostrando o nome dele) e a `/cadastro` para quem ainda não vinculou.
- **Aba "Campeonatos"** ao lado, com a contagem de edições com inscrição aberta.
- **Seção "Campeonatos com inscrição aberta"** acima dos desafios de amistoso, com até 3
  edições. Ela **falha em silêncio**: se a API der erro a seção some e o resto da home
  continua de pé — foi o que segurou a página na janela entre o deploy e as migrations.

**A raiz `/` continua sendo a landing `PublicHome`.** Ela chegou a ser trocada pela HOME do
app numa iteração desta sessão e foi **revertida byte a byte** no mesmo dia: a landing tem
hero, busca e a apresentação do produto, e trocá-la pela home logada empobreceu a porta de
entrada. Fica o registro para ninguém refazer a troca achando que é melhoria.

O `.home-action-duo` também voltou a `1fr 1fr`: eu o havia trocado por
`repeat(auto-fit,minmax(210px,1fr))` para "caber" os quatro atalhos, e o resultado foi
pior — em telas largas os cards quebravam 3+1, com um buraco no fim da linha. Com duas
colunas fixas os quatro fecham 2×2.

### Avisos por push (07/09/2026)

Um campeonato trava em silêncio: a súmula fica esperando um adversário que não sabe que
precisa lançar, e a disputa fica esperando uma organização que não sabe que existe. Os
três momentos notificados são exatamente os que impedem a edição de andar:

| Quando | Quem recebe |
|---|---|
| Um clube lança a súmula e falta a do outro | dono e capitão do adversário |
| As duas súmulas divergem | quem organiza a edição |
| O sorteio sai | dono e capitão de todos os clubes sorteados |

Só dono e capitão recebem — são os mesmos que podem agir. Avisar o elenco inteiro sobre uma
súmula que só o capitão lança seria barulho.

Tudo roda em `context.waitUntil` com `.catch()`: **aviso que falha não derruba a ação que
já deu certo**. E `pushConfigured` é checado antes, para o módulo não quebrar em ambiente
sem chaves VAPID.

## Evidência de conclusão

- `npm run lint` — 0 erros (7 warnings de `<img>` pré-existentes em outros arquivos).
- `npm run build` — compilado; `/campeonatos` e `/campeonato` presentes em `out/`.
- `npm run check:functions` — Worker compilado.
- Motor verificado com script descartável: 62 asserções sobre integridade da árvore
  (4/8/16/32 clubes), rodízio sem confronto repetido nem clube jogando duas vezes na mesma
  rodada, mando equilibrado na liga, escada descendo o degrau certo, e recusa de formato
  inválido. Mais 2.000 sorteios aleatórios de semeadura: zero reedições de grupo na estreia.
- **Não testado contra banco real** — as migrations ainda não foram aplicadas.

## O que esta entrega NÃO faz

Itens que a pesquisa de 04/09 prevê e que continuam abertos:

- `tournament_staff` (multi-organizador), `tournament_rosters` (elenco congelado),
  check-in, `tournament_events` e outbox de notificação.
- **E-mail** nos mesmos momentos. O push já está ligado (ver abaixo); o e-mail exigiria um
  `EmailFlow` novo e template em `functions/_lib/email.ts`, com o fluxo de consentimento
  que já existe lá.
- **Evidência em storage privado.** `tournament_match_reports.evidence_url` já existe e a
  API já a aceita, mas não há upload: hoje é uma URL que o capitão cola. Falta o storage
  com URL temporária, limite de tipo/tamanho e moderação.
- Prazo para a disputa: a pesquisa prevê janela para o adversário responder. Hoje um
  confronto pode ficar em `awaiting_result` indefinidamente se um lado nunca lançar.
- Capacidade `tournaments.organize` atrelada a plano pago.
- Desistência depois do sorteio (o clube some da chave). O W.O. já é registrável pela
  arbitragem, mas não há fluxo automático de abandono.
