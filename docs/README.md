# Documentação do Clubs Brasil

Este diretório é a referência técnica e operacional do projeto.

| Documento | Conteúdo |
| --- | --- |
| [EA-DATA-SOURCES.md](EA-DATA-SOURCES.md) | URLs, parâmetros, campos e origem dos escudos |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Componentes, rotas e fluxo de dados |
| [DATA-MODEL.md](DATA-MODEL.md) | Contratos, modos de partida e métricas derivadas |
| [CRAWLER-OPERATIONS.md](CRAWLER-OPERATIONS.md) | Estratégia sem API, atualização, deduplicação e observabilidade |
| [PRODUCT-STATUS.md](PRODUCT-STATUS.md) | Módulos disponíveis, limitações e próximos passos |

## Princípios

1. Exibir somente dados publicados na fonte pública.
2. Manter a URL de origem e a data de coleta em cada snapshot.
3. Separar dados observados de métricas calculadas.
4. Nunca permitir placar manual em amistosos verificados.
5. Tratar a EA como fonte externa instável: falha de coleta não apaga o último
   snapshot válido.
6. Respeitar termos aplicáveis, `robots.txt`, limites de acesso e direitos sobre
   marcas e ativos.

O sistema visual persistido pela skill de UI/UX está em
`design-system/clubs-brasil/MASTER.md`.
