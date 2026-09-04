# Convites de elenco

Status: em implementação

## Fluxo mapeado

1. Dono ou capitão abre `/conta/time` e informa o `@nick` ou e-mail de uma conta existente.
2. O servidor valida autorização, impede auto-convite, duplicidade e convite para quem já representa outro clube.
3. O convite fica `pending` por 14 dias e dispara um e-mail transacional com link para `/time?id={clubId}`.
4. O jogador vê o mesmo convite em `/conta` e na página do clube, podendo aceitar ou recusar.
5. O aceite é atômico: atualiza `profiles.club_id`, desliga `looking_for_club`, insere `club_members` e cancela outros convites pendentes do jogador.
6. Dono ou capitão pode cancelar convites ainda pendentes. Jogador ou capitão pode sair do clube; dono precisa transferir a gestão antes.

## Adaptação Pro Clubs America

- Visual azul-marinho e amarelo do produto, sem copiar a identidade da referência.
- Convite direcionado complementa o link geral de indicação, que continua atendendo jogadores ainda sem conta.
- Ações mutáveis exigem Firebase válido e mesma origem.
- E-mail usa Resend, consentimento transacional e `dedupe_key`; nenhuma repetição do mesmo convite.
- Banco com RLS fechada para cliente; acesso somente pelo bridge autenticado das Pages Functions.

## Evidência de conclusão

- Migração remota aplicada no projeto Supabase `proclubsamerica`.
- `npm run check` sem erros.
- Cloudflare Pages em produção no mesmo SHA de `origin/main`.
- QA autenticado: criar, visualizar, aceitar, recusar, cancelar e sair, sem deixar dados temporários.
