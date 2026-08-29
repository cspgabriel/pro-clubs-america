# Operacao — crawl, SEO, painel e e-mail

Estado apos a implementacao de 29/08/2026. Este documento lista o que ja roda
sozinho e o que ainda depende de configuracao manual.

## 1. Crawler EA

**Como funciona.** O Worker `pro-clubs-america-ea-crawler` roda de hora em hora
(`17 * * * *`), pede ate `CRAWL_LIMIT` (3) clubes ao endpoint
`GET /api/internal/ea-ingest` e coleta cada um sequencialmente via Browser Rendering.

**Selecao da fila.** Clubes com claim aprovado ou partida em aberto tem
prioridade. Quando essa faixa se esgota, o seletor cai para a fila geral
(`priority.desc, next_run_at.asc`) — foi essa a correcao que destravou os 552
clubes que nunca eram alcancados.

**Backoff.** Falha reagenda com `30 * 2^tentativas` minutos, teto de 24h.
Sucesso reagenda em 2h. Bloqueio, 24h.

### ⚠️ Pendencia: verificar o plano de Browser Rendering
A cadencia foi elevada de ~6 para ate 72 coletas/dia. Nao foi possivel confirmar
o plano da conta Cloudflare (o token disponivel retorna 403 em `/workers/scripts`).

- **Workers Paid**: a cadencia atual cabe com folga.
- **Free tier** (10 min/dia de browser): a cadencia atual **excede a cota**.

Se aparecerem falhas de quota nos logs do Worker, baixe `CRAWL_LIMIT` para `1` e
volte o cron para `17 */4 * * *` em `workers/ea-crawler/wrangler.jsonc`.

### Deploy
```
npx wrangler deploy --config workers/ea-crawler/wrangler.jsonc
```
O `GET`/`POST` de `/api/internal/ea-ingest` exige o secret `EA_INGEST_SECRET`,
que precisa existir tanto no Worker quanto nas Pages Functions.

### Contingencia
`.github/workflows/crawl-ea-public.yml` nao roda mais em cron (o agendamento do
GitHub entregava ~2 execucoes/dia em vez das 48 configuradas e competia com o
Worker). Ficou como `workflow_dispatch` manual.

## 2. SEO

- `sitemap.xml` e `robots.txt` sao gerados no build (`src/app/sitemap.ts`,
  `src/app/robots.ts`, ambos com `dynamic = "force-static"` — exigido por
  `output: export`).
- Paginas de clube e de jogador tem title, description, canonical, OpenGraph e
  JSON-LD (`SportsTeam` / `Person` + `BreadcrumbList`) unicos.
- Cobertura de jogadores saiu de 510 (corte arbitrario) para todos os que passam
  no filtro de qualidade: stats coerentes e no minimo
  `MIN_INDEXABLE_MATCHES` (5) partidas — ver `src/lib/public-data.ts`.

**Proximo passo manual:** submeter `https://proclubsamerica.com/sitemap.xml` no
Google Search Console.

## 3. Painel interno

`/admin` — protegido por `robots: noindex` e pelo endpoint
`GET /api/admin/overview`.

**Autorizacao:** a variavel `ADMIN_EMAILS` (lista separada por virgula) define
quem entra. **Sem ela o endpoint responde 503 e o painel nao abre** — falha
fechada, de proposito. Configure em Cloudflare Pages > Settings > Environment
variables.

Mostra: totais (usuarios, clubes, jogadores, partidas, assinaturas), novos
cadastros em 7 dias, saude do crawler (alerta se a ultima partida coletada tem
mais de 24h), fila de coleta, ultimas execucoes, usuarios e clubes recentes.

## 4. E-mail

> ## 🚫 DESLIGADO POR DECISAO — nenhum e-mail sai hoje
>
> A estrutura esta pronta e versionada, mas **inerte**:
> - `emailConfigured()` exige `EMAIL_ENABLED === "true"`. A variavel nao existe
>   em producao, entao todo fluxo retorna `skipped` antes de chamar o provedor.
> - O worker `pro-clubs-america-notifier` **nao foi deployado**. Nao ha cron.
> - Nao ha `RESEND_API_KEY` configurada.
>
> Ou seja: tres travas independentes. Ativar exige acao deliberada nas tres.

**Stack:** Resend via `fetch` (roda em Pages Functions/Workers), templates em
`functions/_lib/email.ts`.

**Fluxos** (`functions/api/internal/email-dispatch.ts`, disparado pelo Worker
`pro-clubs-america-notifier`, cron diario 12:10 UTC):

| Fluxo | Gatilho | Corte |
|---|---|---|
| `welcome_d0` | conta criada nas ultimas 48h | 1 por perfil |
| `welcome_d2` | 2-5 dias sem vincular perfil EA | 1 por perfil |
| `welcome_d5` | 5-8 dias sem clube | 1 por perfil |
| `reactivation` | 14+ dias inativo | 1 por semana, para apos 3 |
| `match_notification` | partida nova do clube em 24h | digest diario, 1 por dia |

Todo envio passa por `email_consent` (LGPD) e grava em `email_events` com
`dedupe_key` unico — reexecutar o cron nao duplica envio.
Opt-out de um clique em `/api/email/unsubscribe?token=...`, com cabecalhos
`List-Unsubscribe` e `List-Unsubscribe-Post` (RFC 8058).

### Para ativar no futuro (ordem sugerida)
Nada e enviado ate que **todos** os itens abaixo sejam feitos:

0. **`EMAIL_ENABLED=true`** nas Pages Functions — a trava mestra.
1. **Conta Resend propria** para `proclubsamerica.com`. Nao reaproveitar a chave
   de outro projeto: a do Clinicafy e sending-only e falha em Broadcasts.
2. **DKIM** do Resend no DNS Cloudflare.
3. **SPF** — adicionar `include:_spf.resend.com` **antes** do `~all`, mantendo o
   `include:_spf.mx.cloudflare.net` atual. Remover o include existente quebra o
   recebimento (o dominio usa Cloudflare Email Routing).
4. **DMARC** — comecar em `p=none` com `rua`, endurecer depois.
5. Variaveis `RESEND_API_KEY` e `EMAIL_FROM` nas Pages Functions.
6. Deploy do worker:
   `npx wrangler deploy --config workers/notifier/wrangler.jsonc`

## 5. Analytics

`NEXT_PUBLIC_GA_MEASUREMENT_ID` ativa o GA4 (`src/components/analytics.tsx`).
Sem a variavel o componente e no-op e nenhum script de terceiro carrega.

**Crie uma propriedade GA4 dedicada.** Nao reutilize a de outros projetos —
metrica compartilhada entre produtos nao permite ler nenhum deles.

Eventos ja instrumentados: `sign_up`, `login_attempt`, `ea_link`,
`friendly_post`, `market_post`.
