# Pagamentos e assinaturas

## Arquitetura

O PWA Web usa Stripe Checkout para assinaturas recorrentes. O Firebase continua
sendo a identidade canônica e o Firestore guarda o entitlement confirmado. O
navegador nunca recebe a chave do Stripe nem a service account do Firebase.

Fluxo de confiança:

1. o cliente obtém um ID token do Firebase;
2. `POST /api/billing/checkout` valida assinatura, emissor, audiência e expiração
   do token com as chaves públicas oficiais do Firebase;
3. a Pages Function seleciona um Price ID previamente autorizado e cria uma
   Checkout Session hospedada pelo Stripe;
4. somente `POST /api/billing/webhook`, após validar `Stripe-Signature`, altera
   `users/{firebase_uid}.plan` no Firestore;
5. cancelamentos e atualizações de pagamento usam o Customer Portal hospedado.

Os planos comerciais atuais são:

- `player_pro`: R$ 19,90/mês ou R$ 179/ano;
- `club_pro`: R$ 49,90/mês;
- `free`: sem cobrança.

Os apps nativos futuros devem usar Apple StoreKit e Google Play Billing. A
camada planejada para unificar os entitlements Web/iOS/Android é RevenueCat; o
Stripe não deve ser embutido como compra digital dentro dos apps das lojas.

## Cloudflare Pages Functions

As rotas ficam em `functions/api/billing/` e exigem estes bindings no projeto
Pages `pro-clubs-america`:

- `STRIPE_SECRET_KEY` (secret);
- `STRIPE_WEBHOOK_SECRET` (secret);
- `STRIPE_PRICE_PLAYER_PRO_MONTHLY`;
- `STRIPE_PRICE_PLAYER_PRO_ANNUAL`;
- `STRIPE_PRICE_CLUB_PRO_MONTHLY`;
- `FIREBASE_SERVICE_ACCOUNT_JSON` (secret);
- `FIREBASE_WEB_API_KEY`;
- `SITE_URL=https://proclubsamerica.com`.

Nunca use `vars` ou arquivos versionados para chaves. Use Pages secrets. A chave
Stripe de produção deve ser restrita, permanente e conter apenas as permissões
necessárias para Customers, Checkout Sessions, Billing Portal e Subscriptions.
A chave temporária gerada pelo Stripe CLI não é adequada para operação contínua.

Eventos inscritos no webhook:

- `checkout.session.completed`;
- `customer.subscription.created`;
- `customer.subscription.updated`;
- `customer.subscription.deleted`.

## Verificação

```powershell
npm run check
npm run test:rules
```

O smoke seguro usa modo de teste, uma identidade Firebase descartável e uma
Checkout Session não paga. Ao final, a sessão deve ficar `expired`, o usuário e
o documento temporários devem ser removidos e o webhook assinado deve provar a
transição `free -> player_pro`.
