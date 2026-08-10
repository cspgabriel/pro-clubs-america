# Deploy no Cloudflare Pages

## Produção canônica

- GitHub: `cspgabriel/pro-clubs-america`
- Cloudflare Pages: `pro-clubs-america`
- URL canônica ativa: `https://proclubsamerica.com`
- URL técnica Pages: `https://pro-clubs-america.pages.dev`
- Banco Supabase: `mdqtlkvkpacjouwgtibr` (`sa-east-1`)

A branch `main` publica no projeto Pages existente pelo workflow
`.github/workflows/deploy-cloudflare-pages.yml`. O projeto Pages nasceu em modo
Direct Upload; por isso a integração contínua usa GitHub Actions com Wrangler,
sem criar outra aplicação ou trocar a URL pública.

## Build

```powershell
npm ci
npm run check
```

O Next.js exporta o site para `out/`. O arquivo `public/_redirects` mantém as
URLs de clubes, jogadores e partidas criadas depois do build funcionando como
fallback client-side.

## Publicação direta

```powershell
npx wrangler pages deploy out --project-name pro-clubs-america --branch main
```

Os domínios `proclubsamerica.com` e `www.proclubsamerica.com` estão associados
ao mesmo projeto Pages, com DNS proxy e SSL ativos. Uma Redirect Rule permanente
leva `www` ao domínio raiz, preservando caminho e query string. O secret
`SITE_URL` do Pages usa `https://proclubsamerica.com` como origem canônica.

## Firebase Auth

Copie `.env.example` para `.env.local` e preencha as variáveis
`NEXT_PUBLIC_FIREBASE_*` do aplicativo Web Firebase. Ative Email/Senha e Google
no console do Firebase e inclua `proclubsamerica.com` nos domínios autorizados.
O host técnico `pro-clubs-america.pages.dev` também permanece autorizado para
smokes e rollback; o host `www` não inicia autenticação porque redireciona antes
para a origem canônica.

Não use `private_key`, arquivo JSON de service account ou credenciais do Admin
SDK no navegador, no repositório ou nas variáveis `NEXT_PUBLIC_*`.

Sem a configuração Web, login, cadastro, mercado e amistosos ficam indisponíveis;
o produto não cria identidades ou dados comunitários de demonstração.

## Supabase + Firebase Auth

O Firebase é o provedor de identidade; o Supabase é o banco relacional da
plataforma. Nunca envie `service_role` ao navegador. A migration da ponte de
identidade remove a leitura pública de `profiles.email` e associa perfis pelo
`firebase_uid` validado no backend.

Antes da publicação, execute `npm run check` e confirme as migrations com
`npx supabase migration list`.

```powershell
npx supabase login
npx supabase link --project-ref mdqtlkvkpacjouwgtibr
npx supabase db push
```

Depois do push, confirme que a política `Public Read Profiles` não existe mais.

## Stripe Billing

O checkout é executado pelas Cloudflare Pages Functions em
`functions/api/billing/`. A integração valida o ID token Firebase no servidor,
redireciona ao Stripe Checkout e só concede plano pago depois de um webhook com
assinatura válida. Consulte `docs/PAYMENTS.md` para bindings, eventos e smoke.

Antes do deploy, além do export do Next.js, compile as Functions:

```powershell
npm run check:functions
```

Não publique uma chave `sk_*` ou `rk_*` no GitHub. Configure-a como secret no
projeto Pages e use uma restricted key permanente, com o menor conjunto de
permissões necessário.

## Coletor público da EA

O crawler de produção fica em `workers/ea-crawler/` e usa o binding Browser
Rendering do Cloudflare. O mesmo `EA_INGEST_SECRET` deve existir no Pages, no
Worker e, para o fallback, nos secrets do repositório GitHub.

```powershell
npx wrangler deploy --config workers/ea-crawler/wrangler.jsonc
```

O cron atual é `17 */2 * * *`. Valide o resultado em `/api/health` e na tabela
`ea_crawl_runs`; HTTP 200 do Worker não significa sucesso de coleta quando o
campo `status` for `failed` ou `blocked`.

Em 10/08/2026 o parser `cloudflare-browser-public-page-v5` confirmou que o
componente público da EA foi resolvido e disparou as requisições de resumo,
informações e partidas de Liga. Essas requisições permaneceram pendentes na
saída do Browser Rendering e nenhuma resposta de dados foi observada antes do
timeout. O run é, corretamente, registrado como falha e não substitui snapshots.
