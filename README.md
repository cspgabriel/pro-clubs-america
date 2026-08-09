# Pro Clubs America

PWA comunitária e independente, com comunidades por país da América do Sul,
para descoberta de clubes, perfis de jogadores, estatísticas, rankings,
transferências e organização de amistosos no EA SPORTS FC 26 Clubs.

O Villathinaikos (`clubId=171630`, `platform=common-gen5`) é a primeira base
completa usada para validar o produto. A arquitetura foi desenhada para indexar
outros clubes públicos da mesma plataforma.

> Este projeto não é afiliado, endossado ou patrocinado pela Electronic Arts
> Inc. Dados e escudos são referenciados a partir de páginas públicas da EA e
> permanecem sujeitos à disponibilidade da fonte.

## Documentação

- [Índice da documentação](docs/README.md)
- [Fontes públicas da EA e URLs](docs/EA-DATA-SOURCES.md)
- [Arquitetura da aplicação](docs/ARCHITECTURE.md)
- [Modelo de dados e métricas](docs/DATA-MODEL.md)
- [Crawler, atualização e operação](docs/CRAWLER-OPERATIONS.md)
- [Produto, módulos e estado atual](docs/PRODUCT-STATUS.md)

## URLs oficiais usadas

Para qualquer clube, substitua `{clubId}` pelo identificador público:

```text
https://www.ea.com/pt-br/games/ea-sports-fc/clubs/overview?clubId={clubId}&platform=common-gen5
https://www.ea.com/pt-br/games/ea-sports-fc/clubs/member-list?clubId={clubId}&platform=common-gen5
https://www.ea.com/pt-br/games/ea-sports-fc/clubs/match-history?clubId={clubId}&platform=common-gen5
https://www.ea.com/pt-br/games/ea-sports-fc/clubs/rankings
```

As abas Liga, Friendly e Playoff são modos da mesma página `match-history`; não
devem ser tratadas como URLs independentes sem que a navegação pública da EA
publique um parâmetro estável para isso.

## Rodar localmente

Requisitos: Node.js 20+ e npm.

```powershell
npm install
npm run dev
```

O Next.js informa a porta disponível no terminal. Normalmente é
`http://localhost:3000`; neste workspace também foi usado
`http://127.0.0.1:3016` quando a porta padrão estava ocupada.

## Comandos

| Comando | Função |
| --- | --- |
| `npm run dev` | Ambiente local com recarga automática |
| `npm run lint` | Verificação ESLint |
| `npm run build` | Build de produção |
| `npm run check` | Lint seguido de build |
| `npm run test:rules` | Testes de autorização do Firestore no emulador |
| `npm run import:data -- arquivo.json` | Valida e importa uma base normalizada |

## Rotas do produto

| Rota | Finalidade |
| --- | --- |
| `/` | Home e destaques da comunidade |
| `/buscar` | Busca global por clube, ID ou jogador |
| `/clubes` | Diretório de clubes públicos indexados |
| `/jogadores` | Diretório de jogadores indexados |
| `/club/{clubId}` | Perfil, elenco, gráficos e histórico do clube |
| `/jogador/{playerId}` | Perfil individual e desempenho do jogador |
| `/partidas` | Últimos resultados e mural para marcar amistosos |
| `/partidas/historico` | Histórico separado de partidas públicas |
| `/partidas/amistosos` | Convites direcionados e desafios abertos |
| `/partida/{id}` | Página individual, elencos, validação e lobby da partida |
| `/amistosos` | Rota compatível do mural de partidas |
| `/mercado` | Vagas em clubes e jogadores procurando time |
| `/cadastro` | Cadastro de usuário/time com URL pública obrigatória da EA |
| `/entrar`, `/criar-conta`, `/recuperar-senha` | Fluxos reais de autenticação Firebase |
| `/onboarding`, `/conta` | País, idioma, função e vínculo comunitário |
| `/{idioma}/comunidade/{pais}` | Home regional em português, espanhol ou inglês |
| `/planos` | Mockups Free, Pro e VIP; pagamentos ainda desativados |
| `/rankings/jogadores/[metric]` | Rankings exclusivos de jogadores por gols, assistências, desarmes ou aproveitamento |
| `/rankings/clubes/[metric]` | Rankings exclusivos de clubes por métrica |
| `/rankings/times` | Times cadastrados e validados na comunidade |
| `/rankings/[metric]` | Compatibilidade: redireciona links antigos ao ranking de jogadores |
| `/api/health` | Verificação simples de saúde |
| `/manifest.webmanifest` | Manifesto instalável da PWA |

## Base atual

- 552 clubes detalhados nas plataformas coletadas;
- 8.111 jogadores vinculados aos respectivos clubes;
- resumo oficial detalhado do Villathinaikos;
- nove integrantes com estatísticas de carreira no clube;
- cinco partidas recentes de Liga com dados individuais disponíveis;
- catálogo inicial de adversários encontrados no histórico;
- separação prevista entre Liga, Friendly e Playoff;
- escudos públicos carregados do CDN de conteúdo da EA.
- perfis navegáveis dos clubes e jogadores presentes na extração global;
- temas claro/escuro, sidebar desktop e menu inferior mobile.
- busca e rankings alimentados pela extração enriquecida versionada em `data/`.

Os placares de amistosos não podem ser digitados manualmente. Um resultado só
deverá ganhar estado `verified` depois que a partida correspondente aparecer na
aba Friendly do histórico público da EA.

## Estrutura principal

```text
src/app/              rotas Next.js e PWA
src/components/       telas, tabelas e gráficos
src/data/club.json    snapshot normalizado atualmente publicado
src/data/catalog.ts   catálogo inicial de clubes
src/lib/stats.ts      métricas derivadas
src/types/domain.ts   contrato de dados
scripts/              importação e validação local
data/                 exemplos de entrada
design-system/        regras visuais geradas para a PWA
docs/                 documentação operacional e técnica
```

## Validação antes de publicar

```powershell
npm run check
```

Não versione `.env`, cookies, sessões de navegador ou respostas brutas que
contenham dados desnecessários. Preserve no dataset somente informações
esportivas publicamente exibidas pela fonte.

## Snapshot global importado

O commit `3f974173` adicionou os arquivos `pro_clubs_rankings_all_time.*`,
`pro_clubs_top_teams_players.*` e `pro_clubs_platforms_leagues.json`. A atualização
de 09/08/2026 acrescentou `pro_clubs_all_teams_detailed.json` e os arquivos
enriquecidos de 552 times e 8.111 jogadores. O site lê esses JSONs em
`src/lib/public-data.ts`. O helper Python incluído nesse commit usa
endpoints HTTP internos da EA e **não integra o fluxo de produção definido por
este projeto**, que permanece baseado em crawl das páginas públicas conforme a
decisão do produto.

## Publicação

O build usa exportação estática do Next.js para Cloudflare Pages. Consulte
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). A autenticação real exige somente as
credenciais públicas do aplicativo Web Firebase em `.env.local`; nunca use nem
versione uma chave privada de conta de serviço no frontend.
