# Onboarding e estatisticas sincronizadas

## Entrega

- Cadastro com duas etapas: idioma/pais e escolha de clube existente no catalogo Supabase, com alternativa sem time.
- Busca por nome/ID e plataforma; rascunho por usuario; persistencia confirmada pelo servidor.
- Escolha de clube nao concede administracao, plano pago ou verificacao de jogador EA.
- Paginas de clube/jogador leem estatisticas da base sincronizada, sem totais congelados no build.
- Coletor preserva passes, desarmes, ID da partida, OVR e campos brutos adicionais disponiveis; historico parcial e explicitamente identificado.
- Migracoes 20260903010000 e 20260903010100 aplicadas no projeto mdqtlkvkpacjouwgtibr.

## Evidencias locais

- npm run check: aprovado; seis avisos preexistentes de next/no-img-element, sem erros.
- QA real em Chrome isolado: cadastro, idioma, busca, resultado vazio, retomada, sem time, perfil persistido e nome correto.
- Cadastro com clube tambem validado; autorizacao negativa: origem externa 403, idioma invalido 400, clube desconhecido 404, tentativa de elevar papel/plano ignorada, publicacao de amistoso negada 403.
- Responsividade: onboarding 320/390/1440 px; clube 390/1440 px; sem overflow horizontal da pagina.
- Clube 171630: 1310 jogos, 12 jogadores, 105 partidas armazenadas no recorte observado; perfil de jogador abriu pelo link.
- Capturas e scripts reproduziveis locais: output/qa/ e output/qa-onboarding.py. Contas temporarias novas removidas apos o teste.

## Publicacao e limites

O SHA e os links do deploy/QA publico serao registrados nos quadros: issue 1 deste repositorio e issue 93 do quadro central. A pagina distingue totais de carreira da amostra de partidas; nao promete recuperar todo o historico ausente na EA. Preferencia de idioma persistida e onboarding traduzido; nao implica traducao completa do portal.
