# Modelo de dados

A definição TypeScript vigente está em `src/types/domain.ts`. O exemplo mínimo
de importação está em `data/example-normalized.json`.

## Entidades

## Snapshots globais

`data/pro_clubs_rankings_all_time.json` organiza clubes por plataforma. A camada
`src/lib/public-data.ts` converte strings numéricas, calcula win rate, monta a
URL pública do clube e resolve a URL do escudo pelo `crestAssetId`.

`data/pro_clubs_top_teams_players.json` é indexado por
`{platform}_{clubId}`. Seus jogadores recebem IDs de rota compostos por
plataforma, clube, nome normalizado e posição no snapshot, evitando colisões
entre atletas com o mesmo nome em clubes diferentes.

### Clube

Chave recomendada: `platform + club.id`.

Contém identidade, URL da fonte, escudo e resumo oficial. Vitórias, empates,
derrotas e totais da visão geral são dados observados, não recalculados a partir
do recorte recente.

### Jogador

Contém estatísticas acumuladas publicadas na lista de integrantes. `id` é a
chave de rota atual. Em produção, deve ser preservado por clube/temporada porque
nomes públicos podem mudar ou colidir.

### Partida

`MatchRecord` mantém:

- `id` único e determinístico;
- `mode`: `leagueMatch`, `friendlyMatch` ou `playoffMatch`;
- `playedAt` em ISO 8601;
- clubes, placar, competição e URL de origem;
- lista de `PlayerMatchStats` apenas quando publicada.

Um ID de produção pode ser derivado de plataforma, clube, modo, horário,
adversário e placar, com hash do conteúdo para resolver colisões.

## Estado da fonte

| Estado | Significado |
| --- | --- |
| `pending` | nenhuma coleta válida disponível |
| `partial` | parte das páginas/modos foi coletada |
| `complete` | todas as páginas e abas previstas foram verificadas naquela execução |

`complete` não significa que a EA forneceu todas as métricas possíveis; significa
somente que o ciclo de coleta planejado terminou sem lacunas conhecidas.

## Métricas derivadas

Calculadas em `src/lib/stats.ts`:

- saldo de gols = gols pró − gols contra;
- aproveitamento = vitórias ÷ jogos × 100;
- participações = gols + assistências;
- forma recente = resultado de cada partida do recorte;
- médias por jogo no perfil do jogador;
- evolução de gols e notas para os gráficos.

Quando há totais oficiais de carreira, partidas recentes não são somadas
novamente. Isso impede duplicidade entre a lista de integrantes e o histórico.

## Política de valores ausentes

- `null` ou campo omitido: a fonte não publicou/foi impossível confirmar;
- `0`: a fonte publicou zero;
- `—` na interface: representação visual de valor ausente;
- nunca estimar nota, placar, gol ou assistência.

## Friendly verificado

O mural pode avançar de `searching` para `scheduled` e `waiting_ea`. O estado
`verified` deve ser atribuído somente após correspondência com uma partida
`friendlyMatch` coletada da EA, usando clubes, janela de data/hora e placar
publicado. Não existe entrada manual de resultado verificado.

## Cadastros comunitários locais

Enquanto não há backend, três coleções ficam isoladas em `localStorage`:

- `clubs-brasil-team-registrations`: solicitações de clube por URL EA;
- `clubs-brasil-friendly-requests`: disponibilidade para amistosos;
- `clubs-brasil-transfer-market`: vagas em clubes e jogadores livres.

Essas coleções são protótipos do navegador e não constituem cadastro público
sincronizado. A migração para produção exige autenticação, validação no servidor,
moderação, banco e trilha de auditoria.
