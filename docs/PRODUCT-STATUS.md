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
| Busca | funcional | 106 clubes navegáveis e 175 jogadores combinados |
| Clube | funcional | perfis globais; painel detalhado para `171630` |
| Jogador | funcional | perfis globais e recorte detalhado quando disponível |
| Rankings | funcional | gols, assistências, tackles, win rate e comunidade |
| Partidas | funcional | histórico oficial e filtros por modo |
| Amistosos | protótipo local | anúncios persistem no navegador via `localStorage` |
| Mercado | protótipo local | vagas em clubes e jogadores livres |
| Cadastro | protótipo local | URL EA obrigatória e fila de até 24 horas |
| Tema e navegação | funcional | claro/escuro, sidebar e menu inferior |
| Importador | funcional para `171630` | estrutura mínima e duplicidade de partidas |
| Crawler automático | não implementado | especificado em `CRAWLER-OPERATIONS.md` |
| Banco multi-clube | não implementado | snapshot atual é um JSON versionado |
| Autenticação | não implementada | necessária antes de mural comunitário público |

## Fonte carregada

O Villathinaikos é o primeiro clube completo. A base global contém 299 clubes
em três plataformas e 166 jogadores dos elencos de destaque `common-gen5`.

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
- a plataforma atende múltiplos clubes, não é uma página exclusiva do primeiro
  time cadastrado.

## Próximas entregas recomendadas

1. Extrair o crawler para um worker independente.
2. Generalizar o importador para qualquer `clubId`/plataforma.
3. Adotar banco com snapshots, partidas idempotentes e histórico de mudanças.
4. Criar fila de clubes e descoberta controlada de adversários.
5. Persistir e moderar cadastro, mercado e mural com autenticação.
6. Fazer o reconciliador de amistosos com a aba Friendly.
7. Adicionar testes de parser com fixtures sanitizadas e testes E2E das rotas.
8. Publicar telemetria de atualização e idade dos dados.

## Critério para produção comunitária

Antes de abrir cadastro público: autenticação, proteção contra abuso, política de
privacidade, moderação, persistência remota, backups e monitoramento. Antes de
chamar a base de atualizada: crawler recorrente, alerta de parser quebrado e
prova da última coleta bem-sucedida.
