# Fontes públicas da EA

## Fonte institucional

A página oficial do modo Clubs informa que o site permite consultar conquistas,
estatísticas, composição dos clubes, jogadores e histórico recente de partidas:

- [EA SPORTS FC 26 Clubs](https://www.ea.com/pt-br/games/ea-sports-fc/clubs)

## Templates canônicos por clube

Parâmetros usados:

- `clubId`: identificador público e numérico do clube;
- `platform`: agrupamento de plataforma. A base atual usa `common-gen5`;
- idioma: o caminho `/pt-br/` é preferido para a comunidade brasileira.

| Área | Template oficial | Conteúdo observado |
| --- | --- | --- |
| Visão geral | `https://www.ea.com/pt-br/games/ea-sports-fc/clubs/overview?clubId={clubId}&platform=common-gen5` | nome, escudo, skill rating, reputação, campanha, gols e temporada |
| Integrantes | `https://www.ea.com/pt-br/games/ea-sports-fc/clubs/member-list?clubId={clubId}&platform=common-gen5` | nome do jogador, posição, OVR, jogos, gols, assistências, passes, desarmes e aproveitamento |
| Histórico | `https://www.ea.com/pt-br/games/ea-sports-fc/clubs/match-history?clubId={clubId}&platform=common-gen5` | adversários, placar, tipo de partida e desempenho individual publicado |
| Rankings | `https://www.ea.com/pt-br/games/ea-sports-fc/clubs/rankings` | classificação pública por plataforma, skill rating e campanha dos clubes |

O cadastro da comunidade aceita somente URLs públicas de `overview`,
`member-list` ou `match-history` que contenham `clubId` numérico e `platform`.
Quem ainda não tem o link pode procurar o time na página pública de Rankings.

## Villathinaikos — URLs cadastradas

- [Visão geral](https://www.ea.com/pt-br/games/ea-sports-fc/clubs/overview?clubId=171630&platform=common-gen5)
- [Lista de integrantes](https://www.ea.com/pt-br/games/ea-sports-fc/clubs/member-list?clubId=171630&platform=common-gen5)
- [Histórico de partidas](https://www.ea.com/pt-br/games/ea-sports-fc/clubs/match-history?clubId=171630&platform=common-gen5)

## Modos no histórico

`League Match`, `Friendly Match` e `Playoff Match` são filtros/abas da página de
histórico. Até existir um parâmetro público e estável comprovado, todos usam a
mesma URL `match-history`. O coletor precisa:

1. abrir a página com `clubId` e `platform`;
2. aguardar a renderização do conteúdo;
3. selecionar cada aba disponível;
4. salvar o modo normalizado como `leagueMatch`, `friendlyMatch` ou
   `playoffMatch`;
5. não misturar os três históricos.

## Escudos e imagens

Os escudos exibidos no site oficial podem apontar para o CDN público:

```text
https://eafc24.content.easports.com/fifa/fltOnlineAssets/...
```

O projeto guarda a URL original em `crestUrl`; não baixa, redesenha nem declara
propriedade sobre o escudo. Caso a EA altere ou remova o ativo, a interface deve
usar o ícone neutro local.

## Campos por origem

### Overview

- `club.id`, `club.name`, `club.platform`, `club.crestUrl`;
- `skillRating`, `reputation`;
- `wins`, `draws`, `losses`, `totalMatches`;
- `leagueAppearances`, `playoffAppearances`;
- `goalsFor`, `goalsAgainst`;
- total de membros por categoria de posição.

### Member list

- identificador estável derivado do nome público enquanto a fonte não fornecer
  outro ID;
- nome público, posição geral e OVR;
- jogos, gols, assistências;
- passes e percentual de sucesso;
- desarmes e percentual de sucesso;
- clean sheets e percentual de vitórias.

### Match history

- modo, data/hora observada e competição;
- clubes da casa e visitante;
- placar;
- URL da fonte;
- jogadores publicados na partida;
- gols, assistências, nota, chutes, passes, desarmes, cartões e outras métricas
  quando presentes.

## Regras de proveniência

- Todo snapshot tem `source.state`, `source.fetchedAt` e `source.note`.
- Toda partida mantém `sourceUrl`.
- Campo ausente é `null`/omitido; não é convertido em zero sem evidência.
- Datas relativas como “há 3 dias” devem guardar a interpretação feita na
  coleta e o horário de coleta.
- Alterações de layout ou nomenclatura da EA exigem revisão do parser.

## Extração global versionada

O snapshot de 09/08/2026, incorporado no commit `3f974173`, contém:

- 100 clubes `common-gen5`, 100 `common-gen4` e 99 `nx`;
- elencos de 15 clubes de destaque em `common-gen5` (166 nomes não vazios);
- ranking, skill rating, campanha, gols, clean sheets e divisão;
- jogos, gols, assistências, nota média e MoTM nos elencos disponíveis.

Os arquivos ficam em `data/pro_clubs_*.json`. Métricas não presentes, como
tackles de atletas fora da base detalhada do Villathinaikos, permanecem
indisponíveis. O script `scripts/download_by_club_id.py` veio no snapshot e usa
endpoints HTTP; ele é mantido como artefato histórico, mas não deve ser usado no
crawler de produção sem revisão, pois o produto definiu coleta por página.
