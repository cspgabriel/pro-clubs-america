# Campeonato aberto a todos e dados EA no clube da comunidade

Entrega de 09/09/2026. Duas frentes, pedidas juntas pelo dono do produto.

Revê a decisão 2 de [`20260906-campeonatos/implementation.md`](20260906-campeonatos/implementation.md)
("Admin cria; dono de clube propõe e o admin aprova"). Ela produziu exatamente o efeito
oposto ao pretendido: três dias depois, o único campeonato do banco (`liga-1`) continuava
parado em `pending_approval` e invisível para a comunidade.

## 1. Criar campeonato

### Antes

Exigia papel `admin` ou `owner`/`captain` com clube vinculado. Nove campos obrigatórios,
incluindo três datas e a escada de chaves. Para quem não era admin, uma fila de aprovação.
Criar não significava ter um campeonato.

### Agora

- **Qualquer conta autenticada cria.** Não ter clube não impede mais ninguém.
- **O nome é o único campo obrigatório.** O servidor completa o resto:
  - formato `groups_knockout` com escada elástica 32/16/8, grupos de 4, dois classificados
    (o sorteio desce ao degrau que couber nos inscritos);
  - plataforma `common-gen5`;
  - inscrições abrem no ato e fecham 1h antes do início;
  - início em 7 dias, se não informado;
  - vagas pelo topo da escada, prêmios em zero.
- **A edição nasce em `open`**, com inscrições abertas. Admin que queira preparar em
  silêncio manda `publish: false` e recebe `draft`.
- **Ajustes finos continuam disponíveis**, atrás de um clique ("Ajustar plataforma, datas,
  chaves e premiação"). Fora desse modo, o cliente não envia formato nenhum.

### Anti-spam

O freio deixou de ser curadoria e passou a ser um teto: **5 edições vivas por
organizador** (`draft`, `pending_approval`, `open`, `closed`, `drawn`, `running`).
`MAX_LIVE_PER_ORGANIZER` em `functions/api/community/tournaments.ts`.

Não foi preciso mexer em permissão de organização: `canAdminister` já dava ao
`organizer_profile_id` os mesmos poderes do admin sobre a própria edição, então sorteio,
arbitragem e encerramento funcionam sem a plataforma no meio.

### `pending_approval`

O status continua no CHECK da tabela e o par `approve`/`reject` continua no PATCH — quem
tem registro nesse estado não fica órfão. Mas nada novo nasce ali. `liga-1` foi movido
para `open` na mão, junto com esta entrega; sem isso ficaria invisível para sempre.

## 2. Dados da EA no clube da comunidade

### O problema

O cadastro de clube (`clubs/claim.ts`) não pedia coleta nenhuma: apenas inseria uma linha
em `ea_crawl_queue` e esperava o cron horário. O dono cadastrava e abria a página do
próprio clube cheia de zeros. E quando o dado chegava, morava em `/club?id=` — outra tela.

### A armadilha (documentada porque custou uma iteração)

A primeira versão chamou `proclubs.ea.com` direto da Pages Function. **Em produção a EA
responde 403 para todo `fetch` que sai da rede da Cloudflare.** Verificado:

```text
GET https://proclubsamerica.com/api/ea?clubId=1027879&platform=common-gen5
→ 503 {"error":"...","code":"EA_403"}
```

É por isso que `live-club-dashboard.tsx` sempre teve fallback para
`/api/catalog/club-stats`, e por isso o coletor existe como Worker separado.

### O caminho que funciona

Quem consegue falar com a EA é o Worker `workers/ea-crawler`, que abre a página pública com
**Browser Rendering** (Chrome real, não `fetch`) e devolve a coleta para
`/api/internal/ea-ingest`.

`requestEaClubRefresh` (`functions/_lib/ea.ts`) faz dois passos, nessa ordem:

1. upsert em `ea_crawl_queue` com prioridade alta;
2. chamada ao Worker com o `EA_INGEST_SECRET`.

Enfileirar **antes** é o que torna a falha barata: se a chamada ao Worker cair, a coleta
ainda acontece no cron horário. O pedido não se perde, só demora.

Prioridades: `95` clube recém-cadastrado · `80` clube visitado e nunca sincronizado ·
`60` clube visitado com retrato velho · `5` descoberta orgânica de catálogo.

Uma coleta leva ~15s (medido: clube `10541994` enfileirado 12:43:38, sincronizado
12:43:53). Os dois chamadores tratam essa espera de forma diferente, de propósito:

- **Cadastro de clube — espera**, com teto de 25s. O dono não pode cadastrar e cair na
  própria página cheia de zeros; ~15s a mais no cadastro compra isso. Estourar o teto não
  perde nada: a linha continua em `ea_crawl_queue` e o cron horário resolve, então
  `synced: false` na resposta não é erro. Como a espera é longa o bastante para parecer
  travamento, o botão vira "Buscando dados na EA…" com um aviso explícito, e a tela de
  sucesso informa quantas partidas vieram.
- **Página pública — `waitUntil`**, servindo o retrato que já existe. Consequência aceita:
  **a primeira visita a um clube nunca sincronizado vem sem o bloco `ea`** — ela paga o
  pedido, a seguinte vê o dado. Prender um visitante por 15s não se justifica; prender
  quem está cadastrando o próprio clube, sim.

### Na página pública

`GET /api/community/clubs/:id` passou a devolver, no mesmo payload, um campo opcional `ea`:
skill rating, divisão, ranking, J/V/E/D, aproveitamento, gols pró e contra, clean sheets e
o elenco da EA. Revalida em segundo plano quando passa de 30 minutos (`EA_STALE_MS`).

`community-club-page.tsx` renderiza isso em "Temporada do clube na EA", acima do elenco da
plataforma, com o horário da última sincronização. O link para o painel completo continua,
agora como aprofundamento e não como o único lugar onde o dado existe.

`syncEaClubToCatalog` foi removido do arquivo: o mapeamento de colunas continua sendo um
só, em `ea-ingest.ts`. `functions/_lib/ea.ts` mantém `fetchEaClubPayloads` e
`normalizeEaClub` porque `/api/ea` e o crawler local (`npm run crawl:ea`) rodam fora da
Cloudflare, onde a consulta direta funciona.

## Variável de ambiente

`EA_CRAWLER_URL` (opcional) sobrescreve a URL do Worker coletor. Sem ela, o padrão é
`https://pro-clubs-america-ea-crawler.cspgabriel.workers.dev/`. `EA_INGEST_SECRET` já
existia no Pages e é reaproveitado — sem ele o clube fica enfileirado e o cron resolve.

## Validação em produção

| Verificação | Resultado |
| --- | --- |
| `GET /api/community/tournaments` | `Copa Pro Clubs América I` e `Liga 1`, ambos `open` |
| Coleta do clube `1027879` (`basij`) | 921 jogos, skill 2784, 49 jogadores |
| 1ª visita a `10541994` (`Svd Family`), nunca sincronizado | sem bloco `ea`, enfileirado com prioridade 80 |
| Coleta disparada por essa visita | concluída em ~15s, `queue_status=succeeded` |
| 2ª visita ao mesmo clube | skill 2880, 114 jogos, 96-7-11, 84,2%, 10 no elenco |

## Primeira copa

`Copa Pro Clubs América I` — slug `copa-pro-clubs-america-1`, criada no banco de produção.
Início **16/09/2026 às 21h de Brasília** (`2026-09-17T00:00:00Z`), inscrições fechando às
20h do mesmo dia. Grupos de 4 com mata-mata, escada 32/16/8, até 32 clubes, sem prêmio em
dinheiro. Organizador: o perfil do dono do produto, com `created_by_admin = true` — não
existe nenhum perfil `role = 'admin'` no banco.
