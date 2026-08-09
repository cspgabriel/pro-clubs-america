# Deploy no Cloudflare Pages

## Produção canônica

- GitHub: `cspgabriel/pro-clubs-america`
- Cloudflare Pages: `pro-clubs-america`
- URL ativa: `https://pro-clubs-america.pages.dev`
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

O domínio de produção é `proclubsamerica.com`. Ele precisa estar na mesma conta
Cloudflare do projeto Pages antes de ser associado em **Custom domains**.

## Firebase Auth

Copie `.env.example` para `.env.local` e preencha as variáveis
`NEXT_PUBLIC_FIREBASE_*` do aplicativo Web Firebase. Ative Email/Senha e Google
no console do Firebase e inclua `proclubsamerica.com` nos domínios autorizados.

Não use `private_key`, arquivo JSON de service account ou credenciais do Admin
SDK no navegador, no repositório ou nas variáveis `NEXT_PUBLIC_*`.

Sem a configuração Web, login, cadastro, mercado e amistosos ficam indisponíveis;
o produto não cria identidades ou dados comunitários de demonstração.

As regras devem passar antes da publicação:

```powershell
npm run test:rules
```

## Supabase + Firebase Auth

O Firebase é o provedor de identidade; o Supabase é o banco relacional da
plataforma. Nunca envie `service_role` ao navegador. A migration da ponte de
identidade remove a leitura pública de `profiles.email` e associa perfis pelo
`firebase_uid` validado no backend.

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
