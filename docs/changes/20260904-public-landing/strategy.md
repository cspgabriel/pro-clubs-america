# Landing pública — Pro Clubs America

Status: estrutura aprovada pelo usuário em 04/09/2026; implementação em andamento.
Base: e75e88b4d2cee498e5ed5161a1268b49604cd38a. Quadros: projeto issue 1; central issue 93.
Atualização de escopo nos quadros tentou conectar em 04/09; timeout GitHub. Registro inicial já existe em ambos.

## Briefing e diagnóstico

Modernizar a antiga landing, não o dashboard autenticado. `/` deve apresentar o produto sem login; `/inicio` continua sendo o portal. Recuperar identidade e headline da versão a9c5e17, sem restaurar promessas antigas de ranking, dados ao vivo, preços ou aprovação em 24 horas. Público: jogadores e capitães de Clubs na América Latina. Objetivo: descobrir a comunidade e criar conta. Tom: direto, esportivo, acolhedor. Direção: simples, sexy, surpreendente.

Referências fornecidas pelo usuário: https://proclubstracker.com/ (hero compacto, busca proeminente, cards de destaque e FAQ); https://www.mercadoproclubs.com/ (jornada jogador/capitão, mercado e comunidade). Inspiração em hierarquia, não cópia de marca, imagens ou alegações. Reutilizar somente assets próprios de `public/brand`.

## ICP e proposta de valor

- Empresa: comunidade independente que reúne perfis, clubes, mercado e amistosos.
- Persona: jogador encontra onde se apresentar; capitão encontra perfis para conhecer e caminhos para divulgar vagas.
- Produto: perfil com posição, apresentação do Pro e destaques; descoberta de cadastros reais e organização de amistosos no mesmo portal.
- Aquisição: explorar a comunidade antes de criar a conta; busca com origem dos dados explícita.

Dores: grupos dispersos, dificuldade de encontrar jogadores e pouca visibilidade do perfil. Critérios: navegação rápida no celular, clubes/perfis abrindo corretamente, dados públicos identificados. Objeções: precisa pagar? Precisa entrar? É oficial EA? Não inventar métricas, depoimentos, disponibilidade de vagas nem promessa de resultado esportivo.

## Framework e wireframe aprovado

AIDA: público já conhece Clubs e procura time/jogador; atenção na identidade, interesse por busca/mercado, desejo pelos perfis e ação no cadastro. PAS descartado: dramatização desnecessária; PASTOR descartado: jornada longa para produto conhecido; 4P descartado: sem promoção nem urgência real.

| Seção | Framework | Elemento | Conteúdo | Notas para designer |
| --- | --- | --- | --- | --- |
| Cabeçalho | Atenção | Logo e navegação | Pro Clubs America; Mercado; Comunidade; Entrar | Compacto, 44px mínimos nos alvos; sem sidebar do portal |
| Hero | Atenção | H1 e apoio | Seu clube merece uma história maior. Encontre seu time, conheça jogadores e combine o próximo amistoso. | Headline antiga modernizada; estádio sutil; centro no mobile |
| Busca | Interesse | Campo, botão e resultados | Buscar clube ou jogador; Explorar comunidade | Informar que busca nos cadastros recentes exibidos, não na EA; Enter e clique; estados reais |
| Mercado | Interesse | Card destacado e duas escolhas | O próximo reforço pode ser você. Encontrar um clube / Encontrar jogadores | Card dourado contido; links para mercado e jogadores da comunidade; sem formulário de amistoso |
| Comunidade | Desejo | Clubes e jogadores reais | Conheça quem já está por aqui. Clubes da comunidade / Jogadores para conhecer | Duas colunas desktop, pilha mobile; `/time?id=…` e `/perfil?id=…`; sem totais globais inferidos |
| Amistosos | Desejo | Card de recurso | Seu próximo rival está a um convite. Ver desafios abertos | Acesso ao recurso existente; nada de placares ou partidas fictícios |
| Perfil | Desejo | Card de apresentação | Mostre o seu jogo. Fotos do seu Pro, posições e melhores momentos. | Descrever capacidade existente, sem jogador/OVR fictício como prova |
| Cadastro | Ação | Três passos e CTA | Crie sua conta. Escolha sua comunidade. Entre no jogo. Criar minha conta | Onboarding existente; não pedir telefone diretamente na LP |
| FAQ e rodapé | Ação | Perguntas, app e termos | Preciso entrar para explorar? Onde estão os dados da EA? Como mostrar meu Pro? | FAQ nativo acessível; instalar, privacidade e termos; independência da EA |

## Design system

Tokens locais, sem redesenhar globalmente o portal: fundo #061329, superfícies #0b2040 e #102a4d, borda #29486b, destaque #ffcf48, texto #f5f8ff, secundário #b3c4dc. Outfit em títulos; Inter no texto; fontes locais existentes. Espaçamento 4/8/12/16/24/32/48/64; raio 12/20/24; container 1120px. Cards com borda sutil, dourado restrito a CTAs/ênfase. Mobile 16px laterais, hero sem altura fixa, CTA 48px. Motion opcional curta e desligada em reduced-motion. Foco visível, labels reais e contraste mínimo 4.5:1.

## Dados e arquitetura

Usar o endpoint público existente `/api/community/profiles`, que seleciona apenas campos públicos e retorna até 100 perfis recentes; clubes derivam dessa amostra. Não apresentar contagens como totais completos. Não expor e-mail/telefone. Busca local normalizada por nome/nick/clube; informar o alcance. Loading, erro com retry e vazio distintos. Links de clube comunitário usam `/time`, não `/club`. Não alterar Firebase, Supabase, onboarding ou `/inicio`. Não publicar o protótipo EA em `output`.

## Quality gate e evidência exigida

- Motivação: headline + busca logo no topo; caminhos claros para jogador/capitão.
- Valor: mercado, comunidade e amistosos nas primeiras seções; só funcionalidades existentes.
- Incentivo: explorar antes do cadastro, sem contagem falsa ou urgência artificial.
- Fricção: sem login para LP; formulário único de busca; layout mobile compacto.
- Incerteza: fonte e limite da busca claros; FAQ e termos; conta necessária apenas para ações do portal.
- Verificar lint/build/functions; screenshots 375/768/1024/1440; overflow, teclado, resultados e links; erro/vazio; `/inicio` preservado.
- Preview público antes de produção; conferir conteúdo e interação além de HTTP 200. Registrar SHA/deploy/URL e diário ao terminar.

## Aprovação

Usuário aprovou via pergunta: “busca → mercado → clubes e jogadores cadastrados → amistosos → cadastro, com visual azul e dourado inspirado nas duas referências”. Resposta: “Aprovar e implementar”.
