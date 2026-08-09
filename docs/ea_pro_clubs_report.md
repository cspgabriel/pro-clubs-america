# Relatório Executivo: Extração Completa e Enriquecida de Dados EA Sports FC - Pro Clubs

**Data da Extração:** 09 de Agosto de 2026  
**Fonte Oficial:** [EA Sports FC Pro Clubs Leaderboards](https://www.ea.com/pt-br/games/ea-sports-fc/clubs/rankings)  
**Repositório Oficial:** [cspgabriel/pro-clubs-pro-player](https://github.com/cspgabriel/pro-clubs-pro-player)  

---

## 1. Resumo da Coleta e Métricas Globais

A extração avançada foi expandida para contemplar **100% dos times listados tanto na aba História (All-Time Leaderboard) quanto na aba Temporada Atual (Current Season Leaderboard)** em todas as 3 plataformas de Pro Clubs suportadas pela EA Sports.

| Plataforma / Modalidade | Código EA | Times em História (All-Time) | Times em Temporada (Current Season) | Total Único Deep-Scraped |
|---|---|---|---|---|
| **Crossplay Geração Atual (PS5, Xbox Series X\|S, PC)** | `common-gen5` | 100 | 100 | **162** |
| **Geração Anterior (PS4, Xbox One)** | `common-gen4` | 100 | 100 | **193** |
| **Nintendo Switch** | `nx` | 99 | 100 | **197** |
| **TOTAL GERAL UNIFICADO** | **3 Plataformas** | **299** | **300** | **552 TIMES ÚNICOS** |

---

## 2. Métricas do Elenco e Jogadores (8.111 Jogadores Cadastrados)

Para cada um dos **552 times únicos**, foram extraídos os dados completos do elenco e estatísticas individuais de carreira dos jogadores registrados na EA:

- **Total de Jogadores com Carreira Mapeada:** **8.111 Jogadores**
- **Atributos Coletados por Jogador:**
  - `Platform Code` (common-gen5, common-gen4, nx)
  - `Club ID` & `Club Name`
  - `All-Time Rank` & `Seasonal Rank`
  - `Player Name` (Gamertag / Pro Name)
  - `Games Played` (Jogos disputados pelo clube)
  - `Goals` (Gols marcados)
  - `Assists` (Assistências distribuídas)
  - `Position / Rating` (Posição preferida e nota de desempenho)
  - `MoTM` (Melhor em campo / Man of the Match)
  - `Clean Sheets (Def)` (Jogos sem sofrer gol da linha defensiva)
  - `Clean Sheets (GK)` (Jogos sem sofrer gol do Goleiro)
  - `Shot Success %` (Precisão de finalização)
  - `Passes Made` & `Pass Success %` (Volume e precisão de passes)
  - `Tackles Made` & `Tackle Success %` (Volume e eficiência de desarmes)

---

## 3. Estrutura dos Arquivos de Dados Gerados no Repositório

Todos os arquivos estão disponíveis na pasta `data/` do repositório `cspgabriel/pro-clubs-pro-player`:

| Nome do Arquivo | Formato | Descrição |
|---|---|---|
| `data/pro_clubs_all_time_leaderboard_enriched.json` | JSON | 100 times do Leaderboard de História para as 3 plataformas com dados raw |
| `data/pro_clubs_seasonal_leaderboard_enriched.json` | JSON | 100 times do Leaderboard da Temporada Atual (currentSeasonLeaderboard) |
| `data/pro_clubs_all_teams_detailed.json` | JSON | Estrutura completa hierárquica contendo metadata + info + elenco + estatísticas |
| `data/pro_clubs_all_teams_summary.csv` | CSV | Resumo consolidado das 552 equipes (Vitórias, Derrotas, Empates, Gols, Reputação, Ranks) |
| `data/pro_clubs_all_players_full.csv` | CSV | Tabela analítica completa com **8.111 jogadores** e suas estatísticas detalhadas de jogo |
| `data/pro_clubs_all_matches.json` | JSON | Estrutura de partidas recentes das equipes analisadas |

---

## 4. Endpoints Técnicos Identificados da EA API

- **All-Time Leaderboard:** `https://proclubs.ea.com/api/fc/allTimeLeaderboard?platform={platform}`
- **Seasonal Leaderboard:** `https://proclubs.ea.com/api/fc/currentSeasonLeaderboard?platform={platform}`
- **Informações Gerais do Clube:** `https://proclubs.ea.com/api/fc/clubs/info?platform={platform}&clubIds={clubId}`
- **Estatísticas do Elenco/Jogadores:** `https://proclubs.ea.com/api/fc/members/career/stats?platform={platform}&clubId={clubId}`
- **Histórico Recente de Partidas:** `https://proclubs.ea.com/api/fc/clubs/matches?platform={platform}&clubIds={clubId}&matchType=gameType9`
- **Busca por Nome do Clube:** `https://proclubs.ea.com/api/fc/allTimeLeaderboard/search?platform={platform}&clubName={query}`

---

## 5. Script para Download Personalizado por ID do Clube

Localizado em `scripts/download_by_club_id.py`:

```bash
python scripts/download_by_club_id.py --platform common-gen5 --club_id 123456
```

---
*Relatório gerado automaticamente por Luciana Aguiar — Agente de Inteligência e Extração Pro Clubs.*