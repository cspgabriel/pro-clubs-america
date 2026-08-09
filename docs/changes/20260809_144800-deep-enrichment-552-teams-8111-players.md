---
title: "Enriquecimento Completo de 552 Times e 8.111 Jogadores das Abas História e Temporada do EA FC Pro Clubs"
date: "2026-08-09T14:48:00-03:00"
author: "Luciana Aguiar"
type: "feat"
tags: ["pro-clubs", "ea-sports", "scraping", "datasets", "elencos", "jogadores"]
---

# Resumo

Extração e enriquecimento profundo de dados de todos os **100 times listados na aba História (All-Time Leaderboard)** e todos os **100 times listados na aba Temporada Atual (Current Season Leaderboard)** nas 3 plataformas suportadas pela EA (`common-gen5`, `common-gen4`, `nx`). No total, **552 times únicos** foram auditados e **8.111 jogadores** tiveram suas estatísticas individuais de carreira extraídas e compiladas.

# Detalhes das Alterações

- **Novos Datasets Criados em `data/`:**
  - `pro_clubs_all_time_leaderboard_enriched.json`: Leaderboards de história completos de todas as 3 plataformas.
  - `pro_clubs_seasonal_leaderboard_enriched.json`: Leaderboards da temporada atual (`currentSeasonLeaderboard`) de todas as 3 plataformas.
  - `pro_clubs_all_teams_detailed.json`: Objeto hierárquico contendo informações completas de metadata, info e elenco dos 552 times únicos.
  - `pro_clubs_all_teams_summary.csv`: Tabela consolidada com vitórias, derrotas, empates, gols marcados/sofridos, saldo, reputação e posições.
  - `pro_clubs_all_players_full.csv`: Tabela analítica completa com **8.111 jogadores**, registrando jogos, gols, assistências, notas, MoTM, desarmes, passes e clean sheets.
  - `pro_clubs_all_matches.json`: Registros e históricos de partidas recentes.
- **Relatório Executivo:** `docs/ea_pro_clubs_report.md` atualizado com métricas agregadas por plataforma e totalizadores de dados.

# Motivo

Atendimento integral à solicitação do usuário: *"enriqueça os dados com TODOS OS DADOS DOS 100 TIMES QUE MOSTRAM NA HISTORIA + TEMPORADA (ABA), ENTRE EM TODOS OS TIMES E EXTRAIA TUDO DELES"*.

# Como Testar

1. Abrir e verificar os arquivos CSV e JSON gerados na pasta `data/` do repositório `cspgabriel/pro-clubs-pro-player`.
2. Executar buscas por times e jogadores específicos dentro dos arquivos `pro_clubs_all_teams_summary.csv` e `pro_clubs_all_players_full.csv`.
3. Validar a execução do script `scripts/download_by_club_id.py` para consultas de clubes individuais.

# Resultados Observados

- **Total de Times Únicos Mapeados:** 552 equipes (`common-gen5`: 162 | `common-gen4`: 193 | `nx`: 197).
- **Total de Jogadores Mapeados:** 8.111 membros ativos com métricas completas de carreira.

# Links

- Repositório GitHub: [cspgabriel/pro-clubs-pro-player](https://github.com/cspgabriel/pro-clubs-pro-player)
- Fonte EA Sports FC: [EA Pro Clubs Rankings](https://www.ea.com/pt-br/games/ea-sports-fc/clubs/rankings)

# Próximos Passos

- Commit e `git push origin main` para publicar o repositório atualizado.
- Sincronização do log no Cofre Obsidian do usuário.
