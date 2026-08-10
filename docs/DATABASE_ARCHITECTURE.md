# 🗄️ Arquitetura de Banco de Dados Gratuito — Pro Clubs América

**Plataforma Oficial:** [proclubsamerica.com](https://proclubsamerica.com)  
**Objetivo:** Banco de dados 100% gratuito, performático e em tempo real para suportar todos os cadastros de usuários, times, partidas, mercado de vagas e rankings.

---

## Estado de implementação

O projeto Supabase `mdqtlkvkpacjouwgtibr` e o schema estão implantados. A
migration `20260809204500_firebase_identity_bridge.sql` corrige a fronteira de
identidade para Firebase Auth e remove e-mails da leitura pública. Ela só pode
está ativa após `supabase db push` confirmado.

O schema Supabase versionado em `supabase/migrations/` é o banco relacional da
plataforma. O Firebase é usado exclusivamente para autenticação; as Pages
Functions validam o ID token e executam no Supabase as operações autorizadas.

## 🏆 1. Alternativa relacional: SUPABASE (PostgreSQL Serverless)

### Por que o Supabase é a melhor opção gratuita?
- **Plano 100% Gratuito (Free Tier Lifetime):**
  - **500 MB** de armazenamento de dados PostgreSQL (suficiente para +50.000 partidas e +100.000 jogadores).
  - **50.000 Usuários Ativos Mensais (MAU)** na autenticação integrada (Google Auth + E-mail/Senha).
  - **Realtime WebSockets Ilimitados:** Placar de amistosos atualizado ao vivo na tela dos usuários sem precisar dar F5.
  - **Row Level Security (RLS):** Garantia de que apenas o capitão autenticado do time pode aceitar ou criar desafios para o seu próprio clube.

---

## 📐 2. Modelo de Dados (Database Schema Proposals)

### 📄 Tabela: `profiles` (Perfil associado à identidade Firebase)
- `id` (UUID, PK) — ID interno do Supabase.
- `firebase_uid` (TEXT, Unique) — identidade validada pelo Firebase Auth.
- `email` (TEXT, Unique) — E-mail do usuário.
- `full_name` (TEXT) — Nome / Gamertag.
- `country_code` (TEXT) — Código do país (ex: `BR`, `AR`, `CO`, `CL`, `UY`, `PE`).
- `role` (TEXT) — `player`, `captain`, `admin`.
- `created_at` (TIMESTAMPTZ) — Data de cadastro.

---

### 🛡️ Tabela: `clubs` (Times da Comunidade)
- `id` (UUID, PK) — Identificador único interno.
- `ea_club_id` (TEXT, Unique, Index) — ID numérico do clube na EA Sports FC (ex: `171630`).
- `platform` (TEXT) — `common-gen5`, `common-gen4`, `nx`.
- `name` (TEXT) — Nome do time (ex: `Villathinaikos`).
- `captain_user_id` (UUID, FK -> `users.id`) — ID do usuário dono/capitão.
- `ea_url` (TEXT) — URL oficial do ranking da EA fornecida no cadastro.
- `verified` (BOOLEAN) — Status de indexação (`true` após aprovação em até 24h).
- `country_code` (TEXT) — País do clube.
- `skill_rating` (INT) — Pontuação de habilidade EA.
- `wins` (INT), `losses` (INT), `ties` (INT) — Histórico.
- `created_at` (TIMESTAMPTZ).

---

### ⚽ Tabela: `players` (Integrantes & Estatísticas de Carreira)
- `id` (UUID, PK).
- `club_id` (UUID, FK -> `clubs.id`).
- `gamertag` (TEXT, Index) — Nome do pro-player (ex: `MatthewsMendesx`, `cspgabriell`).
- `favorite_position` (TEXT) — `Midfielder`, `Defender`, `Forward`, `Keeper`.
- `overall_rating` (INT) — Nota OVR (ex: 88, 90).
- `games_played` (INT), `goals` (INT), `assists` (INT).
- `passes_made` (INT), `pass_success_rate` (FLOAT).
- `tackles_made` (INT), `tackle_success_rate` (FLOAT).
- `clean_sheets_def` (INT), `clean_sheets_gk` (INT).
- `win_rate` (FLOAT).
- `updated_at` (TIMESTAMPTZ).

---

### ⚔️ Tabela: `matches` & `friendly_challenges` (Partidas e Amistosos)
- `id` (UUID, PK).
- `home_club_id` (UUID, FK -> `clubs.id`).
- `away_club_id` (UUID, FK -> `clubs.id`, Nullable se for Desafio Aberto).
- `match_type` (TEXT) — `League`, `Playoff`, `Friendly`.
- `status` (TEXT) — `open_challenge`, `accepted`, `waiting_ea_verification`, `completed`, `cancelled`.
- `home_score` (INT, Nullable), `away_score` (INT, Nullable).
- `ea_match_id` (TEXT, Nullable) — ID da partida retornado pela EA API quando confirmada.
- `scheduled_at` (TIMESTAMPTZ) — Data e horário marcados para a partida.
- `confirmed_at` (TIMESTAMPTZ).

---

### 🔄 Tabela: `market_listings` (Mercado de Transferências)
- `id` (UUID, PK).
- `creator_user_id` (UUID, FK -> `users.id`).
- `type` (TEXT) — `club_seeking_player` (Vaga em Clube) ou `player_seeking_club` (Free Agent).
- `club_id` (UUID, FK -> `clubs.id`, Nullable).
- `position_needed` (TEXT) — `VOL`, `ZAG`, `MEI`, `ATA`, `GK`.
- `min_ovr` (INT) — Requisito de OVR mínimo.
- `country_code` (TEXT) — País.
- `description` (TEXT) — Detalhes e horários de treino.
- `active` (BOOLEAN) — `true` se a vaga ainda estiver aberta.
- `created_at` (TIMESTAMPTZ).

---

## ⚡ 3. Estratégia de Caching Gratuito com UPSTASH REDIS (Para Não Sobrecarregar a API da EA)

Para evitar que a API da EA bloqueie requisições por excesso de tráfego quando o site receber milhares de acessos simultâneos:
- **Upstash Redis (Free Tier):** 10.000 requisições/dia.
- **Funcionamento:** O servidor consulta os dados dos 100 times da EA uma vez a cada 15 minutos e salva no Redis. Quando um usuário acessa `proclubsamerica.com`, o site responde em 5ms puxando do Redis, mantendo a navegação ultra-rápida e sem custo.
