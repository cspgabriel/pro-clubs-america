# Deploy no Cloudflare Pages

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
npx wrangler pages deploy out --project-name proclubsamerica --branch main
```

O domínio de produção é `proclubsamerica.com`. Ele precisa estar na mesma conta
Cloudflare do projeto Pages antes de ser associado em **Custom domains**.

## Firebase Auth

Copie `.env.example` para `.env.local` e preencha as variáveis
`NEXT_PUBLIC_FIREBASE_*` do aplicativo Web Firebase. Ative Email/Senha e Google
no console do Firebase e inclua `proclubsamerica.com` nos domínios autorizados.

Não use `private_key`, arquivo JSON de service account ou credenciais do Admin
SDK no navegador, no repositório ou nas variáveis `NEXT_PUBLIC_*`.

Sem a configuração Web, o produto entra deliberadamente no modo de demonstração
local e mostra essa condição na interface.
