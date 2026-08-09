---
title: Extração e Adição dos Dados Oficiais do EA SPORTS FC Pro Clubs
date: 2026-08-09
author: Antigravity Agent
description: "Inclusão das estatísticas completas extraídas do EA FC Pro Clubs (Rankings All-Time, Estatísticas de Jogadores, Plataformas e Script de Download por Club ID)"
tags: [pro-clubs, ea-sports-fc, data-extraction, json, csv, python]
---

# Resumo

Foram extraídos todos os dados oficiais de rankings, elencos de jogadores e estrutura de ligas do portal da EA Sports FC Pro Clubs (`https://www.ea.com/pt-br/games/ea-sports-fc/clubs/rankings`) e estruturados nos formatos JSON e CSV para integração no repositório `pro-clubs-america`.

# Detalhes das Alterações

- **Novos Arquivos de Dados (`data/`):**
  - `data/pro_clubs_rankings_all_time.json`: Base completa em JSON contendo 299 clubes ranqueados das plataformas `common-gen5`, `common-gen4` e `nx`.
  - `data/pro_clubs_rankings_all_time.csv`: Tabela formatada em CSV com pontuação, skill rating, vitórias/empates/derrotas, gols e divisões dos clubes.
  - `data/pro_clubs_top_teams_players.json`: Estatísticas individuais dos jogadores/membros dos principais clubes (gols, assistências, MoTM, avaliação).
  - `data/pro_clubs_top_teams_players.csv`: Tabela CSV dos elencos e métricas de desempenho dos jogadores.
  - `data/pro_clubs_platforms_leagues.json`: Metadados das plataformas suportadas e estrutura de divisões da liga.

- **Documentação e Scripts (`docs/` e `scripts/`):**
  - `docs/ea_pro_clubs_report.md`: Relatório completo consolidado em Markdown com tabelas do Top 10 por plataforma e análises de desempenho.
  - `scripts/download_by_club_id.py`: Script Python utilitário para realizar requisições diretas na API do Pro Clubs informando um `Club ID`.

# Motivo

Atender à solicitação do usuário de extração e persistência contínua dos dados oficiais do EA SPORTS FC Pro Clubs no repositório GitHub do projeto.

# Como Testar

1. Inspecione os arquivos JSON em `data/pro_clubs_rankings_all_time.json` e `data/pro_clubs_top_teams_players.json`.
2. Abra os relatórios em `docs/ea_pro_clubs_report.md`.
3. Execute o script de download individual:
   ```bash
   python scripts/download_by_club_id.py 123762 common-gen5
   ```

# Resultados Observados

- 299 clubes capturados com dados completos de desempenho.
- Estatísticas detalhadas de mais de 40 jogadores do Top 15 mundial salvas com sucesso.
- Estrutura pronta para visualização no dashboard do `pro-clubs-america`.

# Links

- **Fonte Oficial:** [https://www.ea.com/pt-br/games/ea-sports-fc/clubs/rankings](https://www.ea.com/pt-br/games/ea-sports-fc/clubs/rankings)
- **Repositório GitHub:** `cspgabriel/pro-clubs-america`

# Próximos Passos

- Conectar a interface web (`index.html` / `v2.html`) para consumir dynamicamente os dados JSON gerados em `data/`.
