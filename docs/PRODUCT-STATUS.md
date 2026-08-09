# Produto e estado atual

Atualizado em 9 de agosto de 2026.

## Objetivo

Ser uma plataforma brasileira, mobile-first e instalável para toda a comunidade
de EA SPORTS FC Clubs, com descoberta de clubes, perfis de jogadores, rankings,
gráficos e organização de amistosos verificados pela fonte pública.

## Implementado

| Módulo | Estado | Observação |
| --- | --- | --- |
| PWA | funcional | manifesto, service worker e navegação móvel |
| Busca | funcional | 552 clubes e 8.111 jogadores vinculados |
| Clube | funcional | perfis globais; painel detalhado para `171630` |
| Jogador | funcional | perfis globais e recorte detalhado quando disponível |
| Rankings | funcional | gols, assistências, tackles, win rate e comunidade |
| Partidas | funcional | histórico oficial e filtros por modo |
| Amistosos | backend ativo | convite direcionado, desafio aberto, aceite e estado aguardando EA persistem e sincronizam via Firestore |
| Mercado | backend ativo | vagas e jogadores livres em tempo real; anúncios Pro/VIP têm prioridade |
| Cadastro | backend ativo | conta autenticada, URL EA obrigatória, vínculo de dono e fila pública de até 24 horas |
| Tema e navegação | funcional | claro/escuro, sidebar e menu inferior |
| Importador | funcional para `171630` | estrutura mínima e duplicidade de partidas |
| Crawler automático | não implementado | especificado em `CRAWLER-OPERATIONS.md` |
| Banco comunitário | funcional | Firebase Auth + Firestore com regras por dono/capitão; snapshots esportivos continuam versionados |
| Autenticação | funcional | Google e e-mail/senha no projeto Firebase de produção |
| Comunidades por país | funcional | 12 países, português, espanhol e inglês |
| Página de partida e lobby | backend ativo | horário, escalações e chat em tempo real privado aos clubes participantes |
| Planos | mockup | Free, Pro e VIP sem cobrança habilitada |

## Fonte carregada

O Villathinaikos é o primeiro clube completo. A base global enriquecida contém
552 clubes em três plataformas e 8.111 jogadores vinculados aos seus clubes.

## Regras do produto

- dados apresentados como oficiais precisam existir na fonte;
- gráficos podem derivar métricas, mas nunca inventar eventos;
- nomes de jogadores abrem perfis individuais;
- rankings identificam o time ao lado do jogador;
- tackles por jogo são calculados somente quando tackles e jogos existem;
- o painel do clube mostra forma e elenco antes das partidas e deixa o gráfico
  de evolução de gols no final;
- cada clube mantém Liga, Friendly e Playoff separados;
- resultado de amistoso comunitário só é confirmado após aparecer em Friendly;
- publicar ou aceitar desafio exige conta Firebase e vínculo verificado como dono/capitão;
- convite direcionado só pode ser aceito pelo clube convidado e desafio aberto
  pode ser aceito por qualquer outro clube indexado;
- a plataforma atende múltiplos clubes, não é uma página exclusiva do primeiro
  time cadastrado.

## Próximas entregas recomendadas

1. Extrair o crawler para um worker independente.
2. Generalizar o importador para qualquer `clubId`/plataforma.
3. Persistir snapshots esportivos e histórico de mudanças no backend operacional.
4. Criar fila de clubes e descoberta controlada de adversários.
5. Adicionar painel administrativo para atribuir capitães e moderar cadastros.
6. Fazer o reconciliador de amistosos com a aba Friendly.
7. Adicionar testes de parser com fixtures sanitizadas e testes E2E das rotas.
8. Publicar telemetria de atualização e idade dos dados.

## Critério para produção comunitária

Antes de abrir cadastro público: autenticação, proteção contra abuso, política de
privacidade, moderação, persistência remota, backups e monitoramento. Antes de
chamar a base de atualizada: crawler recorrente, alerta de parser quebrado e
prova da última coleta bem-sucedida.
