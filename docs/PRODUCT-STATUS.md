# Produto e estado atual

Atualizado em 10 de agosto de 2026.

## Objetivo

Ser uma plataforma brasileira, mobile-first e instalável para toda a comunidade
de EA SPORTS FC Clubs, com descoberta de clubes, perfis de jogadores, rankings,
gráficos e organização de amistosos verificados pela fonte pública.

## Implementado

| Módulo | Estado | Observação |
| --- | --- | --- |
| PWA | funcional | manifesto, service worker e navegação móvel |
| Busca | funcional | 553 clubes e 8.098 jogadores válidos e únicos vinculados |
| Clube | funcional | perfis globais; painel detalhado para `171630` |
| Jogador | funcional | vínculo por URL pública EA, carreira e até 10 atuações oficiais quando publicadas |
| Rankings | funcional | gols, assistências, tackles, win rate e comunidade |
| Partidas | funcional | histórico oficial e filtros por modo |
| Amistosos | backend ativo | convite direcionado, desafio aberto, aceite e estado aguardando EA persistem no Supabase |
| Mercado | backend ativo | vagas e jogadores livres em tempo real; anúncios Pro/VIP têm prioridade |
| Cadastro | backend ativo | conta autenticada, URL EA obrigatória, vínculo de dono e fila pública de até 24 horas |
| Tema e navegação | funcional | dark padrão, sidebar e menu inferior |
| Importador | funcional para `171630` | estrutura mínima e duplicidade de partidas |
| Ingestão EA | backend ativo | fila, snapshots, deduplicação, health e endpoint assinado no Supabase |
| Coletor automático | ativo, parser em observação | Cloudflare Browser Rendering a cada 2h; execução real ainda sem dados observados e corretamente marcada como falha |
| Banco comunitário | funcional | Firebase Auth para identidade e Supabase para toda persistência; autorização por dono/capitão nas Pages Functions |
| Autenticação | funcional | Google e e-mail/senha no projeto Firebase de produção |
| Domínio | funcional | `proclubsamerica.com` e `www` com SSL; `www` redireciona por 301 ao domínio raiz |
| Comunidades por país | funcional | 12 países, português, espanhol e inglês |
| Página de partida e lobby | backend ativo | horário, escalações e chat em tempo real privado aos clubes participantes |
| Mobile | pacotes gerados | APK/AAB v2 e projeto iOS/Xcode para `proclubsamerica.com`; chave Android reutilizável e Digital Asset Links correspondente |
| Planos | mockup | Free, Pro e VIP sem cobrança habilitada |

## Fonte carregada

O Villathinaikos é o primeiro clube completo. A base global enriquecida contém
553 clubes em três plataformas e 8.098 identidades válidas e únicas de jogadores
vinculadas aos seus clubes no Supabase.

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

1. Obter uma resposta completa da fonte pública no Browser Rendering e provar uma execução real `succeeded`; o componente já resolve e dispara as três requisições esperadas, mas a saída Cloudflare ainda não recebe a resposta antes do timeout.
2. Generalizar a coleta por página de Overview e Member List, além das partidas.
3. Adicionar painel administrativo para atribuir capitães e moderar cadastros.
4. Adicionar fixtures sanitizadas e testes de regressão para cada versão do parser.
5. Configurar alertas sobre idade do dado e quebra de parser.
6. Regenerar os pacotes mobile usando o domínio canônico `proclubsamerica.com`.

## Critério para produção comunitária

Antes de abrir cadastro público: autenticação, proteção contra abuso, política de
privacidade, moderação, persistência remota, backups e monitoramento. Antes de
chamar a base de atualizada: crawler recorrente, alerta de parser quebrado e
prova da última coleta bem-sucedida.
